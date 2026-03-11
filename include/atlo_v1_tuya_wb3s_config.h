#ifndef ATLO_V1_TUYA_WB3S_CONFIG_H_
#define ATLO_V1_TUYA_WB3S_CONFIG_H_

#include <stdint.h>

namespace AtloV1TuyaWb3sConfig {

// Main device identity.
constexpr const char *kDeviceName = "ATLO-V1-TUYA";

// Device status LED used by Supla connection state.
// Set to -1 to disable until the pin is confirmed on your PCB.
constexpr int kDeviceStatusLedPin = -1;
constexpr bool kDeviceStatusLedInverted = true;

// Local config button. Set to -1 to disable.
// If equal to kToggleButtonPin, one button handles toggle on click and
// enters config mode on long hold.
constexpr int kConfigButtonPin = 7;
constexpr bool kConfigButtonPullUp = true;
constexpr bool kConfigButtonActiveLow = true;
constexpr uint16_t kConfigButtonHoldTimeMs = 5000;
constexpr uint16_t kConfigButtonMulticlickTimeMs = 300;

// ATLO-V1-TUYA / WB3S starter profile based on the current confirmed mapping.
constexpr int kMotorOpenPin = 14;
constexpr int kMotorClosePin = -1;
constexpr bool kMotorOutputsActiveHigh = true;

constexpr int kOpenLimitSwitchPin = 26;
constexpr int kCloseLimitSwitchPin = 24;
constexpr bool kLimitSwitchPullUp = true;
constexpr bool kLimitSwitchActiveLow = true;
constexpr bool kCreateLimitSwitchChannels = true;
constexpr bool kMotorProblemWhenLimitNotReached = true;

constexpr uint32_t kOpeningTimeMs = 7000;
constexpr uint32_t kClosingTimeMs = 7000;
constexpr uint16_t kDirectionChangePauseMs = 250;

// Local valve status LED. Set to -1 to disable.
constexpr int kValveStatusLedPin = -1;
constexpr bool kValveStatusLedActiveHigh = true;

// Local toggle button for the valve. Set to -1 to disable.
constexpr int kToggleButtonPin = 7;
constexpr bool kToggleButtonPullUp = true;
constexpr bool kToggleButtonActiveLow = true;
constexpr uint16_t kToggleButtonHoldTimeMs = 1500;
constexpr uint16_t kToggleButtonMulticlickTimeMs = 300;
constexpr bool kCreateActionTrigger = true;

// External flood sensor. Set to -1 to disable.
constexpr int kFloodSensorPin = -1;
constexpr bool kFloodSensorPullUp = true;
constexpr bool kFloodSensorActiveLow = true;
constexpr uint16_t kFloodSensorFilteringMs = 200;

// Optional I2C bus for additional sensors.
constexpr int kI2cSdaPin = 6;
constexpr int kI2cSclPin = 9;
constexpr uint32_t kI2cFrequencyHz = 100000;

}  // namespace AtloV1TuyaWb3sConfig

#endif  // ATLO_V1_TUYA_WB3S_CONFIG_H_
