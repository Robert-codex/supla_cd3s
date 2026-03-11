const sharedFlashLayout = [
  { name: "bootloader", start: 0x000000, length: 0x011000 },
  { name: "app", start: 0x011000, length: 0x119000 },
  { name: "ota", start: 0x12a000, length: 0x0a6000 },
  { name: "calibration", start: 0x1d0000, length: 0x001000 },
  { name: "network", start: 0x1d1000, length: 0x001000 },
  { name: "tlv", start: 0x1d2000, length: 0x001000 },
  { name: "kvs", start: 0x1d3000, length: 0x008000 },
  { name: "userdata", start: 0x1db000, length: 0x025000 }
];

const boardProfiles = {
  wb3s: {
    board: "wb3s",
    boardLabel: "WB3S",
    soc: "BK7231T",
    chipLabel: "BK7231T / WB3S",
    flashLabel: "WB3S / Tuya BK7231T",
    manualEnv: "wb3s",
    generatedEnv: "wb3s_gui_generic",
    flashBytes: 0x200000,
    safePins: ["P6", "P7", "P8", "P9", "P10", "P11", "P14", "P24", "P26"],
    warningPins: ["P0", "P20", "P21", "P22", "P23"],
    defaultStatusLedPin: "P8",
    defaultOneWirePin: "P14",
    defaultI2cSdaPin: "P6",
    defaultI2cSclPin: "P9",
    flashLayout: sharedFlashLayout
  },
  cb3s: {
    board: "cb3s",
    boardLabel: "CB3S",
    soc: "BK7231N",
    chipLabel: "BK7231N / CB3S",
    flashLabel: "CB3S / Tuya BK7231N",
    manualEnv: "cb3s",
    generatedEnv: "cb3s_gui_generic",
    flashBytes: 0x200000,
    safePins: ["P6", "P7", "P8", "P9", "P10", "P11", "P14", "P24", "P26"],
    warningPins: ["P0", "P20", "P21", "P22", "P23"],
    defaultStatusLedPin: "P8",
    defaultOneWirePin: "P14",
    defaultI2cSdaPin: "P6",
    defaultI2cSclPin: "P9",
    flashLayout: sharedFlashLayout
  }
};

const defaultBoardKey = "wb3s";

const form = document.getElementById("builderForm");
const configOutput = document.getElementById("configOutput");
const firmwareOutput = document.getElementById("firmwareOutput");
const warnings = document.getElementById("warnings");
const flashMap = document.getElementById("flashMap");
const flashMapTitle = document.getElementById("flashMapTitle");
const builderSummary = document.getElementById("builderSummary");
const buildCommandOutput = document.getElementById("buildCommandOutput");
const exportButton = document.getElementById("exportButton");
const exportCodeButton = document.getElementById("exportCodeButton");
const importButton = document.getElementById("importButton");
const resetButton = document.getElementById("resetButton");
const importProfileInput = document.getElementById("importProfileInput");
const targetChip = document.getElementById("targetChip");
const targetEnvHint = document.getElementById("targetEnvHint");

const collections = {
  relay: "relays",
  shutter: "shutters",
  button: "buttons",
  binary: "binaryInputs",
  sensor: "sensors",
  actionTrigger: "actionTriggers",
  directLink: "directLinks"
};

const counters = {
  relay: 2,
  shutter: 1,
  button: 2,
  binary: 1,
  sensor: 1,
  actionTrigger: 2,
  directLink: 2
};

const buttonTypeOptions = [
  { value: "monostable", label: "Monostable" },
  { value: "bistable", label: "Bistable" }
];

const binaryRoleOptions = [
  { value: "generic", label: "Generic binary" },
  { value: "limit-open", label: "Limit switch open" },
  { value: "limit-close", label: "Limit switch close" },
  { value: "door-contact", label: "Door / reed contact" }
];

const sensorTypeOptions = [
  { value: "ds18b20", label: "DS18B20" },
  { value: "dht11", label: "DHT11" },
  { value: "dht22", label: "DHT22" },
  { value: "bme280", label: "BME280 (I2C)" },
  { value: "bmp280", label: "BMP280 (I2C)" },
  { value: "si7021", label: "Si7021 (I2C)" }
];

const buttonEventOptions = [
  "ON_PRESS",
  "ON_RELEASE",
  "ON_CLICK_1",
  "ON_CLICK_2",
  "ON_HOLD"
];

const binaryEventOptions = [
  "ON_TURN_ON",
  "ON_TURN_OFF",
  "ON_CHANGE"
];

const relayActions = ["TOGGLE", "TURN_ON", "TURN_OFF"];
const shutterActions = ["OPEN_OR_STOP", "CLOSE_OR_STOP", "STOP"];

function getBoardProfile(boardKey = defaultBoardKey) {
  return boardProfiles[boardKey] || boardProfiles[defaultBoardKey];
}

function createDefaultState(boardKey = defaultBoardKey) {
  const boardProfile = getBoardProfile(boardKey);

  return {
    metadata: {
      name: `Supla ${boardProfile.boardLabel} Multi`,
      profileType: "mixed",
      board: boardProfile.board,
      statusLedPin: boardProfile.defaultStatusLedPin,
      statusLedInverted: true
    },
    network: {
      provisioning: "both",
      otaEnabled: true,
      verboseLogs: true
    },
    buses: {
      i2cEnabled: true,
      i2cSdaPin: boardProfile.defaultI2cSdaPin,
      i2cSclPin: boardProfile.defaultI2cSclPin,
      i2cFrequencyKHz: 100,
      defaultOneWirePin: boardProfile.defaultOneWirePin
    },
    relays: [
      {
        id: "relay-1",
        name: "Relay 1",
        pin: "P24",
        highIsOn: true,
        defaultState: "off",
        ledPin: "P26",
        ledInverted: true
      }
    ],
    shutters: [],
    buttons: [
      {
        id: "button-1",
        name: "Button 1",
        pin: "P7",
        buttonType: "monostable",
        pullUp: true,
        invertLogic: true,
        configButton: true,
        holdMs: 5000,
        multiclickMs: 300
      }
    ],
    binaryInputs: [],
    sensors: [],
    actionTriggers: [
      {
        id: "at-1",
        name: "AT Relay 1",
        buttonId: "button-1",
        relatedType: "relay",
        relatedId: "relay-1",
        alwaysUseOnClick1: false
      }
    ],
    directLinks: [
      {
        id: "link-1",
        name: "Button to relay",
        sourceType: "button",
        sourceId: "button-1",
        event: "ON_CLICK_1",
        targetType: "relay",
        targetId: "relay-1",
        action: "TOGGLE"
      }
    ]
  };
}

let state = createDefaultState(defaultBoardKey);

