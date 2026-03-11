#include <Arduino.h>

#include <SuplaDevice.h>
#include <supla/actions.h>
#include <supla/control/action_trigger.h>
#include <supla/control/button.h>
#include <supla/control/internal_pin_output.h>
#include <supla/control/light_relay.h>
#include <supla/control/pin_status_led.h>
#include <supla/control/roller_shutter.h>
#include <supla/sensor/DS18B20.h>
#include <supla/sensor/DHT.h>
#include <supla/sensor/binary.h>
#include <supla/sensor/impulse_counter.h>

#if __has_include(<Wire.h>)
#include <Wire.h>
#define SUPLA_MANUAL_HAS_WIRE 1
#else
#define SUPLA_MANUAL_HAS_WIRE 0
#endif

#if SUPLA_MANUAL_HAS_WIRE && __has_include(<Adafruit_BME280.h>)
#include <supla/sensor/BME280.h>
#define SUPLA_MANUAL_HAS_BME280 1
#else
#define SUPLA_MANUAL_HAS_BME280 0
#endif

#if SUPLA_MANUAL_HAS_WIRE && __has_include(<Adafruit_BMP280.h>)
#include <supla/sensor/BMP280.h>
#define SUPLA_MANUAL_HAS_BMP280 1
#else
#define SUPLA_MANUAL_HAS_BMP280 0
#endif

#if SUPLA_MANUAL_HAS_WIRE && __has_include(<Adafruit_Si7021.h>)
#include <supla/sensor/Si7021.h>
#define SUPLA_MANUAL_HAS_SI7021 1
#else
#define SUPLA_MANUAL_HAS_SI7021 0
#endif

#include "atlo_v1_tuya_valve.h"
#include "atlo_v1_tuya_wb3s_config.h"
#include "board_config.h"
#include "generated_profile.h"
#include "runtime_config.h"
#include "user_components.h"

