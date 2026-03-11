#include "atlo_v1_tuya_valve.h"

#include <Arduino.h>

#include <supla/channel.h>
#include <supla/control/action_trigger.h>
#include <supla/control/button.h>
#include <supla/io.h>
#include <supla/log_wrapper.h>
#include <supla/sensor/binary.h>

namespace ProjectModules {
namespace {

bool TimeReached(uint32_t startedAtMs, uint32_t intervalMs) {
  if (intervalMs == 0) {
    return true;
  }
  return static_cast<uint32_t>(millis() - startedAtMs) >= intervalMs;
}

}  // namespace

AtloV1TuyaValveActuator::AtloV1TuyaValveActuator(int motorOpenPin,
                                                 int motorClosePin,
                                                 bool motorOutputsActiveHigh)
    : motorOpenPin(motorOpenPin),
      motorClosePin(motorClosePin),
      motorOutputsActiveHigh(motorOutputsActiveHigh) {
  for (auto &channelNumber : defaultFloodSensorChannels) {
    channelNumber = 255;
  }
}

AtloV1TuyaValveActuator &AtloV1TuyaValveActuator::setTravelTimeMs(
    uint32_t timeMs) {
  openingTimeMs = timeMs;
  closingTimeMs = timeMs;
  return *this;
}

AtloV1TuyaValveActuator &AtloV1TuyaValveActuator::setOpeningTimeMs(
    uint32_t timeMs) {
  openingTimeMs = timeMs;
  return *this;
}

AtloV1TuyaValveActuator &AtloV1TuyaValveActuator::setClosingTimeMs(
    uint32_t timeMs) {
  closingTimeMs = timeMs;
  return *this;
}

AtloV1TuyaValveActuator &AtloV1TuyaValveActuator::setDirectionChangePauseMs(
    uint16_t timeMs) {
  directionChangePauseMs = timeMs;
  return *this;
}

AtloV1TuyaValveActuator &AtloV1TuyaValveActuator::setStatusLedPin(
    int pin, bool activeHigh) {
  statusLedPin = pin;
  statusLedActiveHigh = activeHigh;
  return *this;
}

AtloV1TuyaValveActuator &AtloV1TuyaValveActuator::setLimitSwitchPins(
    int openPin, int closePin, bool pullUp, bool activeLow) {
  openLimitSwitchPin = openPin;
  closeLimitSwitchPin = closePin;
  limitSwitchPullUp = pullUp;
  limitSwitchActiveLow = activeLow;
  return *this;
}

AtloV1TuyaValveActuator &
AtloV1TuyaValveActuator::setMotorProblemWhenLimitNotReached(bool enabled) {
  motorProblemWhenLimitNotReached = enabled;
  return *this;
}

bool AtloV1TuyaValveActuator::addDefaultFloodSensorChannel(
    uint8_t channelNumber) {
  if (channelNumber == 255) {
    return false;
  }

  for (auto storedChannel : defaultFloodSensorChannels) {
    if (storedChannel == channelNumber) {
      return true;
    }
  }

  for (auto &storedChannel : defaultFloodSensorChannels) {
    if (storedChannel == 255) {
      storedChannel = channelNumber;
      return true;
    }
  }

  return false;
}

void AtloV1TuyaValveActuator::onLoadConfig(SuplaDeviceClass *sdc) {
  ValveBase::onLoadConfig(sdc);
  ensureDefaultFloodSensors();
}

void AtloV1TuyaValveActuator::onLoadState() {
  ValveBase::onLoadState();
  estimatedOpenState = channel.getValveOpenState();
  requestedOpenState = estimatedOpenState;
}

void AtloV1TuyaValveActuator::onInit() {
  initOutputPin(motorOpenPin);
  initOutputPin(motorClosePin);
  initInputPin(openLimitSwitchPin);
  initInputPin(closeLimitSwitchPin);

  if (statusLedPin >= 0) {
    Supla::Io::digitalWrite(
        getChannelNumber(), statusLedPin, statusLedActiveHigh ? LOW : HIGH);
    Supla::Io::pinMode(getChannelNumber(), statusLedPin, OUTPUT);
  }

  ValveBase::onInit();

  if (hasConflictingLimitSwitchState()) {
    channel.setValveMotorProblemFlag(true);
  } else {
    syncEstimatedStateFromLimitSwitches();
    channel.setValveMotorProblemFlag(false);
  }

  requestedOpenState = estimatedOpenState;
  channel.setValveOpenState(estimatedOpenState);
  updateStatusLed();
}

void AtloV1TuyaValveActuator::iterateAlways() {
  handleMovement();
  ValveBase::iterateAlways();
  updateStatusLed();
}

void AtloV1TuyaValveActuator::setValueOnDevice(uint8_t openLevel) {
  const bool shouldOpen = openLevel > 0;
  const MotionState previousState = motionState;

  requestedOpenState = shouldOpen ? 100 : 0;

  if (!hasSingleOutputControl() && !hasDirectOpenCloseOutputs()) {
    channel.setValveMotorProblemFlag(true);
    SUPLA_LOG_WARNING("Valve[%d]: motor pins are not configured",
                      getChannelNumber());
    return;
  }

  if (shouldOpen && isOpenLimitSwitchActive()) {
    stopMovement();
    estimatedOpenState = 100;
    channel.setValveMotorProblemFlag(false);
    updateStatusLed();
    return;
  }

  if (!shouldOpen && isCloseLimitSwitchActive()) {
    stopMovement();
    estimatedOpenState = 0;
    channel.setValveMotorProblemFlag(false);
    updateStatusLed();
    return;
  }

  if ((shouldOpen && previousState == MotionState::Opening) ||
      (!shouldOpen && previousState == MotionState::Closing)) {
    motionStartedMs = millis();
    return;
  }

  if (previousState == MotionState::Opening ||
      previousState == MotionState::Closing) {
    stopMovement();
  }

  const bool changedDirection =
      (shouldOpen && previousState == MotionState::Closing) ||
      (!shouldOpen && previousState == MotionState::Opening);

  if (changedDirection && directionChangePauseMs > 0) {
    motionState = shouldOpen ? MotionState::WaitingToOpen
                             : MotionState::WaitingToClose;
    stateChangedMs = millis();
    return;
  }

  startMovement(shouldOpen);
}

uint8_t AtloV1TuyaValveActuator::getValueOpenStateFromDevice() {
  if (hasConflictingLimitSwitchState()) {
    return estimatedOpenState;
  }

  if (hasAnyLimitSwitch()) {
    syncEstimatedStateFromLimitSwitches();
  }

  return estimatedOpenState;
}

void AtloV1TuyaValveActuator::initOutputPin(int pin) {
  if (pin < 0) {
    return;
  }

  writeOutputPin(pin, false);
  Supla::Io::pinMode(getChannelNumber(), pin, OUTPUT);
  writeOutputPin(pin, false);
}

void AtloV1TuyaValveActuator::initInputPin(int pin) {
  if (pin < 0) {
    return;
  }

  Supla::Io::pinMode(
      getChannelNumber(), pin, limitSwitchPullUp ? INPUT_PULLUP : INPUT);
}

void AtloV1TuyaValveActuator::writeOutputPin(int pin, bool enabled) {
  if (pin < 0) {
    return;
  }

  Supla::Io::digitalWrite(
      getChannelNumber(),
      pin,
      enabled ? (motorOutputsActiveHigh ? HIGH : LOW)
              : (motorOutputsActiveHigh ? LOW : HIGH));
}

bool AtloV1TuyaValveActuator::hasSingleOutputControl() const {
  return motorOpenPin >= 0 && motorClosePin < 0;
}

bool AtloV1TuyaValveActuator::hasDirectOpenCloseOutputs() const {
  return motorOpenPin >= 0 && motorClosePin >= 0;
}

bool AtloV1TuyaValveActuator::isInputActive(int pin) const {
  if (pin < 0) {
    return false;
  }

  const int value = Supla::Io::digitalRead(getChannelNumber(), pin);
  return limitSwitchActiveLow ? value == LOW : value == HIGH;
}

bool AtloV1TuyaValveActuator::isOpenLimitSwitchActive() const {
  return isInputActive(openLimitSwitchPin);
}

bool AtloV1TuyaValveActuator::isCloseLimitSwitchActive() const {
  return isInputActive(closeLimitSwitchPin);
}

bool AtloV1TuyaValveActuator::hasOpenLimitSwitch() const {
  return openLimitSwitchPin >= 0;
}

bool AtloV1TuyaValveActuator::hasCloseLimitSwitch() const {
  return closeLimitSwitchPin >= 0;
}

bool AtloV1TuyaValveActuator::hasAnyLimitSwitch() const {
  return hasOpenLimitSwitch() || hasCloseLimitSwitch();
}

bool AtloV1TuyaValveActuator::hasConflictingLimitSwitchState() const {
  return hasOpenLimitSwitch() && hasCloseLimitSwitch() &&
         isOpenLimitSwitchActive() && isCloseLimitSwitchActive();
}

void AtloV1TuyaValveActuator::syncEstimatedStateFromLimitSwitches() {
  if (hasConflictingLimitSwitchState()) {
    return;
  }

  if (isOpenLimitSwitchActive()) {
    estimatedOpenState = 100;
  } else if (isCloseLimitSwitchActive()) {
    estimatedOpenState = 0;
  }
}

void AtloV1TuyaValveActuator::startMovement(bool open) {
  stopMovement();

  motionState = open ? MotionState::Opening : MotionState::Closing;
  motionStartedMs = millis();
  stateChangedMs = motionStartedMs;

  if (hasSingleOutputControl()) {
    writeOutputPin(motorOpenPin, true);
    SUPLA_LOG_INFO("Valve[%d]: motor powered (%s)",
                   getChannelNumber(),
                   open ? "open" : "close");
  } else if (open) {
    writeOutputPin(motorClosePin, false);
    writeOutputPin(motorOpenPin, true);
    SUPLA_LOG_INFO("Valve[%d]: motor opening", getChannelNumber());
  } else {
    writeOutputPin(motorOpenPin, false);
    writeOutputPin(motorClosePin, true);
    SUPLA_LOG_INFO("Valve[%d]: motor closing", getChannelNumber());
  }
}

void AtloV1TuyaValveActuator::stopMovement() {
  writeOutputPin(motorOpenPin, false);
  if (motorClosePin >= 0) {
    writeOutputPin(motorClosePin, false);
  }
  motionState = MotionState::Idle;
  stateChangedMs = millis();
}

void AtloV1TuyaValveActuator::handleMovement() {
  if (hasConflictingLimitSwitchState()) {
    stopMovement();
    channel.setValveMotorProblemFlag(true);
    return;
  }

  switch (motionState) {
    case MotionState::WaitingToOpen:
      if (TimeReached(stateChangedMs, directionChangePauseMs)) {
        startMovement(true);
      }
      return;
    case MotionState::WaitingToClose:
      if (TimeReached(stateChangedMs, directionChangePauseMs)) {
        startMovement(false);
      }
      return;
    case MotionState::Opening:
      if (isOpenLimitSwitchActive()) {
        stopMovement();
        estimatedOpenState = 100;
        channel.setValveMotorProblemFlag(false);
        return;
      }
      if (TimeReached(motionStartedMs, openingTimeMs)) {
        stopMovement();
        if (hasOpenLimitSwitch() && motorProblemWhenLimitNotReached &&
            !isOpenLimitSwitchActive()) {
          channel.setValveMotorProblemFlag(true);
        } else {
          estimatedOpenState = 100;
          channel.setValveMotorProblemFlag(false);
        }
      }
      return;
    case MotionState::Closing:
      if (isCloseLimitSwitchActive()) {
        stopMovement();
        estimatedOpenState = 0;
        channel.setValveMotorProblemFlag(false);
        return;
      }
      if (TimeReached(motionStartedMs, closingTimeMs)) {
        stopMovement();
        if (hasCloseLimitSwitch() && motorProblemWhenLimitNotReached &&
            !isCloseLimitSwitchActive()) {
          channel.setValveMotorProblemFlag(true);
        } else {
          estimatedOpenState = 0;
          channel.setValveMotorProblemFlag(false);
        }
      }
      return;
    case MotionState::Idle:
      if (hasAnyLimitSwitch()) {
        syncEstimatedStateFromLimitSwitches();
      }
      return;
  }
}

void AtloV1TuyaValveActuator::updateStatusLed() {
  if (statusLedPin < 0) {
    return;
  }

  Supla::Io::digitalWrite(
      getChannelNumber(),
      statusLedPin,
      estimatedOpenState > 0 ? (statusLedActiveHigh ? HIGH : LOW)
                             : (statusLedActiveHigh ? LOW : HIGH));
}

void AtloV1TuyaValveActuator::ensureDefaultFloodSensors() {
  bool configChanged = false;

  for (auto defaultChannel : defaultFloodSensorChannels) {
    if (defaultChannel == 255) {
      continue;
    }

    auto *sensorChannel = Supla::Channel::GetByChannelNumber(defaultChannel);
    if (sensorChannel == nullptr) {
      SUPLA_LOG_WARNING(
          "Valve[%d]: flood sensor channel %d not found",
          getChannelNumber(),
          defaultChannel);
      continue;
    }

    if (sensorChannel->getChannelType() != SUPLA_CHANNELTYPE_BINARYSENSOR) {
      SUPLA_LOG_WARNING(
          "Valve[%d]: flood sensor channel %d is not binary",
          getChannelNumber(),
          defaultChannel);
      continue;
    }

    bool alreadyConfigured = false;
    for (auto configuredChannel : config.sensorData) {
      if (configuredChannel == defaultChannel) {
        alreadyConfigured = true;
        break;
      }
    }

    if (alreadyConfigured) {
      continue;
    }

    for (auto &configuredChannel : config.sensorData) {
      if (configuredChannel == 255) {
        configuredChannel = defaultChannel;
        configChanged = true;
        break;
      }
    }
  }

  if (configChanged) {
    saveConfig();
  }
}

AtloV1TuyaValveConfig MakeAtloV1TuyaWb3sStarterProfile() {
  AtloV1TuyaValveConfig config = {};
  config.motorOpenPin = 14;
  config.motorClosePin = -1;
  config.openLimitSwitchPin = 26;
  config.closeLimitSwitchPin = 24;
  config.openingTimeMs = 7000;
  config.closingTimeMs = 7000;
  config.directionChangePauseMs = 250;
  config.motorOutputsActiveHigh = true;

  // Optional pins stay disabled until confirmed on the real PCB.
  config.statusLedPin = -1;
  config.toggleButtonPin = -1;
  config.floodSensorPin = -1;
  return config;
}

AtloV1TuyaValveModule CreateAtloV1TuyaValveModule(
    const AtloV1TuyaValveConfig &config) {
  AtloV1TuyaValveModule module;

  module.valve = new AtloV1TuyaValveActuator(
      config.motorOpenPin,
      config.motorClosePin,
      config.motorOutputsActiveHigh);
  module.valve->setOpeningTimeMs(config.openingTimeMs)
      .setClosingTimeMs(config.closingTimeMs)
      .setDirectionChangePauseMs(config.directionChangePauseMs)
      .setMotorProblemWhenLimitNotReached(
          config.motorProblemWhenLimitNotReached);
  module.valve->setDefaultCloseValveOnFloodType(config.closeValveOnFloodType);

  if (config.statusLedPin >= 0) {
    module.valve->setStatusLedPin(
        config.statusLedPin, config.statusLedActiveHigh);
  }

  if (config.openLimitSwitchPin >= 0 || config.closeLimitSwitchPin >= 0) {
    module.valve->setLimitSwitchPins(config.openLimitSwitchPin,
                                     config.closeLimitSwitchPin,
                                     config.limitSwitchPullUp,
                                     config.limitSwitchActiveLow);

    if (config.createLimitSwitchChannels) {
      if (config.openLimitSwitchPin >= 0) {
        module.openLimitSwitch = new Supla::Sensor::Binary(
            config.openLimitSwitchPin,
            config.limitSwitchPullUp,
            config.limitSwitchActiveLow);
        module.openLimitSwitch->setFilteringTimeMs(50);
      }

      if (config.closeLimitSwitchPin >= 0) {
        module.closeLimitSwitch = new Supla::Sensor::Binary(
            config.closeLimitSwitchPin,
            config.limitSwitchPullUp,
            config.limitSwitchActiveLow);
        module.closeLimitSwitch->setFilteringTimeMs(50);
      }
    }
  }

  if (config.floodSensorPin >= 0) {
    module.floodSensor = new Supla::Sensor::Binary(config.floodSensorPin,
                                                   config.floodSensorPullUp,
                                                   config.floodSensorActiveLow);
    module.floodSensor->setDefaultFunction(SUPLA_CHANNELFNC_FLOOD_SENSOR);
    module.floodSensor->setFilteringTimeMs(config.floodSensorFilteringMs);
    module.valve->addDefaultFloodSensorChannel(
        module.floodSensor->getChannelNumber());
  }

  if (config.toggleButtonPin >= 0) {
    module.toggleButton = new Supla::Control::Button(config.toggleButtonPin,
                                                     config.buttonPullUp,
                                                     config.buttonActiveLow);
    module.toggleButton->setHoldTime(config.buttonHoldTimeMs);
    module.toggleButton->setMulticlickTime(config.buttonMulticlickTimeMs);
    module.toggleButton->addAction(
        Supla::TOGGLE, module.valve, Supla::ON_CLICK_1);

    if (config.createActionTrigger) {
      module.actionTrigger = new Supla::Control::ActionTrigger();
      module.actionTrigger->setRelatedChannel(*module.valve);
      module.actionTrigger->attach(*module.toggleButton);
    }
  }

  return module;
}

}  // namespace ProjectModules
