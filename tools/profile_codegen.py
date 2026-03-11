#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

I2C_SENSOR_TYPES = {"bme280", "bmp280", "si7021"}
BINARY_ROLE_TO_FUNCTION = {
    "limit-open": "SUPLA_CHANNELFNC_OPENINGSENSOR_ROLLERSHUTTER",
    "limit-close": "SUPLA_CHANNELFNC_OPENINGSENSOR_ROLLERSHUTTER",
    "door-contact": "SUPLA_CHANNELFNC_OPENINGSENSOR_DOOR",
}


def c_bool(value: object) -> str:
    return "true" if bool(value) else "false"


def c_string(value: object) -> str:
    return json.dumps("" if value is None else str(value))


def pin_to_number(pin: object) -> int:
    if not pin:
        return -1
    match = re.fullmatch(r"P(\d+)", str(pin).strip(), re.IGNORECASE)
    return int(match.group(1)) if match else -1


def sanitize_var(prefix: str, index: int, value: object) -> str:
    raw = re.sub(r"[^a-zA-Z0-9]+", "_", str(value or "item")).strip("_")
    if not raw:
        raw = "item"
    return f"{prefix}_{index}_{raw}"


def parse_ds_address(value: object) -> list[str] | None:
    if not value:
        return None
    tokens = [token for token in re.split(r"[^0-9a-fA-F]+", str(value)) if token]
    if len(tokens) != 8:
        return None
    return [f"0x{token.upper():0>2}"[-4:].replace("0X", "0x") for token in tokens]


def nested_get(data: dict, *keys: str, default=None):
    current = data
    for key in keys:
        if not isinstance(current, dict) or key not in current:
            return default
        current = current[key]
    return current


def build_required_libraries(profile: dict) -> list[str]:
    build = profile.get("build", {})
    if isinstance(build, dict):
        libs = build.get("requiredLibraries")
        if isinstance(libs, list):
            return [str(item) for item in libs]
    return []


def collect_includes(profile: dict) -> tuple[list[str], list[str]]:
    plain = {
        "#include <Arduino.h>",
        "#include <SuplaDevice.h>",
        "#include <supla/actions.h>",
    }
    conditional: list[str] = []

    relays = nested_get(profile, "components", "relays", default=[]) or []
    shutters = nested_get(profile, "components", "shutters", default=[]) or []
    buttons = nested_get(profile, "components", "buttons", default=[]) or []
    binaries = nested_get(profile, "components", "binaryInputs", default=[]) or []
    sensors = nested_get(profile, "components", "sensors", default=[]) or []
    action_triggers = nested_get(profile, "components", "actionTriggers", default=[]) or []

    if relays:
        plain.add("#include <supla/control/light_relay.h>")
    if any(relay.get("led") for relay in relays):
        plain.add("#include <supla/control/internal_pin_output.h>")
    if shutters:
        plain.add("#include <supla/control/roller_shutter.h>")
    if buttons:
        plain.add("#include <supla/control/button.h>")
    if binaries:
        plain.add("#include <supla/sensor/binary.h>")
    if action_triggers:
        plain.add("#include <supla/control/action_trigger.h>")

    sensor_types = {str(sensor.get("type", "")).lower() for sensor in sensors}
    if "ds18b20" in sensor_types:
        plain.add("#include <supla/sensor/DS18B20.h>")
    if sensor_types.intersection({"dht11", "dht22"}):
        plain.add("#include <supla/sensor/DHT.h>")
    if sensor_types.intersection(I2C_SENSOR_TYPES):
        conditional.extend(
            [
                "#if __has_include(<Wire.h>)",
                "#include <Wire.h>",
                "#define GENERATED_PROFILE_HAS_WIRE 1",
                "#else",
                '#error "Generated profile requires Wire.h support for I2C sensors."',
                "#endif",
            ]
        )
    if "bme280" in sensor_types:
        plain.add("#include <supla/sensor/BME280.h>")
    if "bmp280" in sensor_types:
        plain.add("#include <supla/sensor/BMP280.h>")
    if "si7021" in sensor_types:
        plain.add("#include <supla/sensor/Si7021.h>")

    return sorted(plain), conditional