namespace UserComponents {
namespace {

void EnableI2cBus() {
#if SUPLA_MANUAL_HAS_WIRE
  static bool started = false;
  if (started) {
    return;
  }

  Wire.begin(RuntimeConfig::GetI2cSdaPin(), RuntimeConfig::GetI2cSclPin());
  Wire.setClock(RuntimeConfig::GetI2cFrequencyHz());
  started = true;

  Serial.print("I2C ready on P");
  Serial.print(RuntimeConfig::GetI2cSdaPin());
  Serial.print(" / P");
  Serial.println(RuntimeConfig::GetI2cSclPin());
#else
  Serial.println("Wire.h is not available in this build.");
#endif
}

ProjectModules::AtloV1TuyaValveConfig BuildActiveAtloValveConfig() {
  auto config = ProjectModules::MakeAtloV1TuyaWb3sStarterProfile();

  config.motorOpenPin = AtloV1TuyaWb3sConfig::kMotorOpenPin;
  config.motorClosePin = AtloV1TuyaWb3sConfig::kMotorClosePin;
  config.motorOutputsActiveHigh =
      AtloV1TuyaWb3sConfig::kMotorOutputsActiveHigh;

  config.openLimitSwitchPin = AtloV1TuyaWb3sConfig::kOpenLimitSwitchPin;
  config.closeLimitSwitchPin = AtloV1TuyaWb3sConfig::kCloseLimitSwitchPin;
  config.limitSwitchPullUp = AtloV1TuyaWb3sConfig::kLimitSwitchPullUp;
  config.limitSwitchActiveLow = AtloV1TuyaWb3sConfig::kLimitSwitchActiveLow;
  config.createLimitSwitchChannels =
      AtloV1TuyaWb3sConfig::kCreateLimitSwitchChannels;
  config.motorProblemWhenLimitNotReached =
      AtloV1TuyaWb3sConfig::kMotorProblemWhenLimitNotReached;

  config.openingTimeMs = AtloV1TuyaWb3sConfig::kOpeningTimeMs;
  config.closingTimeMs = AtloV1TuyaWb3sConfig::kClosingTimeMs;
  config.directionChangePauseMs =
      AtloV1TuyaWb3sConfig::kDirectionChangePauseMs;

  config.statusLedPin = AtloV1TuyaWb3sConfig::kValveStatusLedPin;
  config.statusLedActiveHigh = AtloV1TuyaWb3sConfig::kValveStatusLedActiveHigh;

  config.toggleButtonPin = AtloV1TuyaWb3sConfig::kToggleButtonPin;
  config.buttonPullUp = AtloV1TuyaWb3sConfig::kToggleButtonPullUp;
  config.buttonActiveLow = AtloV1TuyaWb3sConfig::kToggleButtonActiveLow;
  config.buttonHoldTimeMs = AtloV1TuyaWb3sConfig::kToggleButtonHoldTimeMs;
  config.buttonMulticlickTimeMs =
      AtloV1TuyaWb3sConfig::kToggleButtonMulticlickTimeMs;
  config.createActionTrigger = AtloV1TuyaWb3sConfig::kCreateActionTrigger;

  config.floodSensorPin = AtloV1TuyaWb3sConfig::kFloodSensorPin;
  config.floodSensorPullUp = AtloV1TuyaWb3sConfig::kFloodSensorPullUp;
  config.floodSensorActiveLow = AtloV1TuyaWb3sConfig::kFloodSensorActiveLow;
  config.floodSensorFilteringMs =
      AtloV1TuyaWb3sConfig::kFloodSensorFilteringMs;

  return config;
}

void AttachAtloConfigButton(ProjectModules::AtloV1TuyaValveModule &module) {
  if (AtloV1TuyaWb3sConfig::kConfigButtonPin < 0) {
    return;
  }

  if (module.toggleButton != nullptr &&
      AtloV1TuyaWb3sConfig::kConfigButtonPin ==
          AtloV1TuyaWb3sConfig::kToggleButtonPin) {
    module.toggleButton->setHoldTime(
        AtloV1TuyaWb3sConfig::kConfigButtonHoldTimeMs);
    module.toggleButton->setMulticlickTime(
        AtloV1TuyaWb3sConfig::kConfigButtonMulticlickTimeMs);
    module.toggleButton->configureAsConfigButton(&SuplaDevice);
    return;
  }

  auto *configButton = new Supla::Control::Button(
      AtloV1TuyaWb3sConfig::kConfigButtonPin,
      AtloV1TuyaWb3sConfig::kConfigButtonPullUp,
      AtloV1TuyaWb3sConfig::kConfigButtonActiveLow);
  configButton->setHoldTime(AtloV1TuyaWb3sConfig::kConfigButtonHoldTimeMs);
  configButton->setMulticlickTime(
      AtloV1TuyaWb3sConfig::kConfigButtonMulticlickTimeMs);
  configButton->configureAsConfigButton(&SuplaDevice);
}

}  // namespace

void Register() {
#ifdef SUPLA_USE_GENERATED_PROFILE
  if (GeneratedProfile::Register()) {
    Serial.println("Manual component registry bypassed by generated profile.");
    return;
  }
#endif

  Serial.println("Manual component registry: src/user_components.cpp");
  Serial.println("Active layout: ATLO-V1-TUYA / WB3S");

  auto atloValve = BuildActiveAtloValveConfig();
  auto atloModule =
      ProjectModules::CreateAtloV1TuyaValveModule(atloValve);
  AttachAtloConfigButton(atloModule);

  Serial.print("ATLO motor pin: P");
  Serial.println(atloValve.motorOpenPin);
  Serial.print("ATLO open limit: P");
  Serial.println(atloValve.openLimitSwitchPin);
  Serial.print("ATLO close limit: P");
  Serial.println(atloValve.closeLimitSwitchPin);

  // Example: simple relay + LED + config button starter.
  // auto *relay1 = new Supla::Control::LightRelay(24, true);
  // relay1->setDefaultStateOff();
  // new Supla::Control::PinStatusLed(24, 26, true);
  // auto *buttonCfgRelay = new Supla::Control::Button(7, true, true);
  // buttonCfgRelay->setHoldTime(5000);
  // buttonCfgRelay->setMulticlickTime(300);
  // buttonCfgRelay->configureAsConfigButton(&SuplaDevice);
  // buttonCfgRelay->addAction(Supla::TOGGLE, relay1, Supla::ON_CLICK_1);
  // auto *atRelay1 = new Supla::Control::ActionTrigger();
  // atRelay1->setRelatedChannel(*relay1);
  // atRelay1->attach(buttonCfgRelay);

  // Example: second relay controlled by its own local button.
  // auto *relay2 = new Supla::Control::LightRelay(10, true);
  // relay2->setDefaultStateOff();
  // auto *buttonRelay2 = new Supla::Control::Button(11, true, true);
  // buttonRelay2->addAction(Supla::TOGGLE, relay2, Supla::ON_CLICK_1);

  // Example: roller shutter with two local buttons and two limit switches.
  // auto *shutter1 = new Supla::Control::RollerShutter(10, 11, true);
  // shutter1->setOpenCloseTime(17500, 18000);
  // auto *shutterUp = new Supla::Control::Button(14, true, true);
  // auto *shutterDown = new Supla::Control::Button(15, true, true);
  // shutterUp->addAction(Supla::OPEN_OR_STOP, shutter1, Supla::ON_PRESS);
  // shutterDown->addAction(Supla::CLOSE_OR_STOP, shutter1, Supla::ON_PRESS);
  // auto *limitOpen = new Supla::Sensor::Binary(20, true, true);
  // limitOpen->setDefaultFunction(SUPLA_CHANNELFNC_OPENINGSENSOR_ROLLERSHUTTER);
  // limitOpen->setFilteringTimeMs(50);
  // limitOpen->addAction(Supla::STOP, shutter1, Supla::ON_TURN_ON);
  // auto *limitClose = new Supla::Sensor::Binary(21, true, true);
  // limitClose->setDefaultFunction(SUPLA_CHANNELFNC_OPENINGSENSOR_ROLLERSHUTTER);
  // limitClose->setFilteringTimeMs(50);
  // limitClose->addAction(Supla::STOP, shutter1, Supla::ON_TURN_ON);
  // auto *atShutterUp = new Supla::Control::ActionTrigger();
  // atShutterUp->setRelatedChannel(*shutter1);
  // atShutterUp->attach(shutterUp);

  // Example: plain binary input / reed contact / door contact.
  // auto *doorContact = new Supla::Sensor::Binary(22, true, true);
  // doorContact->setDefaultFunction(SUPLA_CHANNELFNC_OPENINGSENSOR_DOOR);
  // doorContact->setFilteringTimeMs(50);

  // Example: DS18B20 on one-wire bus.
  // auto *boilerTemp = new Supla::Sensor::DS18B20(14);
  // boilerTemp->setRefreshIntervalMs(10000);

  // Example: DHT11 / DHT22.
  // auto *utilityDht = new Supla::Sensor::DHT(6, DHT11);
  // utilityDht->setRefreshIntervalMs(10000);
  // auto *atticDht = new Supla::Sensor::DHT(9, DHT22);
  // atticDht->setRefreshIntervalMs(10000);

  // Example: impulse counter for water / gas / heat pulses.
  // auto *waterCounter = new Supla::Sensor::ImpulseCounter(16, false, true, 50);
  // auto *pulseLed = new Supla::Control::InternalPinOutput(17);
  // pulseLed->setDurationMs(100);
  // waterCounter->addAction(Supla::TURN_ON, pulseLed, Supla::ON_CHANGE);

  // Example: direct local links.
  // auto *buttonOpenOnly = new Supla::Control::Button(18, true, true);
  // buttonOpenOnly->addAction(Supla::OPEN, atloModule.valve, Supla::ON_PRESS);
  // auto *buttonCloseOnly = new Supla::Control::Button(19, true, true);
  // buttonCloseOnly->addAction(Supla::CLOSE, atloModule.valve, Supla::ON_PRESS);

  // Example: ATLO-V1-TUYA valve actuator module on WB3S.
  // Single-output mode: P14 powers the actuator, P26/P24 are limit switches.
  // Keep P10/P11 for flashing UART and avoid P0 if you use diagnostic logs.
  // Ignore ESP-style templates with GPIO12/GPIO13/GPIO16 here. They do not
  // match the WB3S pin set and are most likely for a different Tuya module.
  // Edit include/atlo_v1_tuya_wb3s_config.h to change the active pins.

#if SUPLA_MANUAL_HAS_BME280
  // Example: BME280 over I2C.
  // EnableI2cBus();
  // auto *bme280 = new Supla::Sensor::BME280(0x76, 120.0f);
  // bme280->setRefreshIntervalMs(10000);
#endif

#if SUPLA_MANUAL_HAS_BMP280
  // Example: BMP280 over I2C.
  // EnableI2cBus();
  // auto *bmp280 = new Supla::Sensor::BMP280(0x77, 120.0f);
  // bmp280->setRefreshIntervalMs(10000);
#endif

#if SUPLA_MANUAL_HAS_SI7021
  // Example: Si7021 over I2C.
  // EnableI2cBus();
  // auto *si7021 = new Supla::Sensor::Si7021();
  // si7021->setRefreshIntervalMs(10000);
#endif

#if !SUPLA_MANUAL_HAS_WIRE
  Serial.println(
      "I2C examples are disabled until the build provides Wire.h support.");
#endif
}

}  // namespace UserComponents
