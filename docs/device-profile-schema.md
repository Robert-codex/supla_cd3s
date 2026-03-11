# Device Profile Schema

Builder `web/` eksportuje profil JSON opisujacy konfiguracje urzadzenia dla `CB3S / BK7231N` oraz `WB3S / BK7231T`.

## Wspierane sekcje

- `metadata`
  - nazwa urzadzenia
  - typ profilu
  - `board`
  - `soc`
  - status LED
- `network`
  - provisioning
  - OTA
  - logi UART2
- `buses`
  - globalna magistrala `I2C`
  - domyslny pin `OneWire`
- `components.relays`
  - relay
  - opcjonalny LED stanu relay
- `components.shutters`
  - dwa relay `UP` / `DOWN`
  - czasy otwierania i zamykania
  - opcjonalne przypisanie przyciskow kierunkowych
  - opcjonalne przypisanie krańcówek
- `components.buttons`
  - monostable / bistable
  - `pullUp`
  - `invertLogic`
  - `configButton`
- `components.binaryInputs`
  - generic
  - krańcówka otwarcia
  - krańcówka zamkniecia
  - kontaktron
- `components.sensors`
  - `DS18B20`
  - `DHT11`
  - `DHT22`
  - `BME280`
  - `BMP280`
  - `Si7021`
- `components.actionTriggers`
  - powiazanie przycisku z kanalem relay / rolety
- `links.direct`
  - lokalne powiazania `button` / `binary input` -> `relay` / `shutter`
- `build`
  - wymagane biblioteki
  - docelowe srodowisko `*_gui_generic`
  - gotowe komendy `pio run`

## Mapowanie na SUPLA

- relay: `Supla::Control::LightRelay`
- LED stanu relay: `Supla::Control::InternalPinOutput`
- roleta: `Supla::Control::RollerShutter`
- button: `Supla::Control::Button`
- binary input / krańcówka: `Supla::Sensor::Binary`
- action trigger: `Supla::Control::ActionTrigger`
- DS18B20: `Supla::Sensor::DS18B20`
- DHT11 / DHT22: `Supla::Sensor::DHT`
- BME280: `Supla::Sensor::BME280`
- BMP280: `Supla::Sensor::BMP280`
- Si7021: `Supla::Sensor::Si7021`

## Uwagi projektowe

- `direct links` sa lokalnymi akcjami w stylu `addAction(...)` i nie wymagaja chmury.
- krańcówki sa modelowane jako `Binary Input` oraz lokalne akcje `STOP`.
- takie modelowanie krańcówek nie jest twardym odcieciem mocy silnika; to logika aplikacyjna na poziomie firmware.
- sensory I2C korzystaja ze wspolnej magistrali globalnej.
- wiele `DS18B20` moze dzielic jeden pin `OneWire`.
- dla `BK7231N / BK7231T / LibreTiny` sensory I2C sa gotowe w modelu buildera i generatorze, ale ich realne uzycie nadal zalezy od wsparcia `Wire.h` oraz odpowiednich bibliotek w aktywnym targetcie builda.
- wyeksportowany plik `active_profile.json` jest konsumowany przez srodowiska `cb3s_gui_generic` oraz `wb3s_gui_generic`.