def render_profile_header(profile: dict, source_name: str) -> str:
    metadata = profile.get("metadata", {})
    buses = profile.get("buses", {})
    components = profile.get("components", {})
    links = profile.get("links", {})
    relays = components.get("relays", []) or []
    shutters = components.get("shutters", []) or []
    buttons = components.get("buttons", []) or []
    binaries = components.get("binaryInputs", []) or []
    sensors = components.get("sensors", []) or []
    action_triggers = components.get("actionTriggers", []) or []
    direct_links = links.get("direct", []) or []
    required_libraries = build_required_libraries(profile)

    device_name = metadata.get("name") or "Generated SUPLA Profile"
    status_led_pin = pin_to_number(nested_get(metadata, "statusLed", "pin"))
    status_led_inverted = bool(nested_get(metadata, "statusLed", "inverted", default=False))
    i2c_sda_pin = pin_to_number(nested_get(buses, "i2c", "sdaPin"))
    i2c_scl_pin = pin_to_number(nested_get(buses, "i2c", "sclPin"))
    i2c_frequency_hz = int(nested_get(buses, "i2c", "frequencyKHz", default=100) or 100) * 1000
    default_one_wire_pin = pin_to_number(nested_get(buses, "oneWire", "defaultPin"))
    has_i2c_sensors = any(str(sensor.get("type", "")).lower() in I2C_SENSOR_TYPES for sensor in sensors)

    plain_includes, conditional_includes = collect_includes(profile)
    lines: list[str] = [
        "#ifndef GENERATED_PROFILE_DATA_H_",
        "#define GENERATED_PROFILE_DATA_H_",
        "",
    ]
    lines.extend(plain_includes)
    if conditional_includes:
        lines.append("")
        lines.extend(conditional_includes)
    lines.extend(["", "namespace GeneratedProfileData {", ""])

    if required_libraries:
        lines.append("// Required libraries declared by the builder profile:")
        for library in required_libraries:
            lines.append(f"// - {library}")
        lines.append("")

    lines.extend(
        [
            "constexpr bool kAvailable = true;",
            f"constexpr const char kDeviceName[] = {c_string(device_name)};",
            f"constexpr int kStatusLedPin = {status_led_pin};",
            f"constexpr bool kStatusLedInverted = {c_bool(status_led_inverted)};",
            f"constexpr int kI2cSdaPin = {i2c_sda_pin};",
            f"constexpr int kI2cSclPin = {i2c_scl_pin};",
            f"constexpr uint32_t kI2cFrequencyHz = {i2c_frequency_hz}u;",
            "",
        ]
    )

    if has_i2c_sensors:
        lines.extend(
            [
                "inline void EnableI2cBus() {",
                "  static bool started = false;",
                "  if (started) {",
                "    return;",
                "  }",
                "  if (kI2cSdaPin < 0 || kI2cSclPin < 0) {",
                '    Serial.println("Generated profile requests I2C, but SDA/SCL are not configured.");',
                "    return;",
                "  }",
                "  Wire.begin(kI2cSdaPin, kI2cSclPin);",
                "  Wire.setClock(kI2cFrequencyHz);",
                "  started = true;",
                '  Serial.println("Generated profile: I2C bus ready.");',
                "}",
                "",
            ]
        )

    lines.extend(
        [
            "inline bool Register() {",
            f"  Serial.println({c_string(f'Using generated builder profile: {source_name}')});",
        ]
    )

    if has_i2c_sensors:
        lines.append("  EnableI2cBus();")

    if any([relays, shutters, buttons, binaries, sensors, action_triggers, direct_links]):
        lines.append("")

    relay_vars: dict[str, str] = {}
    shutter_vars: dict[str, str] = {}
    button_vars: dict[str, str] = {}
    binary_vars: dict[str, str] = {}

    for index, relay in enumerate(relays, start=1):
        pin = pin_to_number(relay.get("pin"))
        relay_id = str(relay.get("id", f"relay-{index}"))
        relay_name = relay.get("name") or relay_id
        if pin < 0:
            lines.append(f"  // Skipped relay {relay_name}: invalid GPIO.")
            continue
        relay_var = sanitize_var("relay", index, relay_id)
        relay_vars[relay_id] = relay_var
        lines.append(
            f"  auto *{relay_var} = new Supla::Control::LightRelay({pin}, {c_bool(relay.get('highIsOn', True))});"
        )
        if str(relay.get("defaultState", "off")).lower() == "on":
            lines.append(f"  {relay_var}->setDefaultStateOn();")
        else:
            lines.append(f"  {relay_var}->setDefaultStateOff();")

        led = relay.get("led")
        if isinstance(led, dict):
            led_pin = pin_to_number(led.get("pin"))
            if led_pin >= 0:
                led_var = f"{relay_var}_led"
                high_is_on = not bool(led.get("inverted", False))
                lines.append(
                    f"  auto *{led_var} = new Supla::Control::InternalPinOutput({led_pin}, {c_bool(high_is_on)});"
                )
                lines.append(
                    f"  {relay_var}->addAction(Supla::TURN_ON, {led_var}, Supla::ON_TURN_ON, true);"
                )
                lines.append(
                    f"  {relay_var}->addAction(Supla::TURN_OFF, {led_var}, Supla::ON_TURN_OFF, true);"
                )
        lines.append("")

    for index, shutter in enumerate(shutters, start=1):
        up_pin = pin_to_number(shutter.get("upPin"))
        down_pin = pin_to_number(shutter.get("downPin"))
        shutter_id = str(shutter.get("id", f"shutter-{index}"))
        shutter_name = shutter.get("name") or shutter_id
        if up_pin < 0 or down_pin < 0:
            lines.append(f"  // Skipped shutter {shutter_name}: invalid UP/DOWN GPIO.")
            continue
        shutter_var = sanitize_var("shutter", index, shutter_id)
        shutter_vars[shutter_id] = shutter_var
        lines.append(
            f"  auto *{shutter_var} = new Supla::Control::RollerShutter({up_pin}, {down_pin}, {c_bool(shutter.get('highIsOn', True))});"
        )
        lines.append(
            f"  {shutter_var}->setOpenCloseTime({int(shutter.get('closingTimeMs', 0) or 0)}, {int(shutter.get('openingTimeMs', 0) or 0)});"
        )
        lines.append("")

    for index, button in enumerate(buttons, start=1):
        pin = pin_to_number(button.get("pin"))
        button_id = str(button.get("id", f"button-{index}"))
        button_name = button.get("name") or button_id
        if pin < 0:
            lines.append(f"  // Skipped button {button_name}: invalid GPIO.")
            continue
        button_var = sanitize_var("button", index, button_id)
        button_vars[button_id] = button_var
        lines.append(
            f"  auto *{button_var} = new Supla::Control::Button({pin}, {c_bool(button.get('pullUp', False))}, {c_bool(button.get('invertLogic', False))});"
        )
        if str(button.get("buttonType", "monostable")).lower() == "bistable":
            lines.append(
                f"  {button_var}->setButtonType(Supla::Control::Button::ButtonType::BISTABLE);"
            )
        lines.append(f"  {button_var}->setHoldTime({int(button.get('holdMs', 0) or 0)});")
        lines.append(
            f"  {button_var}->setMulticlickTime({int(button.get('multiclickMs', 0) or 0)});"
        )
        if button.get("configButton"):
            lines.append(f"  {button_var}->configureAsConfigButton(&SuplaDevice);")
        lines.append("")

    for index, binary_input in enumerate(binaries, start=1):
        pin = pin_to_number(binary_input.get("pin"))
        binary_id = str(binary_input.get("id", f"binary-{index}"))
        binary_name = binary_input.get("name") or binary_id
        if pin < 0:
            lines.append(f"  // Skipped binary input {binary_name}: invalid GPIO.")
            continue
        binary_var = sanitize_var("binary", index, binary_id)
        binary_vars[binary_id] = binary_var
        lines.append(
            f"  auto *{binary_var} = new Supla::Sensor::Binary({pin}, {c_bool(binary_input.get('pullUp', False))}, {c_bool(binary_input.get('invertLogic', False))});"
        )
        role = str(binary_input.get("role", "generic")).lower()
        channel_function = BINARY_ROLE_TO_FUNCTION.get(role)
        if channel_function:
            lines.append(f"  {binary_var}->setDefaultFunction({channel_function});")
        filtering_time_ms = int(binary_input.get("filteringTimeMs", 0) or 0)
        if filtering_time_ms > 0:
            lines.append(f"  {binary_var}->setFilteringTimeMs({filtering_time_ms});")
        lines.append("")

    for index, sensor in enumerate(sensors, start=1):
        sensor_type = str(sensor.get("type", "")).lower()
        sensor_id = str(sensor.get("id", f"sensor-{index}"))
        sensor_name = sensor.get("name") or sensor_id
        sensor_var = sanitize_var("sensor", index, sensor_id)
        refresh_ms = int(sensor.get("refreshMs", 0) or 0)

        if sensor_type == "ds18b20":
            pin = pin_to_number(sensor.get("pin")) if sensor.get("pin") else default_one_wire_pin
            if pin < 0:
                lines.append(f"  // Skipped DS18B20 {sensor_name}: invalid GPIO.")
                continue
            address = parse_ds_address(sensor.get("address"))
            if address:
                address_var = f"{sensor_var}_address"
                lines.append(f"  DeviceAddress {address_var} = {{{', '.join(address)}}};")
                lines.append(
                    f"  auto *{sensor_var} = new Supla::Sensor::DS18B20({pin}, {address_var});"
                )
            else:
                lines.append(
                    f"  auto *{sensor_var} = new Supla::Sensor::DS18B20({pin});"
                )
            if refresh_ms > 0:
                lines.append(f"  {sensor_var}->setRefreshIntervalMs({refresh_ms});")
            lines.append("")
            continue

        if sensor_type in {"dht11", "dht22"}:
            pin = pin_to_number(sensor.get("pin"))
            if pin < 0:
                lines.append(f"  // Skipped {sensor_type.upper()} {sensor_name}: invalid GPIO.")
                continue
            dht_type = "DHT11" if sensor_type == "dht11" else "DHT22"
            lines.append(
                f"  auto *{sensor_var} = new Supla::Sensor::DHT({pin}, {dht_type});"
            )
            if refresh_ms > 0:
                lines.append(f"  {sensor_var}->setRefreshIntervalMs({refresh_ms});")
            lines.append("")
            continue

        if sensor_type == "bme280":
            lines.append(
                f"  auto *{sensor_var} = new Supla::Sensor::BME280({sensor.get('address', '0x76')}, {float(sensor.get('altitudeMeters', 0) or 0):.1f}f);"
            )
            if refresh_ms > 0:
                lines.append(f"  {sensor_var}->setRefreshIntervalMs({refresh_ms});")
            lines.append("")
            continue

        if sensor_type == "bmp280":
            lines.append(
                f"  auto *{sensor_var} = new Supla::Sensor::BMP280({sensor.get('address', '0x77')}, {float(sensor.get('altitudeMeters', 0) or 0):.1f}f);"
            )
            if refresh_ms > 0:
                lines.append(f"  {sensor_var}->setRefreshIntervalMs({refresh_ms});")
            lines.append("")
            continue

        if sensor_type == "si7021":
            lines.append(f"  auto *{sensor_var} = new Supla::Sensor::Si7021();")
            if refresh_ms > 0:
                lines.append(f"  {sensor_var}->setRefreshIntervalMs({refresh_ms});")
            lines.append("")
            continue

        lines.append(f"  // Skipped unsupported sensor type for {sensor_name}.")
        lines.append("")

    for shutter in shutters:
        shutter_id = str(shutter.get("id", ""))
        shutter_var = shutter_vars.get(shutter_id)
        if not shutter_var:
            continue
        up_button_id = shutter.get("upButtonId")
        if up_button_id in button_vars:
            lines.append(
                f"  {button_vars[up_button_id]}->addAction(Supla::OPEN_OR_STOP, {shutter_var}, Supla::ON_PRESS);"
            )
        down_button_id = shutter.get("downButtonId")
        if down_button_id in button_vars:
            lines.append(
                f"  {button_vars[down_button_id]}->addAction(Supla::CLOSE_OR_STOP, {shutter_var}, Supla::ON_PRESS);"
            )
        open_limit_id = shutter.get("openLimitId")
        if open_limit_id in binary_vars:
            lines.append(
                f"  {binary_vars[open_limit_id]}->addAction(Supla::STOP, {shutter_var}, Supla::ON_TURN_ON);"
            )
        close_limit_id = shutter.get("closeLimitId")
        if close_limit_id in binary_vars:
            lines.append(
                f"  {binary_vars[close_limit_id]}->addAction(Supla::STOP, {shutter_var}, Supla::ON_TURN_ON);"
            )
        if any([up_button_id in button_vars, down_button_id in button_vars, open_limit_id in binary_vars, close_limit_id in binary_vars]):
            lines.append("")

    for link in direct_links:
        source_map = button_vars if link.get("sourceType") == "button" else binary_vars
        target_map = relay_vars if link.get("targetType") == "relay" else shutter_vars
        source_var = source_map.get(link.get("sourceId"))
        target_var = target_map.get(link.get("targetId"))
        if source_var and target_var:
            lines.append(
                f"  {source_var}->addAction(Supla::{link.get('action', 'TOGGLE')}, {target_var}, Supla::{link.get('event', 'ON_CLICK_1')});"
            )
        else:
            link_name = link.get("name") or link.get("id") or "direct-link"
            lines.append(f"  // Skipped direct link {link_name}: unresolved source or target.")
        lines.append("")

    for index, action_trigger in enumerate(action_triggers, start=1):
        button_var = button_vars.get(action_trigger.get("buttonId"))
        target_map = relay_vars if action_trigger.get("relatedType") == "relay" else shutter_vars
        target_var = target_map.get(action_trigger.get("relatedId"))
        if button_var and target_var:
            action_trigger_var = sanitize_var(
                "action_trigger", index, action_trigger.get("id", f"at-{index}")
            )
            lines.append(
                f"  auto *{action_trigger_var} = new Supla::Control::ActionTrigger();"
            )
            lines.append(f"  {action_trigger_var}->setRelatedChannel(*{target_var});")
            lines.append(f"  {action_trigger_var}->attach({button_var});")
            if action_trigger.get("alwaysUseOnClick1"):
                lines.append(f"  {action_trigger_var}->setAlwaysUseOnClick1();")
        else:
            action_trigger_name = action_trigger.get("name") or action_trigger.get("id") or "action-trigger"
            lines.append(
                f"  // Skipped action trigger {action_trigger_name}: unresolved button or target."
            )
        lines.append("")

    lines.extend(["  return true;", "}", "", "}  // namespace GeneratedProfileData", "", "#endif  // GENERATED_PROFILE_DATA_H_"])
    return "\n".join(lines) + "\n"


def load_profile(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        profile = json.load(handle)
    if not isinstance(profile, dict):
        raise ValueError("Top-level profile value must be a JSON object.")
    return profile


def generate_to_path(input_path: Path, output_path: Path) -> None:
    profile = load_profile(input_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        render_profile_header(profile, input_path.name),
        encoding="utf-8",
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Generate firmware registration header from builder JSON profile."
    )
    parser.add_argument("--input", required=True, type=Path, help="Path to builder JSON profile.")
    parser.add_argument(
        "--output",
        required=True,
        type=Path,
        help="Path to generated header file.",
    )
    args = parser.parse_args(argv)

    try:
        generate_to_path(args.input, args.output)
    except Exception as exc:  # pragma: no cover - CLI error path
        print(f"profile_codegen.py: {exc}", file=sys.stderr)
        return 1

    print(f"Generated {args.output} from {args.input}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
