#ifndef DEVICE_PROFILE_H_
#define DEVICE_PROFILE_H_

#include <stdint.h>

#include <supla/actions.h>

namespace DeviceProfile {

constexpr const char *kDeviceName = SUPLA_DEVICE_NAME;
constexpr int kStatusLedPin = 8;
constexpr bool kStatusLedInverted = true;

constexpr int kI2cSdaPin = 6;
constexpr int kI2cSclPin = 9;
constexpr uint32_t kI2cFrequencyHz = 100000;

enum class ButtonKind : uint8_t {
  kMonostable,
  kBistable,
};

enum class BinaryRole : uint8_t {
  kGeneric,
  kLimitOpen,
  kLimitClose,
  kDoorContact,
};

enum class SensorType : uint8_t {
  kDs18b20,
  kDht11,
  kDht22,
  kBme280,
  kBmp280,
  kSi7021,
};

enum class LinkSourceType : uint8_t {
  kButton,
  kBinaryInput,
};

enum class LinkTargetType : uint8_t {
  kRelay,
  kShutter,
};

struct RelayConfig {
  const char *name;
  bool enabled;
  int pin;
  bool highIsOn;
  bool defaultOn;
  int ledPin;
  bool ledInverted;
};

struct ButtonConfig {
  const char *name;
  bool enabled;
  int pin;
  ButtonKind kind;
  bool pullUp;
  bool invertLogic;
  bool configButton;
  uint16_t holdMs;
  uint16_t multiclickMs;
};

struct BinaryInputConfig {
  const char *name;
  bool enabled;
  int pin;
  BinaryRole role;
  bool pullUp;
  bool invertLogic;
  uint16_t filteringTimeMs;
};

struct ShutterConfig {
  const char *name;
  bool enabled;
  int upPin;
  int downPin;
  bool highIsOn;
  uint32_t closingTimeMs;
  uint32_t openingTimeMs;
  int8_t upButtonIndex;
  int8_t downButtonIndex;
  int8_t openLimitIndex;
  int8_t closeLimitIndex;
};

struct SensorConfig {
  const char *name;
  bool enabled;
  SensorType type;
  int pin;
  uint8_t *deviceAddress;
  int8_t i2cAddress;
  float altitudeMeters;
  uint32_t refreshMs;
};

struct ActionTriggerConfig {
  const char *name;
  bool enabled;
  int8_t buttonIndex;
  LinkTargetType relatedType;
  int8_t relatedIndex;
  bool alwaysUseOnClick1;
};

struct DirectLinkConfig {
  const char *name;
  bool enabled;
  LinkSourceType sourceType;
  int8_t sourceIndex;
  uint16_t event;
  LinkTargetType targetType;
  int8_t targetIndex;
  uint16_t action;
};

constexpr RelayConfig kRelays[] = {
    {
        "Relay 1",
        true,
        24,
        true,
        false,
        26,
        true,
    },
};

constexpr ButtonConfig kButtons[] = {
    {
        "Button relay / cfg",
        true,
        7,
        ButtonKind::kMonostable,
        true,
        true,
        true,
        5000,
        300,
    },
    {
        "Shutter up",
        false,
        14,
        ButtonKind::kMonostable,
        true,
        true,
        false,
        1000,
        300,
    },
    {
        "Shutter down",
        false,
        26,
        ButtonKind::kMonostable,
        true,
        true,
        false,
        1000,
        300,
    },
};

constexpr BinaryInputConfig kBinaryInputs[] = {
    {
        "Limit open",
        false,
        20,
        BinaryRole::kLimitOpen,
        true,
        true,
        50,
    },
    {
        "Limit close",
        false,
        21,
        BinaryRole::kLimitClose,
        true,
        true,
        50,
    },
    {
        "Door contact",
        false,
        22,
        BinaryRole::kDoorContact,
        true,
        true,
        50,
    },
};

constexpr ShutterConfig kShutters[] = {
    {
        "Roller shutter 1",
        false,
        10,
        11,
        true,
        17500,
        18000,
        1,
        2,
        0,
        1,
    },
};

constexpr SensorConfig kSensors[] = {
    {
        "DS18B20 boiler",
        false,
        SensorType::kDs18b20,
        14,
        nullptr,
        0,
        0.0f,
        10000,
    },
    {
        "DHT11 utility",
        false,
        SensorType::kDht11,
        6,
        nullptr,
        0,
        0.0f,
        10000,
    },
    {
        "DHT22 attic",
        false,
        SensorType::kDht22,
        9,
        nullptr,
        0,
        0.0f,
        10000,
    },
    {
        "BME280 living room",
        false,
        SensorType::kBme280,
        -1,
        nullptr,
        0x76,
        120.0f,
        10000,
    },
    {
        "BMP280 barometer",
        false,
        SensorType::kBmp280,
        -1,
        nullptr,
        0x77,
        120.0f,
        10000,
    },
    {
        "Si7021 humidity",
        false,
        SensorType::kSi7021,
        -1,
        nullptr,
        0,
        0.0f,
        10000,
    },
};

constexpr ActionTriggerConfig kActionTriggers[] = {
    {
        "AT Relay 1",
        true,
        0,
        LinkTargetType::kRelay,
        0,
        false,
    },
    {
        "AT Shutter up",
        false,
        1,
        LinkTargetType::kShutter,
        0,
        false,
    },
    {
        "AT Shutter down",
        false,
        2,
        LinkTargetType::kShutter,
        0,
        false,
    },
};

constexpr DirectLinkConfig kDirectLinks[] = {
    {
        "Button relay toggle",
        true,
        LinkSourceType::kButton,
        0,
        Supla::ON_CLICK_1,
        LinkTargetType::kRelay,
        0,
        Supla::TOGGLE,
    },
    {
        "Shutter open",
        false,
        LinkSourceType::kButton,
        1,
        Supla::ON_PRESS,
        LinkTargetType::kShutter,
        0,
        Supla::OPEN_OR_STOP,
    },
    {
        "Shutter close",
        false,
        LinkSourceType::kButton,
        2,
        Supla::ON_PRESS,
        LinkTargetType::kShutter,
        0,
        Supla::CLOSE_OR_STOP,
    },
    {
        "Limit open stop",
        false,
        LinkSourceType::kBinaryInput,
        0,
        Supla::ON_TURN_ON,
        LinkTargetType::kShutter,
        0,
        Supla::STOP,
    },
    {
        "Limit close stop",
        false,
        LinkSourceType::kBinaryInput,
        1,
        Supla::ON_TURN_ON,
        LinkTargetType::kShutter,
        0,
        Supla::STOP,
    },
};

}  // namespace DeviceProfile

#endif  // DEVICE_PROFILE_H_
