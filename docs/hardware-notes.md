# Hardware Notes: BK7231N / CB3S

Projekt opiera sie na publicznie dostepnej dokumentacji producenta ukladu i modulu.

## Kluczowe parametry

- `BK7231N`: Wi-Fi `802.11 b/g/n`, BLE `5.2`, MCU do `120 MHz`, `256 KB` RAM, `2 MB` lub `4 MB` flash.
- `CB3S`: modul oparty o `BK7231N`, `2 MiB` flash, `256 KiB` RAM, `3.0-3.6 V`, PCB antenna.
- Dla `CB3S` typowy layout flash ma:
  - bootloader `0x000000-0x011000`
  - app `0x011000-0x12A000`
  - OTA `0x12A000-0x1D0000`

## Piny istotne dla projektu

- UART uzytkownika: `P10` (`RXD1`), `P11` (`TXD1`)
- PWM: `P6`, `P7`, `P8`, `P9`, `P24`, `P26`
- ADC: `P23`
- Piny oznaczone jako problematyczne lub zarezerwowane przez producenta:
  - `P20`, `P22`, `P23` jako piny zwiazane z flashowaniem
  - `CSN/P21` nie moze byc trzymany nisko przed startem
  - `TXD2/P0` sluzy do logow modulu

## Wnioski projektowe

- Konfigurator powinien domyslnie proponowac bezpieczne GPIO, a piny flashowania oznaczyc ostrzezeniem.
- Potrzebny jest osobny profil dla `CB3S`, a nie ogolny `BK7231N`, bo modul ma konkretne ograniczenia pinow i layout flash.
- OTA trzeba planowac od poczatku, bo partycja `download` jest juz przewidziana w standardowym ukladzie flash.

## Zrodla

- Beken BK7231N product page: https://www.bekencorp.com/en/goods/detail/cid/39.html
- Tuya CB3S datasheet: https://developer.tuya.com/cn/docs/iot/cb3s?id=Kai94mec0s076
- LibreTiny CB3S board page: https://docs.libretiny.eu/boards/cb3s/
