#ifndef BOARD_CONFIG_H_
#define BOARD_CONFIG_H_

#include <stdint.h>

#include "atlo_v1_tuya_wb3s_config.h"

namespace BoardConfig {

constexpr const char *kDeviceName = AtloV1TuyaWb3sConfig::kDeviceName;

constexpr int kStatusLedPin = AtloV1TuyaWb3sConfig::kDeviceStatusLedPin;
constexpr bool kStatusLedInverted =
    AtloV1TuyaWb3sConfig::kDeviceStatusLedInverted;

constexpr int kI2cSdaPin = AtloV1TuyaWb3sConfig::kI2cSdaPin;
constexpr int kI2cSclPin = AtloV1TuyaWb3sConfig::kI2cSclPin;
constexpr uint32_t kI2cFrequencyHz = AtloV1TuyaWb3sConfig::kI2cFrequencyHz;

}  // namespace BoardConfig

#endif  // BOARD_CONFIG_H_