function bytesToHex(value) {
  return `0x${value.toString(16).toUpperCase().padStart(6, "0")}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function pinToNumber(pin) {
  if (!pin) {
    return -1;
  }
  return Number(pin.replace("P", ""));
}

function makeId(kind) {
  const nextValue = counters[kind];
  counters[kind] += 1;
  return `${kind}-${nextValue}`;
}

function extractNextCounter(items, fallback) {
  const maxId = items.reduce((maxValue, item) => {
    const match = String(item?.id || "").match(/(\d+)$/);
    const numericValue = match ? Number(match[1]) : 0;
    return Math.max(maxValue, numericValue);
  }, 0);
  return Math.max(fallback, maxId + 1);
}

function syncCounters() {
  counters.relay = extractNextCounter(state.relays, 1);
  counters.shutter = extractNextCounter(state.shutters, 1);
  counters.button = extractNextCounter(state.buttons, 1);
  counters.binary = extractNextCounter(state.binaryInputs, 1);
  counters.sensor = extractNextCounter(state.sensors, 1);
  counters.actionTrigger = extractNextCounter(state.actionTriggers, 1);
  counters.directLink = extractNextCounter(state.directLinks, 1);
}

function renderOptions(options, selected, allowEmptyLabel) {
  const items = [];
  if (allowEmptyLabel !== undefined) {
    items.push(`<option value="">${escapeHtml(allowEmptyLabel)}</option>`);
  }
  options.forEach((option) => {
    const value = typeof option === "string" ? option : option.value;
    const label = typeof option === "string" ? option : option.label;
    items.push(
      `<option value="${escapeHtml(value)}"${value === selected ? " selected" : ""}>${escapeHtml(label)}</option>`
    );
  });
  return items.join("");
}

function renderPinOptions(selected, allowNoneLabel = "Wybierz pin") {
  const boardProfile = getBoardProfile(state.metadata.board);
  const options = [
    ...boardProfile.safePins.map((pin) => ({ value: pin, label: `${pin} safe` })),
    ...boardProfile.warningPins.map((pin) => ({ value: pin, label: `${pin} warning` }))
  ];
  return renderOptions(options, selected, allowNoneLabel);
}

function field(label, control, note = "") {
  return `
    <label>
      <span>${escapeHtml(label)}</span>
      ${control}
      ${note ? `<small class="field-note">${escapeHtml(note)}</small>` : ""}
    </label>
  `;
}

function checkboxControl(kind, id, fieldName, checked, label) {
  return `
    <label class="inline-checkbox">
      <input
        type="checkbox"
        data-kind="${escapeHtml(kind)}"
        data-id="${escapeHtml(id)}"
        data-field="${escapeHtml(fieldName)}"
        ${checked ? "checked" : ""}
      >
      <span>${escapeHtml(label)}</span>
    </label>
  `;
}

function textInput(kind, id, fieldName, value, placeholder = "") {
  return `<input
    type="text"
    value="${escapeHtml(value)}"
    placeholder="${escapeHtml(placeholder)}"
    data-kind="${escapeHtml(kind)}"
    data-id="${escapeHtml(id)}"
    data-field="${escapeHtml(fieldName)}"
  >`;
}

function numberInput(kind, id, fieldName, value, min, max, step = 1) {
  return `<input
    type="number"
    value="${escapeHtml(value)}"
    min="${escapeHtml(min)}"
    max="${escapeHtml(max)}"
    step="${escapeHtml(step)}"
    data-kind="${escapeHtml(kind)}"
    data-id="${escapeHtml(id)}"
    data-field="${escapeHtml(fieldName)}"
  >`;
}

function selectControl(kind, id, fieldName, options, selected, allowNoneLabel) {
  return `<select
    data-kind="${escapeHtml(kind)}"
    data-id="${escapeHtml(id)}"
    data-field="${escapeHtml(fieldName)}"
  >${renderOptions(options, selected, allowNoneLabel)}</select>`;
}

function pinSelectControl(kind, id, fieldName, selected, allowNoneLabel) {
  return `<select
    data-kind="${escapeHtml(kind)}"
    data-id="${escapeHtml(id)}"
    data-field="${escapeHtml(fieldName)}"
  >${renderPinOptions(selected, allowNoneLabel)}</select>`;
}

function getTargets(kind) {
  if (kind === "relay") {
    return state.relays.map((relay) => ({ value: relay.id, label: relay.name }));
  }
  if (kind === "shutter") {
    return state.shutters.map((shutter) => ({ value: shutter.id, label: shutter.name }));
  }
  return [];
}

function getBinaryInputOptions() {
  return state.binaryInputs.map((input) => ({ value: input.id, label: input.name }));
}

function getButtonOptions() {
  return state.buttons.map((button) => ({ value: button.id, label: button.name }));
}

function getSourceOptions(sourceType) {
  if (sourceType === "button") {
    return getButtonOptions();
  }
  return getBinaryInputOptions();
}

function getTargetOptions(targetType) {
  return getTargets(targetType);
}

function getEventOptions(sourceType) {
  return sourceType === "button" ? buttonEventOptions : binaryEventOptions;
}

function getActionOptions(targetType) {
  return targetType === "relay" ? relayActions : shutterActions;
}

function buildSensorDefaults(type) {
  const sensorIndex = counters.sensor - 1;
  const defaults = {
    type,
    refreshMs: 10000,
    pin: "",
    address: "",
    altitudeMeters: 100
  };

  switch (type) {
    case "ds18b20":
      return {
        ...defaults,
        name: `DS18B20 ${sensorIndex}`,
        pin: state.buses.defaultOneWirePin
      };
    case "dht11":
      return {
        ...defaults,
        name: `DHT11 ${sensorIndex}`,
        pin: ""
      };
    case "dht22":
      return {
        ...defaults,
        name: `DHT22 ${sensorIndex}`,
        pin: ""
      };
    case "bme280":
      return {
        ...defaults,
        name: `BME280 ${sensorIndex}`,
        address: "0x76"
      };
    case "bmp280":
      return {
        ...defaults,
        name: `BMP280 ${sensorIndex}`,
        address: "0x76"
      };
    case "si7021":
    default:
      return {
        ...defaults,
        name: `Si7021 ${sensorIndex}`,
        altitudeMeters: 0
      };
  }
}

function createItem(kind) {
  switch (kind) {
    case "relay":
      return {
        id: makeId(kind),
        name: `Relay ${counters.relay - 1}`,
        pin: "",
        highIsOn: true,
        defaultState: "off",
        ledPin: "",
        ledInverted: true
      };
    case "shutter":
      return {
        id: makeId(kind),
        name: `Roleta ${counters.shutter - 1}`,
        upPin: "",
        downPin: "",
        highIsOn: true,
        openingTimeMs: 18000,
        closingTimeMs: 18000,
        upButtonId: "",
        downButtonId: "",
        openLimitId: "",
        closeLimitId: ""
      };
    case "button":
      return {
        id: makeId(kind),
        name: `Button ${counters.button - 1}`,
        pin: "",
        buttonType: "monostable",
        pullUp: true,
        invertLogic: true,
        configButton: false,
        holdMs: 1000,
        multiclickMs: 300
      };
    case "binary":
      return {
        id: makeId(kind),
        name: `Input ${counters.binary - 1}`,
        pin: "",
        role: "generic",
        pullUp: true,
        invertLogic: true,
        filteringTimeMs: 50
      };
    case "sensor":
      return {
        id: makeId(kind),
        ...buildSensorDefaults("ds18b20")
      };
    case "actionTrigger":
      return {
        id: makeId(kind),
        name: `AT ${counters.actionTrigger - 1}`,
        buttonId: state.buttons[0]?.id || "",
        relatedType: state.relays.length ? "relay" : "shutter",
        relatedId: state.relays[0]?.id || state.shutters[0]?.id || "",
        alwaysUseOnClick1: false
      };
    case "directLink":
      return {
        id: makeId(kind),
        name: `Link ${counters.directLink - 1}`,
        sourceType: state.buttons.length ? "button" : "binary",
        sourceId: state.buttons[0]?.id || state.binaryInputs[0]?.id || "",
        event: state.buttons.length ? "ON_CLICK_1" : "ON_TURN_ON",
        targetType: state.relays.length ? "relay" : "shutter",
        targetId: state.relays[0]?.id || state.shutters[0]?.id || "",
        action: state.relays.length ? "TOGGLE" : "OPEN_OR_STOP"
      };
    default:
      return {};
  }
}

function getCollection(kind) {
  return state[collections[kind]];
}

function findItem(kind, id) {
  return getCollection(kind).find((item) => item.id === id);
}

function updateItem(kind, id, fieldName, value) {
  const item = findItem(kind, id);
  if (!item) {
    return;
  }

  if (kind === "sensor" && fieldName === "type") {
    const preserved = { id: item.id, name: item.name };
    Object.assign(item, buildSensorDefaults(value), preserved);
    return;
  }

  if (kind === "directLink") {
    if (fieldName === "sourceType") {
      item.sourceType = value;
      item.sourceId = getSourceOptions(value)[0]?.value || "";
      item.event = getEventOptions(value)[0] || "";
      return;
    }
    if (fieldName === "targetType") {
      item.targetType = value;
      item.targetId = getTargetOptions(value)[0]?.value || "";
      item.action = getActionOptions(value)[0] || "";
      return;
    }
  }

  if (kind === "actionTrigger" && fieldName === "relatedType") {
    item.relatedType = value;
    item.relatedId = getTargetOptions(value)[0]?.value || "";
    return;
  }

  item[fieldName] = value;
}

function removeItem(kind, id) {
  state[collections[kind]] = getCollection(kind).filter((item) => item.id !== id);
}

function applyBoardDefaults(nextBoardKey, previousBoardKey) {
  const nextBoard = getBoardProfile(nextBoardKey);
  const previousBoard = getBoardProfile(previousBoardKey);

  if (state.metadata.name === `Supla ${previousBoard.boardLabel} Multi`) {
    state.metadata.name = `Supla ${nextBoard.boardLabel} Multi`;
  }
  if (!state.metadata.statusLedPin || state.metadata.statusLedPin === previousBoard.defaultStatusLedPin) {
    state.metadata.statusLedPin = nextBoard.defaultStatusLedPin;
  }
  if (!state.buses.i2cSdaPin || state.buses.i2cSdaPin === previousBoard.defaultI2cSdaPin) {
    state.buses.i2cSdaPin = nextBoard.defaultI2cSdaPin;
  }
  if (!state.buses.i2cSclPin || state.buses.i2cSclPin === previousBoard.defaultI2cSclPin) {
    state.buses.i2cSclPin = nextBoard.defaultI2cSclPin;
  }
  if (!state.buses.defaultOneWirePin || state.buses.defaultOneWirePin === previousBoard.defaultOneWirePin) {
    state.buses.defaultOneWirePin = nextBoard.defaultOneWirePin;
  }
}

function setBoard(boardKey) {
  const normalizedBoardKey = boardProfiles[boardKey] ? boardKey : defaultBoardKey;
  const previousBoardKey = state.metadata.board || defaultBoardKey;
  if (normalizedBoardKey === previousBoardKey) {
    return;
  }
  state.metadata.board = normalizedBoardKey;
  applyBoardDefaults(normalizedBoardKey, previousBoardKey);
}

function loadProfileConfig(config) {
  const boardKey = boardProfiles[config?.metadata?.board] ? config.metadata.board : defaultBoardKey;
  state = createDefaultState(boardKey);

  state.metadata.name = config?.metadata?.name || state.metadata.name;
  state.metadata.profileType = config?.metadata?.profileType || state.metadata.profileType;
  state.metadata.board = boardKey;
  state.metadata.statusLedPin = config?.metadata?.statusLed?.pin || "";
  state.metadata.statusLedInverted = Boolean(config?.metadata?.statusLed?.inverted);

  state.network.provisioning = config?.network?.provisioning || state.network.provisioning;
  state.network.otaEnabled = config?.network?.otaEnabled !== undefined ? Boolean(config.network.otaEnabled) : state.network.otaEnabled;
  state.network.verboseLogs = config?.network?.verboseLogs !== undefined ? Boolean(config.network.verboseLogs) : state.network.verboseLogs;

  state.buses.i2cEnabled = config?.buses?.i2c?.enabled !== undefined ? Boolean(config.buses.i2c.enabled) : state.buses.i2cEnabled;
  state.buses.i2cSdaPin = config?.buses?.i2c?.sdaPin || "";
  state.buses.i2cSclPin = config?.buses?.i2c?.sclPin || "";
  state.buses.i2cFrequencyKHz = Number(config?.buses?.i2c?.frequencyKHz || state.buses.i2cFrequencyKHz);
  state.buses.defaultOneWirePin = config?.buses?.oneWire?.defaultPin || "";

  state.relays = (config?.components?.relays || []).map((relay) => ({
    id: relay.id,
    name: relay.name,
    pin: relay.pin || "",
    highIsOn: relay.highIsOn !== undefined ? Boolean(relay.highIsOn) : true,
    defaultState: relay.defaultState || "off",
    ledPin: relay.led?.pin || "",
    ledInverted: relay.led?.inverted !== undefined ? Boolean(relay.led.inverted) : true
  }));

  state.shutters = (config?.components?.shutters || []).map((shutter) => ({
    id: shutter.id,
    name: shutter.name,
    upPin: shutter.upPin || "",
    downPin: shutter.downPin || "",
    highIsOn: shutter.highIsOn !== undefined ? Boolean(shutter.highIsOn) : true,
    openingTimeMs: Number(shutter.openingTimeMs || 18000),
    closingTimeMs: Number(shutter.closingTimeMs || 18000),
    upButtonId: shutter.upButtonId || "",
    downButtonId: shutter.downButtonId || "",
    openLimitId: shutter.openLimitId || "",
    closeLimitId: shutter.closeLimitId || ""
  }));

  state.buttons = (config?.components?.buttons || []).map((button) => ({
    id: button.id,
    name: button.name,
    pin: button.pin || "",
    buttonType: button.buttonType || "monostable",
    pullUp: button.pullUp !== undefined ? Boolean(button.pullUp) : true,
    invertLogic: button.invertLogic !== undefined ? Boolean(button.invertLogic) : true,
    configButton: Boolean(button.configButton),
    holdMs: Number(button.holdMs || 1000),
    multiclickMs: Number(button.multiclickMs || 300)
  }));

  state.binaryInputs = (config?.components?.binaryInputs || []).map((binaryInput) => ({
    id: binaryInput.id,
    name: binaryInput.name,
    pin: binaryInput.pin || "",
    role: binaryInput.role || "generic",
    pullUp: binaryInput.pullUp !== undefined ? Boolean(binaryInput.pullUp) : true,
    invertLogic: binaryInput.invertLogic !== undefined ? Boolean(binaryInput.invertLogic) : true,
    filteringTimeMs: Number(binaryInput.filteringTimeMs || 0)
  }));

  state.sensors = (config?.components?.sensors || []).map((sensor) => ({
    id: sensor.id,
    name: sensor.name,
    type: sensor.type || "ds18b20",
    pin: sensor.pin || "",
    address: sensor.address || "",
    altitudeMeters: Number(sensor.altitudeMeters || 0),
    refreshMs: Number(sensor.refreshMs || 10000)
  }));

  state.actionTriggers = (config?.components?.actionTriggers || []).map((actionTrigger) => ({
    id: actionTrigger.id,
    name: actionTrigger.name,
    buttonId: actionTrigger.buttonId || "",
    relatedType: actionTrigger.relatedType || "relay",
    relatedId: actionTrigger.relatedId || "",
    alwaysUseOnClick1: Boolean(actionTrigger.alwaysUseOnClick1)
  }));

  state.directLinks = (config?.links?.direct || []).map((link) => ({
    id: link.id,
    name: link.name,
    sourceType: link.sourceType || "button",
    sourceId: link.sourceId || "",
    event: link.event || "ON_CLICK_1",
    targetType: link.targetType || "relay",
    targetId: link.targetId || "",
    action: link.action || "TOGGLE"
  }));

  syncCounters();
}

function selectedText(options, value, fallback = "Brak") {
  const found = options.find((option) => option.value === value);
  return found ? found.label : fallback;
}

function renderRelayCard(relay) {
  const chips = [];
  if (relay.ledPin) {
    chips.push(`LED state ${relay.ledPin}`);
  }

  return `
    <article class="component-card">
      <div class="card-head">
        <div>
          <h4 class="card-title">${escapeHtml(relay.name)}</h4>
          <p class="card-meta">${escapeHtml(relay.pin || "Pin nieustawiony")}</p>
          <div class="chip-row">${chips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join("")}</div>
        </div>
        <button type="button" class="icon-button" data-remove-kind="relay" data-remove-id="${escapeHtml(relay.id)}">Usun</button>
      </div>
      <div class="mini-grid">
        ${field("Nazwa", textInput("relay", relay.id, "name", relay.name))}
        ${field("GPIO relay", pinSelectControl("relay", relay.id, "pin", relay.pin, "Wybierz pin"))}
        ${field("GPIO LED stanu", pinSelectControl("relay", relay.id, "ledPin", relay.ledPin, "Brak"))}
        ${field("Stan poczatkowy", selectControl("relay", relay.id, "defaultState", [{ value: "off", label: "OFF" }, { value: "on", label: "ON" }], relay.defaultState))}
        ${checkboxControl("relay", relay.id, "highIsOn", relay.highIsOn, "HIGH = ON")}
        ${checkboxControl("relay", relay.id, "ledInverted", relay.ledInverted, "LED aktywna stanem niskim")}
      </div>
    </article>
  `;
}

function renderShutterCard(shutter) {
  return `
    <article class="component-card">
      <div class="card-head">
        <div>
          <h4 class="card-title">${escapeHtml(shutter.name)}</h4>
          <p class="card-meta">Rolety na dwoch relay + opcjonalne przyciski i krańcówki</p>
        </div>
        <button type="button" class="icon-button" data-remove-kind="shutter" data-remove-id="${escapeHtml(shutter.id)}">Usun</button>
      </div>
      <div class="mini-grid">
        ${field("Nazwa", textInput("shutter", shutter.id, "name", shutter.name))}
        ${checkboxControl("shutter", shutter.id, "highIsOn", shutter.highIsOn, "HIGH = ON")}
        ${field("GPIO relay UP", pinSelectControl("shutter", shutter.id, "upPin", shutter.upPin, "Wybierz pin"))}
        ${field("GPIO relay DOWN", pinSelectControl("shutter", shutter.id, "downPin", shutter.downPin, "Wybierz pin"))}
        ${field("Czas otwierania [ms]", numberInput("shutter", shutter.id, "openingTimeMs", shutter.openingTimeMs, 1000, 120000, 500))}
        ${field("Czas zamykania [ms]", numberInput("shutter", shutter.id, "closingTimeMs", shutter.closingTimeMs, 1000, 120000, 500))}
        ${field("Przycisk gora", selectControl("shutter", shutter.id, "upButtonId", getButtonOptions(), shutter.upButtonId, "Brak"))}
        ${field("Przycisk dol", selectControl("shutter", shutter.id, "downButtonId", getButtonOptions(), shutter.downButtonId, "Brak"))}
        ${field("Krańcówka otwarte", selectControl("shutter", shutter.id, "openLimitId", getBinaryInputOptions(), shutter.openLimitId, "Brak"))}
        ${field("Krańcówka zamkniete", selectControl("shutter", shutter.id, "closeLimitId", getBinaryInputOptions(), shutter.closeLimitId, "Brak"), "Modelowane jako Binary input + lokalne STOP")}
      </div>
    </article>
  `;
}

function renderButtonCard(button) {
  const chips = [];
  if (button.configButton) {
    chips.push("Config mode on hold");
  }

  return `
    <article class="component-card">
      <div class="card-head">
        <div>
          <h4 class="card-title">${escapeHtml(button.name)}</h4>
          <p class="card-meta">${escapeHtml(button.pin || "Pin nieustawiony")}</p>
          <div class="chip-row">${chips.map((chip) => `<span class="chip">${escapeHtml(chip)}</span>`).join("")}</div>
        </div>
        <button type="button" class="icon-button" data-remove-kind="button" data-remove-id="${escapeHtml(button.id)}">Usun</button>
      </div>
      <div class="mini-grid">
        ${field("Nazwa", textInput("button", button.id, "name", button.name))}
        ${field("GPIO", pinSelectControl("button", button.id, "pin", button.pin, "Wybierz pin"))}
        ${field("Typ", selectControl("button", button.id, "buttonType", buttonTypeOptions, button.buttonType))}
        ${field("Hold [ms]", numberInput("button", button.id, "holdMs", button.holdMs, 200, 10000, 100))}
        ${field("Multiclick [ms]", numberInput("button", button.id, "multiclickMs", button.multiclickMs, 200, 10000, 100))}
        ${checkboxControl("button", button.id, "pullUp", button.pullUp, "INPUT_PULLUP")}
        ${checkboxControl("button", button.id, "invertLogic", button.invertLogic, "Aktywny stan niski")}
        ${checkboxControl("button", button.id, "configButton", button.configButton, "Dlugie przytrzymanie = config mode")}
      </div>
    </article>
  `;
}

function renderBinaryInputCard(binaryInput) {
  return `
    <article class="component-card">
      <div class="card-head">
        <div>
          <h4 class="card-title">${escapeHtml(binaryInput.name)}</h4>
          <p class="card-meta">${escapeHtml(binaryInput.pin || "Pin nieustawiony")}</p>
        </div>
        <button type="button" class="icon-button" data-remove-kind="binary" data-remove-id="${escapeHtml(binaryInput.id)}">Usun</button>
      </div>
      <div class="mini-grid">
        ${field("Nazwa", textInput("binary", binaryInput.id, "name", binaryInput.name))}
        ${field("GPIO", pinSelectControl("binary", binaryInput.id, "pin", binaryInput.pin, "Wybierz pin"))}
        ${field("Rola", selectControl("binary", binaryInput.id, "role", binaryRoleOptions, binaryInput.role))}
        ${field("Filtr [ms]", numberInput("binary", binaryInput.id, "filteringTimeMs", binaryInput.filteringTimeMs, 0, 5000, 10))}
        ${checkboxControl("binary", binaryInput.id, "pullUp", binaryInput.pullUp, "INPUT_PULLUP")}
        ${checkboxControl("binary", binaryInput.id, "invertLogic", binaryInput.invertLogic, "Aktywny stan niski")}
      </div>
    </article>
  `;
}

function renderSensorCard(sensor) {
  let extraFields = "";

  if (sensor.type === "ds18b20") {
    extraFields = `
      ${field("GPIO OneWire", pinSelectControl("sensor", sensor.id, "pin", sensor.pin, "Wybierz pin"))}
      ${field("Adres 64-bit", textInput("sensor", sensor.id, "address", sensor.address, "28-FF-C8-AB-6E-18-01-FC"), "Opcjonalny. Zostaw puste przy pojedynczym DS18B20 na pinie.")}
    `;
  } else if (sensor.type === "dht11" || sensor.type === "dht22") {
    extraFields = `
      ${field("GPIO", pinSelectControl("sensor", sensor.id, "pin", sensor.pin, "Wybierz pin"))}
      ${field("Uwagi", `<input value="${sensor.type === "dht11" ? "Czujnik wolniejszy i mniej dokladny" : "DHT22 / AM2302"}" disabled>`) }
    `;
  } else if (sensor.type === "bme280" || sensor.type === "bmp280") {
    extraFields = `
      ${field("Adres I2C", selectControl("sensor", sensor.id, "address", [{ value: "0x76", label: "0x76" }, { value: "0x77", label: "0x77" }], sensor.address))}
      ${field("Wysokosc [m]", numberInput("sensor", sensor.id, "altitudeMeters", sensor.altitudeMeters, -500, 9000, 1))}
    `;
  } else {
    extraFields = `
      ${field("Adres I2C", `<input value="0x40 domyslny" disabled>`)}
      ${field("Uwagi", `<input value="Si7021 korzysta z globalnej magistrali I2C" disabled>`)}
    `;
  }

  return `
    <article class="component-card">
      <div class="card-head">
        <div>
          <h4 class="card-title">${escapeHtml(sensor.name)}</h4>
          <p class="card-meta">${escapeHtml(selectedText(sensorTypeOptions, sensor.type, sensor.type))}</p>
        </div>
        <button type="button" class="icon-button" data-remove-kind="sensor" data-remove-id="${escapeHtml(sensor.id)}">Usun</button>
      </div>
      <div class="mini-grid">
        ${field("Nazwa", textInput("sensor", sensor.id, "name", sensor.name))}
        ${field("Typ sensora", selectControl("sensor", sensor.id, "type", sensorTypeOptions, sensor.type))}
        ${field("Refresh [ms]", numberInput("sensor", sensor.id, "refreshMs", sensor.refreshMs, 1000, 60000, 500))}
        ${extraFields}
      </div>
    </article>
  `;
}

function renderActionTriggerCard(actionTrigger) {
  const relatedTargets = getTargetOptions(actionTrigger.relatedType);

  return `
    <article class="component-card">
      <div class="card-head">
        <div>
          <h4 class="card-title">${escapeHtml(actionTrigger.name)}</h4>
          <p class="card-meta">Powiazanie przycisku z relay/roleta po stronie SUPLA</p>
        </div>
        <button type="button" class="icon-button" data-remove-kind="actionTrigger" data-remove-id="${escapeHtml(actionTrigger.id)}">Usun</button>
      </div>
      <div class="mini-grid">
        ${field("Nazwa", textInput("actionTrigger", actionTrigger.id, "name", actionTrigger.name))}
        ${field("Przycisk", selectControl("actionTrigger", actionTrigger.id, "buttonId", getButtonOptions(), actionTrigger.buttonId, "Brak"))}
        ${field("Typ celu", selectControl("actionTrigger", actionTrigger.id, "relatedType", [{ value: "relay", label: "Relay" }, { value: "shutter", label: "Roleta" }], actionTrigger.relatedType))}
        ${field("Powiazany kanal", selectControl("actionTrigger", actionTrigger.id, "relatedId", relatedTargets, actionTrigger.relatedId, "Brak"))}
        ${checkboxControl("actionTrigger", actionTrigger.id, "alwaysUseOnClick1", actionTrigger.alwaysUseOnClick1, "Zawsze mapuj do ON_CLICK_1")}
      </div>
    </article>
  `;
}

function renderDirectLinkCard(link) {
  const sourceOptions = getSourceOptions(link.sourceType);
  const targetOptions = getTargetOptions(link.targetType);

  return `
    <article class="component-card">
      <div class="card-head">
        <div>
          <h4 class="card-title">${escapeHtml(link.name)}</h4>
          <p class="card-meta">Lokalne powiazanie bez chmury</p>
        </div>
        <button type="button" class="icon-button" data-remove-kind="directLink" data-remove-id="${escapeHtml(link.id)}">Usun</button>
      </div>
      <div class="mini-grid">
        ${field("Nazwa", textInput("directLink", link.id, "name", link.name))}
        ${field("Zrodlo", selectControl("directLink", link.id, "sourceType", [{ value: "button", label: "Button" }, { value: "binary", label: "Binary input" }], link.sourceType))}
        ${field("Element zrodlowy", selectControl("directLink", link.id, "sourceId", sourceOptions, link.sourceId, "Brak"))}
        ${field("Event", selectControl("directLink", link.id, "event", getEventOptions(link.sourceType), link.event))}
        ${field("Cel", selectControl("directLink", link.id, "targetType", [{ value: "relay", label: "Relay" }, { value: "shutter", label: "Roleta" }], link.targetType))}
        ${field("Element docelowy", selectControl("directLink", link.id, "targetId", targetOptions, link.targetId, "Brak"))}
        ${field("Akcja", selectControl("directLink", link.id, "action", getActionOptions(link.targetType), link.action))}
      </div>
    </article>
  `;
}

function renderCollection(containerId, items, renderer, emptyMessage) {
  const container = document.getElementById(containerId);
  if (!items.length) {
    container.innerHTML = `<p class="empty-state">${escapeHtml(emptyMessage)}</p>`;
    return;
  }
  container.innerHTML = items.map(renderer).join("");
}

function populateStaticPinSelect(selectId, selected) {
  const select = document.getElementById(selectId);
  select.innerHTML = renderPinOptions(selected, "Wybierz pin");
}

function renderFlashMap(config) {
  const boardProfile = getBoardProfile(config.metadata.board);
  flashMap.innerHTML = "";
  flashMapTitle.textContent = boardProfile.flashLabel;
  boardProfile.flashLayout.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "flash-row";

    const name = document.createElement("strong");
    name.textContent = entry.name;

    const bar = document.createElement("div");
    bar.className = "flash-bar";
    const fill = document.createElement("div");
    fill.className = "flash-bar-fill";
    fill.style.width = `${(entry.length / boardProfile.flashBytes) * 100}%`;
    bar.appendChild(fill);

    const meta = document.createElement("span");
    meta.textContent = bytesToHex(entry.start);

    row.append(name, bar, meta);
    flashMap.appendChild(row);
  });
}

function renderBuildCommands(config) {
  targetChip.textContent = config.metadata.targetChip;
  targetEnvHint.textContent = `Srodowisko builda: ${config.build.generatedEnv}`;
  buildCommandOutput.textContent = [
    `# aktywny target`,
    `board = ${config.metadata.board}`,
    `soc = ${config.metadata.soc}`,
    ``,
    `# eksport z buildera`,
    `zapisz JSON jako: profiles/active_profile.json`,
    ``,
    `# build wygenerowanego profilu`,
    config.build.buildCommand,
    ``,
    `# upload`,
    config.build.uploadCommand,
    ``,
    `# monitor UART`,
    config.build.monitorCommand,
    ``,
    `# fallback manualny`,
    `pio run -e ${config.build.manualEnv}`
  ].join("\n");
}

