#ifndef ATLO_V1_TUYA_VALVE_H_
#define ATLO_V1_TUYA_VALVE_H_

#include <stdint.h>

#include <supla-common/proto.h>
#include <supla/control/valve_base.h>

class SuplaDeviceClass;

namespace Supla {
namespace Control {
class ActionTrigger;
class Button;
}  // namespace Control
namespace Sensor {
class Binary;
}  // namespace Sensor
}  // namespace Supla

namespace ProjectModules {

struct AtloV1TuyaValveConfig {
  int motorOpenPin = -1;
  int motorClosePin = -1;
  bool motorOutputsActiveHigh = true;

  uint32_t openingTimeMs = 7000;
  uint32_t closingTimeMs = 7000;
  uint16_t directionChangePauseMs = 250;

  int statusLedPin = -1;
  bool statusLedActiveHigh = true;

  int toggleButtonPin = -1;
  bool buttonPullUp = true;
  bool buttonActiveLow = true;
  bool createActionTrigger = true;
  uint16_t buttonHoldTimeMs = 1500;
  uint16_t buttonMulticlickTimeMs = 300;

  int openLimitSwitchPin = -1;
  int closeLimitSwitchPin = -1;
  bool limitSwitchPullUp = true;
  bool limitSwitchActiveLow = true;
  bool createLimitSwitchChannels = true;
  bool motorProblemWhenLimitNotReached = true;

  int floodSensorPin = -1;
  bool floodSensorPullUp = true;
  bool floodSensorActiveLow = true;
  uint16_t floodSensorFilteringMs = 200;
  uint8_t closeValveOnFloodType = SUPLA_VALVE_CLOSE_ON_FLOOD_TYPE_ALWAYS;
};

class AtloV1TuyaValveActuator : public Supla::Control::ValveBase {
 public:
  AtloV1TuyaValveActuator(int motorOpenPin,
                          int motorClosePin,
                          bool motorOutputsActiveHigh = true);

  AtloV1TuyaValveActuator &setTravelTimeMs(uint32_t timeMs);
  AtloV1TuyaValveActuator &setOpeningTimeMs(uint32_t timeMs);
  AtloV1TuyaValveActuator &setClosingTimeMs(uint32_t timeMs);
  AtloV1TuyaValveActuator &setDirectionChangePauseMs(uint16_t timeMs);
  AtloV1TuyaValveActuator &setStatusLedPin(int pin, bool activeHigh = true);
  AtloV1TuyaValveActuator &setLimitSwitchPins(int openPin,
                                              int closePin,
                                              bool pullUp = true,
                                              bool activeLow = true);
  AtloV1TuyaValveActuator &setMotorProblemWhenLimitNotReached(
      bool enabled = true);

  bool addDefaultFloodSensorChannel(uint8_t channelNumber);

  void onLoadConfig(SuplaDeviceClass *sdc) override;
  void onLoadState() override;
  void onInit() override;
  void iterateAlways() override;

  void setValueOnDevice(uint8_t openLevel) override;
  uint8_t getValueOpenStateFromDevice() override;

 private:
  enum class MotionState : uint8_t {
    Idle,
    WaitingToOpen,
    WaitingToClose,
    Opening,
    Closing,
  };

  void initOutputPin(int pin);
  void initInputPin(int pin);
  void writeOutputPin(int pin, bool enabled);
  bool hasSingleOutputControl() const;
  bool hasDirectOpenCloseOutputs() const;
  bool isInputActive(int pin) const;
  bool isOpenLimitSwitchActive() const;
  bool isCloseLimitSwitchActive() const;
  bool hasOpenLimitSwitch() const;
  bool hasCloseLimitSwitch() const;
  bool hasAnyLimitSwitch() const;
  bool hasConflictingLimitSwitchState() const;
  void syncEstimatedStateFromLimitSwitches();
  void startMovement(bool open);
  void stopMovement();
  void handleMovement();
  void updateStatusLed();
  void ensureDefaultFloodSensors();

  int16_t motorOpenPin = -1;
  int16_t motorClosePin = -1;
  bool motorOutputsActiveHigh = true;

  uint32_t openingTimeMs = 7000;
  uint32_t closingTimeMs = 7000;
  uint16_t directionChangePauseMs = 250;

  int16_t statusLedPin = -1;
  bool statusLedActiveHigh = true;

  int16_t openLimitSwitchPin = -1;
  int16_t closeLimitSwitchPin = -1;
  bool limitSwitchPullUp = true;
  bool limitSwitchActiveLow = true;
  bool motorProblemWhenLimitNotReached = true;

  MotionState motionState = MotionState::Idle;
  uint8_t estimatedOpenState = 0;
  uint8_t requestedOpenState = 0;
  uint32_t motionStartedMs = 0;
  uint32_t stateChangedMs = 0;
  uint8_t defaultFloodSensorChannels[SUPLA_VALVE_SENSOR_MAX];
};

struct AtloV1TuyaValveModule {
  AtloV1TuyaValveActuator *valve = nullptr;
  Supla::Control::Button *toggleButton = nullptr;
  Supla::Control::ActionTrigger *actionTrigger = nullptr;
  Supla::Sensor::Binary *openLimitSwitch = nullptr;
  Supla::Sensor::Binary *closeLimitSwitch = nullptr;
  Supla::Sensor::Binary *floodSensor = nullptr;
};

AtloV1TuyaValveConfig MakeAtloV1TuyaWb3sStarterProfile();

AtloV1TuyaValveModule CreateAtloV1TuyaValveModule(
    const AtloV1TuyaValveConfig &config);

}  // namespace ProjectModules

#endif  // ATLO_V1_TUYA_VALVE_H_
