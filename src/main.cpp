#include <Arduino.h>

#include <SuplaDevice.h>
#include <supla/device/status_led.h>
#include <supla/network/esp_wifi.h>

#if __has_include("supla_secrets.h")
#include "supla_secrets.h"
#else
#include "supla_secrets.h.example"
#warning "Using example SUPLA credentials. Copy include/supla_secrets.h.example to include/supla_secrets.h and fill real values."
#endif

#include "board_config.h"
#include "runtime_config.h"
#include "user_components.h"

namespace {

Supla::ESPWifi wifi(
    SuplaSecrets::kWifiSsid, SuplaSecrets::kWifiPassword);
Supla::Device::StatusLed *statusLed = nullptr;

}  // namespace

void setup() {
  Serial.begin(115200);
  delay(200);

  Serial.println("Supla Tuya runtime");
#ifdef SUPLA_USE_GENERATED_PROFILE
  if (RuntimeConfig::UseGeneratedProfile()) {
    Serial.println("Generated profile mode is active.");
  } else {
    Serial.println(
        "Generated profile mode requested, but profiles/active_profile.json "
        "is missing or invalid. Falling back to manual registry.");
  }
#else
  Serial.println(
      "Manual mode: edit include/atlo_v1_tuya_wb3s_config.h to change ATLO pins.");
#endif

  if (RuntimeConfig::GetStatusLedPin() >= 0) {
    statusLed = new Supla::Device::StatusLed(
        RuntimeConfig::GetStatusLedPin(),
        RuntimeConfig::GetStatusLedInverted());
  }

  UserComponents::Register();

  SuplaDevice.setName(RuntimeConfig::GetDeviceName());
  SuplaDevice.setServerPort(2016);
  SuplaDevice.begin(
      SuplaSecrets::kGuid,
      SuplaSecrets::kSuplaServer,
      SuplaSecrets::kSuplaEmail,
      SuplaSecrets::kAuthKey);
}

void loop() {
  static uint32_t lastSlowTick = millis();
  static uint32_t lastFastTickUs = micros();

  const uint32_t nowMs = millis();
  while (static_cast<uint32_t>(nowMs - lastSlowTick) >= 10) {
    lastSlowTick += 10;
    SuplaDevice.onTimer();
  }

  const uint32_t nowUs = micros();
  while (static_cast<uint32_t>(nowUs - lastFastTickUs) >= 1000) {
    lastFastTickUs += 1000;
    SuplaDevice.onFastTimer();
  }

  SuplaDevice.iterate();
}