function estimateSensorChannels(sensor) {
  if (sensor.type === "bme280" || sensor.type === "bmp280") {
    return 2;
  }
  return 1;
}

function buildRequiredLibraries(config) {
  const libs = new Set(["file://deps/supla-device"]);

  config.components.sensors.forEach((sensor) => {
    if (sensor.type === "ds18b20") {
      libs.add("paulstoffregen/OneWire");
      libs.add("milesburton/DallasTemperature");
    }
    if (sensor.type === "dht11" || sensor.type === "dht22") {
      libs.add("adafruit/DHT sensor library");
    }
    if (sensor.type === "bme280") {
      libs.add("adafruit/Adafruit Unified Sensor");
      libs.add("adafruit/Adafruit BusIO");
      libs.add("adafruit/Adafruit BME280 Library");
    }
    if (sensor.type === "bmp280") {
      libs.add("adafruit/Adafruit Unified Sensor");
      libs.add("adafruit/Adafruit BusIO");
      libs.add("adafruit/Adafruit BMP280 Library");
    }
    if (sensor.type === "si7021") {
      libs.add("adafruit/Adafruit Unified Sensor");
      libs.add("adafruit/Adafruit BusIO");
      libs.add("adafruit/Adafruit Si7021 Library");
    }
  });

  return [...libs];
}

