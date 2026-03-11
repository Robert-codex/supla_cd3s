#ifndef GENERATED_PROFILE_H_
#define GENERATED_PROFILE_H_

#include <stdint.h>

namespace GeneratedProfile {

bool IsAvailable();
const char *GetDeviceName();
int GetStatusLedPin();
bool GetStatusLedInverted();
int GetI2cSdaPin();
int GetI2cSclPin();
uint32_t GetI2cFrequencyHz();
bool Register();

}  // namespace GeneratedProfile

#endif  // GENERATED_PROFILE_H_
