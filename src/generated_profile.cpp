#include "generated_profile.h"

#if __has_include("generated_profile_data.h")
#include "generated_profile_data.h"
#endif

namespace {

#if !__has_include("generated_profile_data.h")
namespace FallbackGeneratedProfileData {
constexpr bool kAvailable = false;
constexpr const char *kDeviceName = nullptr;
constexpr int kStatusLedPin = -1;
constexpr bool kStatusLedInverted = false;
constexpr int kI2cSdaPin = -1;
constexpr int kI2cSclPin = -1;
constexpr uint32_t kI2cFrequencyHz = 100000;

bool Register() {
  return false;
}
}  // namespace FallbackGeneratedProfileData
#endif

}  // namespace

namespace GeneratedProfile {

bool IsAvailable() {
#if __has_include("generated_profile_data.h")
  return GeneratedProfileData::kAvailable;
#else
  return FallbackGeneratedProfileData::kAvailable;
#endif
}

const char *GetDeviceName() {
#if __has_include("generated_profile_data.h")
  return GeneratedProfileData::kDeviceName;
#else
  return FallbackGeneratedProfileData::kDeviceName;
#endif
}

int GetStatusLedPin() {
#if __has_include("generated_profile_data.h")
  return GeneratedProfileData::kStatusLedPin;
#else
  return FallbackGeneratedProfileData::kStatusLedPin;
#endif
}

bool GetStatusLedInverted() {
#if __has_include("generated_profile_data.h")
  return GeneratedProfileData::kStatusLedInverted;
#else
  return FallbackGeneratedProfileData::kStatusLedInverted;
#endif
}

int GetI2cSdaPin() {
#if __has_include("generated_profile_data.h")
  return GeneratedProfileData::kI2cSdaPin;
#else
  return FallbackGeneratedProfileData::kI2cSdaPin;
#endif
}

int GetI2cSclPin() {
#if __has_include("generated_profile_data.h")
  return GeneratedProfileData::kI2cSclPin;
#else
  return FallbackGeneratedProfileData::kI2cSclPin;
#endif
}

uint32_t GetI2cFrequencyHz() {
#if __has_include("generated_profile_data.h")
  return GeneratedProfileData::kI2cFrequencyHz;
#else
  return FallbackGeneratedProfileData::kI2cFrequencyHz;
#endif
}

bool Register() {
#if __has_include("generated_profile_data.h")
  if (!GeneratedProfileData::kAvailable) {
    return false;
  }
  return GeneratedProfileData::Register();
#else
  return FallbackGeneratedProfileData::Register();
#endif
}

}  // namespace GeneratedProfile