function normalizeRelay(relay) {
  return {
    id: relay.id,
    name: relay.name,
    pin: relay.pin || null,
    highIsOn: relay.highIsOn,
    defaultState: relay.defaultState,
    led: relay.ledPin
      ? {
          pin: relay.ledPin,
          inverted: relay.ledInverted
        }
      : null
  };
}

function normalizeShutter(shutter) {
  return {
    id: shutter.id,
    name: shutter.name,
    upPin: shutter.upPin || null,
    downPin: shutter.downPin || null,
    highIsOn: shutter.highIsOn,
    openingTimeMs: Number(shutter.openingTimeMs),
    closingTimeMs: Number(shutter.closingTimeMs),
    upButtonId: shutter.upButtonId || null,
    downButtonId: shutter.downButtonId || null,
    openLimitId: shutter.openLimitId || null,
    closeLimitId: shutter.closeLimitId || null
  };
}

function normalizeButton(button) {
  return {
    id: button.id,
    name: button.name,
    pin: button.pin || null,
    buttonType: button.buttonType,
    pullUp: button.pullUp,
    invertLogic: button.invertLogic,
    configButton: button.configButton,
    holdMs: Number(button.holdMs),
    multiclickMs: Number(button.multiclickMs)
  };
}

function normalizeBinaryInput(binaryInput) {
  return {
    id: binaryInput.id,
    name: binaryInput.name,
    pin: binaryInput.pin || null,
    role: binaryInput.role,
    pullUp: binaryInput.pullUp,
    invertLogic: binaryInput.invertLogic,
    filteringTimeMs: Number(binaryInput.filteringTimeMs)
  };
}

