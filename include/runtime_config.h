#ifndef RUNTIME_CONFIG_H_
#define RUNTIME_CONFIG_H_

#include <stdint.h>

#include "board_config.h"
#include "generated_profile.h"

namespace RuntimeConfig {

inline bool UseGeneratedProfile() {
#ifdef SUPLA_USE_GENERATED_PROFILE
  return GeneratedProfile::IsAvailable();
#else
  return false;
#endif
}

inline const char *GetDeviceName() {
  if (UseGeneratedProfile()) {
    return GeneratedProfile::GetDeviceName();
  }
  return BoardConfig::kDeviceName;
}

inline int GetStatusLedPin() {
  if (UseGeneratedProfile()) {
    return GeneratedProfile::GetStatusLedPin();
  }
  return BoardConfig::kStatusLedPin;
}

inline bool GetStatusLedInverted() {
  if (UseGeneratedProfile()) {
    return GeneratedProfile::GetStatusLedInverted();
  }
  return BoardConfig::kStatusLedInverted;
}

inline int GetI2cSdaPin() {
  if (UseGeneratedProfile()) {
    return GeneratedProfile::GetI2cSdaPin();
  }
  return BoardConfig::kI2cSdaPin;
}

inline int GetI2cSclPin() {
  if (UseGeneratedProfile()) {
    return GeneratedProfile::GetI2cSclPin();
  }
  return BoardConfig::kI2cSclPin;
}

inline uint32_t GetI2cFrequencyHz() {
  if (UseGeneratedProfile()) {
    return GeneratedProfile::GetI2cFrequencyHz();
  }
  return BoardConfig::kI2cFrequencyHz;
}

}  // namespace RuntimeConfig

#endif  // RUNTIME_CONFIG_H_