function normalizeSensor(sensor) {
  return {
    id: sensor.id,
    name: sensor.name,
    type: sensor.type,
    pin: sensor.pin || null,
    address: sensor.address || null,
    altitudeMeters: Number(sensor.altitudeMeters || 0),
    refreshMs: Number(sensor.refreshMs)
  };
}

function normalizeActionTrigger(actionTrigger) {
  return {
    id: actionTrigger.id,
    name: actionTrigger.name,
    buttonId: actionTrigger.buttonId || null,
    relatedType: actionTrigger.relatedType,
    relatedId: actionTrigger.relatedId || null,
    alwaysUseOnClick1: actionTrigger.alwaysUseOnClick1
  };
}

function normalizeDirectLink(link) {
  return {
    id: link.id,
    name: link.name,
    sourceType: link.sourceType,
    sourceId: link.sourceId || null,
    event: link.event,
    targetType: link.targetType,
    targetId: link.targetId || null,
    action: link.action
  };
}

function buildConfig() {
  const boardProfile = getBoardProfile(state.metadata.board);
  const config = {
    version: 1,
    metadata: {
      name: state.metadata.name,
      profileType: state.metadata.profileType,
      board: boardProfile.board,
      soc: boardProfile.soc,
      targetChip: boardProfile.chipLabel,
      statusLed: {
        pin: state.metadata.statusLedPin,
        inverted: state.metadata.statusLedInverted
      }
    },
    network: {
      provisioning: state.network.provisioning,
      otaEnabled: state.network.otaEnabled,
      verboseLogs: state.network.verboseLogs,
      uart2: "P0"
    },
    buses: {
      i2c: {
        enabled: state.buses.i2cEnabled,
        sdaPin: state.buses.i2cSdaPin,
        sclPin: state.buses.i2cSclPin,
        frequencyKHz: Number(state.buses.i2cFrequencyKHz)
      },
      oneWire: {
        defaultPin: state.buses.defaultOneWirePin
      }
    },
    components: {
      relays: state.relays.map(normalizeRelay),
      shutters: state.shutters.map(normalizeShutter),
      buttons: state.buttons.map(normalizeButton),
      binaryInputs: state.binaryInputs.map(normalizeBinaryInput),
      sensors: state.sensors.map(normalizeSensor),
      actionTriggers: state.actionTriggers.map(normalizeActionTrigger)
    },
    links: {
      direct: state.directLinks.map(normalizeDirectLink)
    },
    boardConstraints: {
      safePins: boardProfile.safePins,
      warningPins: boardProfile.warningPins
    },
    flash: boardProfile.flashLayout.map((entry) => ({
      ...entry,
      startHex: bytesToHex(entry.start),
      lengthHex: bytesToHex(entry.length)
    }))
  };

  config.build = {
    requiredLibraries: buildRequiredLibraries(config),
    manualEnv: boardProfile.manualEnv,
    generatedEnv: boardProfile.generatedEnv,
    buildCommand: `pio run -e ${boardProfile.generatedEnv}`,
    uploadCommand: `pio run -e ${boardProfile.generatedEnv} -t upload --upload-port /dev/ttyUSB0`,
    monitorCommand: "pio device monitor -b 115200 -p /dev/ttyUSB0",
    estimatedChannelCount:
      config.components.relays.length +
      config.components.shutters.length +
      config.components.binaryInputs.length +
      config.components.actionTriggers.length +
      config.components.sensors.reduce((sum, sensor) => sum + estimateSensorChannels(sensor), 0)
  };

  return config;
}

function collectExclusivePinUsage(config) {
  const usages = new Map();

  const addUsage = (pin, label, shareableKey = "") => {
    if (!pin) {
      return;
    }
    if (!usages.has(pin)) {
      usages.set(pin, []);
    }
    usages.get(pin).push({ label, shareableKey });
  };

  config.components.relays.forEach((relay) => {
    addUsage(relay.pin, `${relay.name} relay`);
    if (relay.led) {
      addUsage(relay.led.pin, `${relay.name} LED`);
    }
  });

  config.components.shutters.forEach((shutter) => {
    addUsage(shutter.upPin, `${shutter.name} UP relay`);
    addUsage(shutter.downPin, `${shutter.name} DOWN relay`);
  });

  config.components.buttons.forEach((button) => {
    addUsage(button.pin, `${button.name} button`);
  });

  config.components.binaryInputs.forEach((input) => {
    addUsage(input.pin, `${input.name} binary input`);
  });

  config.components.sensors.forEach((sensor) => {
    if (sensor.type === "ds18b20") {
      addUsage(sensor.pin, `${sensor.name} OneWire`, `onewire:${sensor.pin}`);
    } else if (sensor.type === "dht11" || sensor.type === "dht22") {
      addUsage(sensor.pin, `${sensor.name} ${sensor.type.toUpperCase()}`);
    }
  });

  addUsage(config.metadata.statusLed.pin, "Status LED");

  if (config.buses.i2c.enabled) {
    addUsage(config.buses.i2c.sdaPin, "I2C SDA", `i2c:${config.buses.i2c.sdaPin}`);
    addUsage(config.buses.i2c.sclPin, "I2C SCL", `i2c:${config.buses.i2c.sclPin}`);
  }

  return usages;
}

function buildWarnings(config) {
  const boardProfile = getBoardProfile(config.metadata.board);
  const list = [
    "P20, P22 i P23 sa zwiazane z flashowaniem. Nie planuj tam relay, przyciskow ani sensorow produkcyjnych.",
    "P21 / CSN nie moze byc przytrzymany nisko podczas startu modulu.",
    "P0 jest logami UART2. Zostaw go wolny, jesli debug ma pozostac aktywny."
  ];

  if (config.network.verboseLogs) {
    list.push("Logi UART2 sa wlaczone, wiec P0 pozostaje zarezerwowany dla debug.");
  }

  const configButtons = config.components.buttons.filter((button) => button.configButton);
  if (configButtons.length === 0) {
    list.push("Brak przycisku z config mode. W praktyce warto miec przynajmniej jeden button z dlugim HOLD do wejscia w konfiguracje.");
  }
  if (configButtons.length > 1) {
    list.push(`Masz ${configButtons.length} przyciski z config mode. To dziala, ale zwykle wystarczy jeden.`);
  }

  const allPins = collectExclusivePinUsage(config);
  allPins.forEach((entries, pin) => {
    const warningPin = boardProfile.warningPins.includes(pin);
    if (warningPin) {
      list.push(`${pin} jest pinem ostrzegawczym i zostal przypisany do: ${entries.map((entry) => entry.label).join(", ")}.`);
    }

    const shareableGroups = new Set(entries.map((entry) => entry.shareableKey).filter(Boolean));
    const hasExclusiveConflict = entries.filter((entry) => !entry.shareableKey).length > 1;
    const hasMixedConflict = entries.some((entry) => entry.shareableKey) && entries.some((entry) => !entry.shareableKey);

    if (hasExclusiveConflict || hasMixedConflict || shareableGroups.size > 1) {
      list.push(`Konflikt GPIO na ${pin}: ${entries.map((entry) => entry.label).join(", ")}.`);
    }
  });

  const i2cSensors = config.components.sensors.filter((sensor) =>
    ["bme280", "bmp280", "si7021"].includes(sensor.type)
  );
  if (i2cSensors.length > 0 && !config.buses.i2c.enabled) {
    list.push("Sa skonfigurowane sensory I2C, ale magistrala I2C jest wylaczona.");
  }

  if (["P10", "P11"].includes(config.buses.i2c.sdaPin) || ["P10", "P11"].includes(config.buses.i2c.sclPin)) {
    list.push("I2C koliduje z domyslnym UART uzytkownika P10 / P11. To mozliwe, ale wymaga swiadomego przemapowania debug / serial.");
  }

  config.components.shutters.forEach((shutter) => {
    if (shutter.upPin && shutter.upPin === shutter.downPin) {
      list.push(`${shutter.name}: GPIO UP i DOWN nie moga byc tym samym pinem.`);
    }
    if (shutter.openLimitId || shutter.closeLimitId) {
      list.push(`${shutter.name}: krańcówki sa modelowane jako Binary Input + lokalne STOP, a nie jako twarde odciecie silnika.`);
    }
  });

  config.components.actionTriggers.forEach((actionTrigger) => {
    const buttonExists = config.components.buttons.some((button) => button.id === actionTrigger.buttonId);
    const targetExists = getTargetOptions(actionTrigger.relatedType).some((target) => target.value === actionTrigger.relatedId);
    if (!buttonExists || !targetExists) {
      list.push(`${actionTrigger.name}: action trigger ma niekompletne lub usuniete powiazanie.`);
    }
  });

  config.links.direct.forEach((link) => {
    const sourceExists =
      link.sourceType === "button"
        ? config.components.buttons.some((button) => button.id === link.sourceId)
        : config.components.binaryInputs.some((input) => input.id === link.sourceId);
    const targetExists =
      link.targetType === "relay"
        ? config.components.relays.some((relay) => relay.id === link.targetId)
        : config.components.shutters.some((shutter) => shutter.id === link.targetId);

    if (!sourceExists || !targetExists) {
      list.push(`${link.name}: direct link ma niekompletne lub usuniete zrodlo/cel.`);
    }
  });

  return [...new Set(list)];
}

function renderWarnings(config) {
  warnings.innerHTML = "";
  buildWarnings(config).forEach((message) => {
    const item = document.createElement("li");
    item.textContent = message;
    warnings.appendChild(item);
  });
}

function renderSummary(config) {
  const cards = [
    {
      value: config.components.relays.length + config.components.shutters.length,
      label: "wyjscia relay / rolety"
    },
    {
      value: config.components.buttons.length + config.components.binaryInputs.length,
      label: "wejscia lokalne"
    },
    {
      value: config.components.sensors.length,
      label: "sensory"
    },
    {
      value: config.build.estimatedChannelCount,
      label: "szacowane kanaly SUPLA"
    }
  ];

  builderSummary.innerHTML = cards
    .map(
      (card) => `
        <div class="summary-card">
          <strong>${escapeHtml(card.value)}</strong>
          <span>${escapeHtml(card.label)}</span>
        </div>
      `
    )
    .join("");
}

function sanitizeVarName(value) {
  return value.replaceAll(/[^a-zA-Z0-9]+/g, "_");
}

function parseDsAddress(address) {
  if (!address) {
    return null;
  }
  const tokens = address
    .replaceAll("{", "")
    .replaceAll("}", "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
  if (tokens.length !== 8) {
    return null;
  }
  return tokens.map((token) => {
    const prefixed = token.toUpperCase().startsWith("0X") ? token : `0x${token}`;
    return prefixed.toUpperCase().replace("0X", "0x");
  });
}

function buildFirmwarePreview(config) {
  const includes = new Set([
    "#include <Arduino.h>",
    "#include <SuplaDevice.h>",
    "#include <supla/device/status_led.h>",
    "#include <supla/network/esp_wifi.h>"
  ]);

  const lines = [];
  const setupLines = ["void setup() {", "  Serial.begin(115200);", "  delay(200);"];

  const relayVars = new Map();
  const shutterVars = new Map();
  const buttonVars = new Map();
  const binaryVars = new Map();

  const i2cSensors = config.components.sensors.filter((sensor) =>
    ["bme280", "bmp280", "si7021"].includes(sensor.type)
  );
  const hasWire = i2cSensors.length > 0;

  if (hasWire) {
    includes.add("#include <Wire.h>");
  }
  if (config.components.relays.length > 0) {
    includes.add("#include <supla/control/light_relay.h>");
  }
  if (config.components.relays.some((relay) => relay.led)) {
    includes.add("#include <supla/control/internal_pin_output.h>");
  }
  if (config.components.shutters.length > 0) {
    includes.add("#include <supla/control/roller_shutter.h>");
  }
  if (config.components.buttons.length > 0) {
    includes.add("#include <supla/control/button.h>");
  }
  if (config.components.binaryInputs.length > 0) {
    includes.add("#include <supla/sensor/binary.h>");
  }
  if (config.components.actionTriggers.length > 0) {
    includes.add("#include <supla/control/action_trigger.h>");
  }

  config.components.sensors.forEach((sensor) => {
    switch (sensor.type) {
      case "ds18b20":
        includes.add("#include <supla/sensor/DS18B20.h>");
        break;
      case "dht11":
      case "dht22":
        includes.add("#include <supla/sensor/DHT.h>");
        break;
      case "bme280":
        includes.add("#include <supla/sensor/BME280.h>");
        break;
      case "bmp280":
        includes.add("#include <supla/sensor/BMP280.h>");
        break;
      case "si7021":
        includes.add("#include <supla/sensor/Si7021.h>");
        break;
      default:
        break;
    }
  });

  lines.push([...includes].sort().join("\n"));
  lines.push("");
  lines.push('#if __has_include("supla_secrets.h")');
  lines.push('#include "supla_secrets.h"');
  lines.push("#else");
  lines.push('#include "supla_secrets.h.example"');
  lines.push('#warning "Using example SUPLA credentials. Copy include/supla_secrets.h.example to include/supla_secrets.h and fill real values."');
  lines.push("#endif");
  lines.push("");
  lines.push(`Supla::ESPWifi wifi(SuplaSecrets::kWifiSsid, SuplaSecrets::kWifiPassword);`);
  lines.push(
    `Supla::Device::StatusLed statusLed(${pinToNumber(config.metadata.statusLed.pin)}, ${config.metadata.statusLed.inverted ? "true" : "false"});`
  );
  lines.push("");

  if (hasWire) {
    setupLines.push(
      `  Wire.begin(${pinToNumber(config.buses.i2c.sdaPin)}, ${pinToNumber(config.buses.i2c.sclPin)});`
    );
    setupLines.push(`  Wire.setClock(${config.buses.i2c.frequencyKHz}000);`);
  }

  config.components.relays.forEach((relay) => {
    const relayVar = sanitizeVarName(relay.id);
    relayVars.set(relay.id, relayVar);
    setupLines.push(
      `  auto ${relayVar} = new Supla::Control::LightRelay(${pinToNumber(relay.pin)}, ${relay.highIsOn ? "true" : "false"});`
    );
    setupLines.push(
      relay.defaultState === "on"
        ? `  ${relayVar}->setDefaultStateOn();`
        : `  ${relayVar}->setDefaultStateOff();`
    );
    if (relay.led) {
      const ledVar = `${relayVar}Led`;
      setupLines.push(
        `  auto ${ledVar} = new Supla::Control::InternalPinOutput(${pinToNumber(relay.led.pin)}, ${relay.led.inverted ? "false" : "true"});`
      );
      setupLines.push(`  ${relayVar}->addAction(Supla::TURN_ON, ${ledVar}, Supla::ON_TURN_ON, true);`);
      setupLines.push(`  ${relayVar}->addAction(Supla::TURN_OFF, ${ledVar}, Supla::ON_TURN_OFF, true);`);
    }
    setupLines.push("");
  });

  config.components.shutters.forEach((shutter) => {
    const shutterVar = sanitizeVarName(shutter.id);
    shutterVars.set(shutter.id, shutterVar);
    setupLines.push(
      `  auto ${shutterVar} = new Supla::Control::RollerShutter(${pinToNumber(shutter.upPin)}, ${pinToNumber(shutter.downPin)}, ${shutter.highIsOn ? "true" : "false"});`
    );
    setupLines.push(
      `  ${shutterVar}->setOpenCloseTime(${shutter.closingTimeMs}, ${shutter.openingTimeMs});`
    );
    setupLines.push("");
  });

  config.components.buttons.forEach((button) => {
    const buttonVar = sanitizeVarName(button.id);
    buttonVars.set(button.id, buttonVar);
    setupLines.push(
      `  auto ${buttonVar} = new Supla::Control::Button(${pinToNumber(button.pin)}, ${button.pullUp ? "true" : "false"}, ${button.invertLogic ? "true" : "false"});`
    );
    if (button.buttonType === "bistable") {
      setupLines.push(`  ${buttonVar}->setButtonType(Supla::Control::Button::ButtonType::BISTABLE);`);
    }
    setupLines.push(`  ${buttonVar}->setHoldTime(${button.holdMs});`);
    setupLines.push(`  ${buttonVar}->setMulticlickTime(${button.multiclickMs});`);
    if (button.configButton) {
      setupLines.push(`  ${buttonVar}->configureAsConfigButton(&SuplaDevice);`);
    }
    setupLines.push("");
  });

  config.components.binaryInputs.forEach((binaryInput) => {
    const binaryVar = sanitizeVarName(binaryInput.id);
    binaryVars.set(binaryInput.id, binaryVar);
    setupLines.push(
      `  auto ${binaryVar} = new Supla::Sensor::Binary(${pinToNumber(binaryInput.pin)}, ${binaryInput.pullUp ? "true" : "false"}, ${binaryInput.invertLogic ? "true" : "false"});`
    );
    if (binaryInput.filteringTimeMs > 0) {
      setupLines.push(`  ${binaryVar}->setFilteringTimeMs(${binaryInput.filteringTimeMs});`);
    }
    setupLines.push("");
  });

  config.components.sensors.forEach((sensor) => {
    const sensorVar = sanitizeVarName(sensor.id);
    if (sensor.type === "ds18b20") {
      const address = parseDsAddress(sensor.address);
      if (address) {
        const addressVar = `${sensorVar}Address`;
        setupLines.push(`  DeviceAddress ${addressVar} = {${address.join(", ")}};`);
        setupLines.push(
          `  auto ${sensorVar} = new Supla::Sensor::DS18B20(${pinToNumber(sensor.pin)}, ${addressVar});`
        );
      } else {
        setupLines.push(
          `  auto ${sensorVar} = new Supla::Sensor::DS18B20(${pinToNumber(sensor.pin)});`
        );
      }
      setupLines.push(`  ${sensorVar}->setRefreshIntervalMs(${sensor.refreshMs});`);
    } else if (sensor.type === "dht11" || sensor.type === "dht22") {
      const dhtType = sensor.type === "dht11" ? "DHT11" : "DHT22";
      setupLines.push(
        `  auto ${sensorVar} = new Supla::Sensor::DHT(${pinToNumber(sensor.pin)}, ${dhtType});`
      );
      setupLines.push(`  ${sensorVar}->setRefreshIntervalMs(${sensor.refreshMs});`);
    } else if (sensor.type === "bme280") {
      setupLines.push(
        `  auto ${sensorVar} = new Supla::Sensor::BME280(${sensor.address}, ${sensor.altitudeMeters});`
      );
      setupLines.push(`  ${sensorVar}->setRefreshIntervalMs(${sensor.refreshMs});`);
    } else if (sensor.type === "bmp280") {
      setupLines.push(
        `  auto ${sensorVar} = new Supla::Sensor::BMP280(${sensor.address}, ${sensor.altitudeMeters});`
      );
      setupLines.push(`  ${sensorVar}->setRefreshIntervalMs(${sensor.refreshMs});`);
    } else if (sensor.type === "si7021") {
      setupLines.push(`  auto ${sensorVar} = new Supla::Sensor::Si7021();`);
      setupLines.push(`  ${sensorVar}->setRefreshIntervalMs(${sensor.refreshMs});`);
    }
    setupLines.push("");
  });

  config.components.shutters.forEach((shutter) => {
    const shutterVar = shutterVars.get(shutter.id);
    if (shutter.upButtonId && buttonVars.has(shutter.upButtonId)) {
      setupLines.push(`  ${buttonVars.get(shutter.upButtonId)}->addAction(Supla::OPEN_OR_STOP, ${shutterVar}, Supla::ON_PRESS);`);
    }
    if (shutter.downButtonId && buttonVars.has(shutter.downButtonId)) {
      setupLines.push(`  ${buttonVars.get(shutter.downButtonId)}->addAction(Supla::CLOSE_OR_STOP, ${shutterVar}, Supla::ON_PRESS);`);
    }
    if (shutter.openLimitId && binaryVars.has(shutter.openLimitId)) {
      setupLines.push(`  ${binaryVars.get(shutter.openLimitId)}->addAction(Supla::STOP, ${shutterVar}, Supla::ON_TURN_ON);`);
    }
    if (shutter.closeLimitId && binaryVars.has(shutter.closeLimitId)) {
      setupLines.push(`  ${binaryVars.get(shutter.closeLimitId)}->addAction(Supla::STOP, ${shutterVar}, Supla::ON_TURN_ON);`);
    }
    if (shutter.upButtonId || shutter.downButtonId || shutter.openLimitId || shutter.closeLimitId) {
      setupLines.push("");
    }
  });

  config.links.direct.forEach((link) => {
    const sourceMap = link.sourceType === "button" ? buttonVars : binaryVars;
    const targetMap = link.targetType === "relay" ? relayVars : shutterVars;
    if (sourceMap.has(link.sourceId) && targetMap.has(link.targetId)) {
      setupLines.push(
        `  ${sourceMap.get(link.sourceId)}->addAction(Supla::${link.action}, ${targetMap.get(link.targetId)}, Supla::${link.event});`
      );
    }
  });
  if (config.links.direct.length) {
    setupLines.push("");
  }

  config.components.actionTriggers.forEach((actionTrigger) => {
    const actionTriggerVar = sanitizeVarName(actionTrigger.id);
    const targetMap = actionTrigger.relatedType === "relay" ? relayVars : shutterVars;
    if (buttonVars.has(actionTrigger.buttonId) && targetMap.has(actionTrigger.relatedId)) {
      setupLines.push(`  auto ${actionTriggerVar} = new Supla::Control::ActionTrigger();`);
      setupLines.push(`  ${actionTriggerVar}->setRelatedChannel(${targetMap.get(actionTrigger.relatedId)});`);
      setupLines.push(`  ${actionTriggerVar}->attach(${buttonVars.get(actionTrigger.buttonId)});`);
      if (actionTrigger.alwaysUseOnClick1) {
        setupLines.push(`  ${actionTriggerVar}->setAlwaysUseOnClick1();`);
      }
      setupLines.push("");
    }
  });

  setupLines.push(`  SuplaDevice.setName("${config.metadata.name}");`);
  setupLines.push("  SuplaDevice.setServerPort(2016);");
  setupLines.push("  SuplaDevice.begin(");
  setupLines.push("      SuplaSecrets::kGuid,");
  setupLines.push("      SuplaSecrets::kSuplaServer,");
  setupLines.push("      SuplaSecrets::kSuplaEmail,");
  setupLines.push("      SuplaSecrets::kAuthKey);");
  setupLines.push("}");
  setupLines.push("");
  setupLines.push("void loop() {");
  setupLines.push("  static uint32_t lastSlowTick = millis();");
  setupLines.push("  static uint32_t lastFastTickUs = micros();");
  setupLines.push("");
  setupLines.push("  const uint32_t nowMs = millis();");
  setupLines.push("  while (static_cast<uint32_t>(nowMs - lastSlowTick) >= 10) {");
  setupLines.push("    lastSlowTick += 10;");
  setupLines.push("    SuplaDevice.onTimer();");
  setupLines.push("  }");
  setupLines.push("");
  setupLines.push("  const uint32_t nowUs = micros();");
  setupLines.push("  while (static_cast<uint32_t>(nowUs - lastFastTickUs) >= 1000) {");
  setupLines.push("    lastFastTickUs += 1000;");
  setupLines.push("    SuplaDevice.onFastTimer();");
  setupLines.push("  }");
  setupLines.push("");
  setupLines.push("  SuplaDevice.iterate();");
  setupLines.push("}");

  lines.push(`// required lib_deps:\n// ${config.build.requiredLibraries.join("\n// ")}`);
  lines.push("");
  lines.push(setupLines.join("\n"));

  return lines.join("\n");
}

function render() {
  const config = buildConfig();

  populateStaticPinSelect("statusLedPinInput", state.metadata.statusLedPin);
  populateStaticPinSelect("i2cSdaInput", state.buses.i2cSdaPin);
  populateStaticPinSelect("i2cSclInput", state.buses.i2cSclPin);
  populateStaticPinSelect("oneWirePinInput", state.buses.defaultOneWirePin);

  document.getElementById("boardInput").value = state.metadata.board;
  document.getElementById("deviceNameInput").value = state.metadata.name;
  document.getElementById("profileTypeInput").value = state.metadata.profileType;
  document.getElementById("provisioningInput").value = state.network.provisioning;
  document.getElementById("otaEnabledInput").checked = state.network.otaEnabled;
  document.getElementById("verboseLogsInput").checked = state.network.verboseLogs;
  document.getElementById("statusLedInvertedInput").checked = state.metadata.statusLedInverted;
  document.getElementById("i2cEnabledInput").checked = state.buses.i2cEnabled;
  document.getElementById("i2cFrequencyInput").value = state.buses.i2cFrequencyKHz;

  renderCollection("relaysList", state.relays, renderRelayCard, "Brak relay. Dodaj pierwszy kanal relay lub relay z LED stanu.");
  renderCollection("shuttersList", state.shutters, renderShutterCard, "Brak rolet. Dodaj rolete z relay UP/DOWN oraz opcjonalnymi krańcówkami.");
  renderCollection("buttonsList", state.buttons, renderButtonCard, "Brak przyciskow. Dodaj button monostable lub bistable.");
  renderCollection("binaryInputsList", state.binaryInputs, renderBinaryInputCard, "Brak wejsc binarnych. Tu dodasz krańcówki lub kontaktrony.");
  renderCollection("sensorsList", state.sensors, renderSensorCard, "Brak sensorow. Dodaj DS18B20, DHT11/22 lub sensory I2C.");
  renderCollection("actionTriggersList", state.actionTriggers, renderActionTriggerCard, "Brak action triggerow. Dodaj je, jesli chcesz wysylac akcje przyciskow do SUPLA.");
  renderCollection("directLinksList", state.directLinks, renderDirectLinkCard, "Brak direct links. Dodaj lokalne powiazania bez chmury.");

  renderWarnings(config);
  renderSummary(config);
  renderFlashMap(config);
  renderBuildCommands(config);
  configOutput.textContent = JSON.stringify(config, null, 2);
  firmwareOutput.textContent = buildFirmwarePreview(config);
}

function addItem(kind) {
  state[collections[kind]].push(createItem(kind));
  render();
}

function updateStaticState(target) {
  switch (target.id) {
    case "boardInput":
      setBoard(target.value);
      break;
    case "deviceNameInput":
      state.metadata.name = target.value;
      break;
    case "profileTypeInput":
      state.metadata.profileType = target.value;
      break;
    case "statusLedPinInput":
      state.metadata.statusLedPin = target.value;
      break;
    case "statusLedInvertedInput":
      state.metadata.statusLedInverted = target.checked;
      break;
    case "provisioningInput":
      state.network.provisioning = target.value;
      break;
    case "otaEnabledInput":
      state.network.otaEnabled = target.checked;
      break;
    case "verboseLogsInput":
      state.network.verboseLogs = target.checked;
      break;
    case "i2cEnabledInput":
      state.buses.i2cEnabled = target.checked;
      break;
    case "i2cSdaInput":
      state.buses.i2cSdaPin = target.value;
      break;
    case "i2cSclInput":
      state.buses.i2cSclPin = target.value;
      break;
    case "i2cFrequencyInput":
      state.buses.i2cFrequencyKHz = Number(target.value);
      break;
    case "oneWirePinInput":
      state.buses.defaultOneWirePin = target.value;
      break;
    default:
      break;
  }
}

function handleInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.hasAttribute("data-kind")) {
    const kind = target.getAttribute("data-kind");
    const id = target.getAttribute("data-id");
    const fieldName = target.getAttribute("data-field");
    const value =
      target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : target instanceof HTMLInputElement && target.type === "number"
          ? Number(target.value)
          : target.value;

    updateItem(kind, id, fieldName, value);
    render();
    return;
  }

  updateStaticState(target);
  render();
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function resetToTemplate() {
  state = createDefaultState(state.metadata.board || defaultBoardKey);
  syncCounters();
  render();
}

function importProfileFile(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      loadProfileConfig(parsed);
      render();
    } catch (error) {
      window.alert(`Nie udalo sie wczytac profilu JSON: ${error.message}`);
    } finally {
      importProfileInput.value = "";
    }
  };
  reader.readAsText(file);
}

function handleClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.hasAttribute("data-add-kind")) {
    addItem(target.getAttribute("data-add-kind"));
    return;
  }

  if (target.hasAttribute("data-remove-kind")) {
    removeItem(target.getAttribute("data-remove-kind"), target.getAttribute("data-remove-id"));
    render();
  }
}

document.addEventListener("input", handleInput);
document.addEventListener("change", handleInput);
document.addEventListener("click", handleClick);

exportButton.addEventListener("click", () => {
  downloadFile("active_profile.json", JSON.stringify(buildConfig(), null, 2), "application/json");
});

exportCodeButton.addEventListener("click", () => {
  downloadFile("generated_profile_preview.cpp", buildFirmwarePreview(buildConfig()), "text/plain");
});

importButton.addEventListener("click", () => {
  importProfileInput.click();
});

resetButton.addEventListener("click", () => {
  resetToTemplate();
});

importProfileInput.addEventListener("change", (event) => {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) {
    return;
  }
  importProfileFile(input.files?.[0] || null);
});

syncCounters();
render();
