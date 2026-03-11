# Supla CD3S

Starter projektu firmware Supla dla modulow `CB3S` / `WB3S` z ukladem `BK7231N` / `BK7231T` oraz prostym builderem konfiguracji inspirowanym `gui-generic-builder.supla.io`.

Builder jest teraz zintegrowany z firmware lokalnie: eksportowany profil JSON moze byc bezposrednio zamieniony na kompilowany rejestr komponentow przez srodowiska `cb3s_gui_generic` i `wb3s_gui_generic`.

Instalacja na Linuxie: [linux-install.md](/home/langnet/Projekty/Supla_CD3S/docs/linux-install.md)

## Co jest w repo

- `web/` - statyczny builder konfiguracji i generator profilu urzadzenia
- `firmware/` - szkic warstwy firmware i modelu plyty
- `docs/` - notatki sprzetowe i zalozenia

## Wspierane bloki buildera

- relay i LED stanu relay
- rolety na dwoch relay
- przyciski monostable / bistable
- krańcówki i inne wejscia binarne
- sensory `DS18B20`
- sensory `DHT11` i `DHT22`
- sensory I2C `BME280`, `BMP280`, `Si7021`
- `Action Trigger`
- lokalne `direct links`
- modul zaworu `ATLO-V1-TUYA`

Uwaga: profile i generator firmware obejmuja sensory I2C, ale domyslny build `BK7231N/LibreTiny` w tym repo nie ma jeszcze gotowej warstwy `Wire.h` dla `beken-72xx`. Oznacza to, ze `BME280`, `BMP280` i `Si7021` sa juz czescia modelu projektu oraz generatora, ale ich uruchomienie w realnym firmware wymaga nastepnego kroku HAL/I2C.

## Zalozenia sprzetowe Tuya

- `CB3S`: `BK7231N`
- `WB3S`: `BK7231T`
- taktowanie: `120 MHz`
- flash: `2 MiB`
- RAM: `256 KiB`
- zasilanie: `3.0 V - 3.6 V`
- UART uzytkownika: `P10` / `P11`
- flash layout zgodny z Tuya `BK7231x`, z OTA od `0x12A000`

## Domyslne GPIO startera

- relay: `P24`
- status LED: zalezne od aktywnego profilu
- button: zalezne od aktywnego profilu
- LED stanu relay: zalezne od aktywnego profilu

Domyslne zachowanie przycisku:

- zalezne od aktywnego profilu i przypisanych pinow

## Runtime firmware

Firmware pracuje teraz w trybie recznego skladania ukladu:

- [main.cpp](/home/langnet/Projekty/Supla_CD3S/src/main.cpp) tylko uruchamia siec, LED statusu i SUPLA
- [board_config.h](/home/langnet/Projekty/Supla_CD3S/include/board_config.h) trzyma stale plyty i domyslne piny startowe
- [atlo_v1_tuya_wb3s_config.h](/home/langnet/Projekty/Supla_CD3S/include/atlo_v1_tuya_wb3s_config.h) trzyma aktywny profil pinow ATLO do recznej edycji
- [user_components.cpp](/home/langnet/Projekty/Supla_CD3S/src/user_components.cpp) to jedyne miejsce, w ktorym dodajesz komponenty

Domyslnie aktywny jest profil:

- `ATLO-V1-TUYA / WB3S`
- `P14` sterowanie napedem
- `P26` krańcówka `open`
- `P24` krańcówka `close`
- reszta pinow recznie ustawiana w `include/atlo_v1_tuya_wb3s_config.h`

W [user_components.cpp](/home/langnet/Projekty/Supla_CD3S/src/user_components.cpp) masz gotowe, zakomentowane wzorce dla:

- dodatkowych relay
- rolet i krańcówek
- wejsc binarnych
- modulu zaworu `ATLO-V1-TUYA`
- `DS18B20`
- `DHT11` i `DHT22`
- licznikow impulsow
- `direct links`
- `BME280`, `BMP280`, `Si7021`

## ATLO-V1-TUYA

Gotowy modul znajdziesz w:

- [atlo_v1_tuya_valve.h](/home/langnet/Projekty/Supla_CD3S/include/atlo_v1_tuya_valve.h)
- [atlo_v1_tuya_valve.cpp](/home/langnet/Projekty/Supla_CD3S/src/atlo_v1_tuya_valve.cpp)

Gotowy preset startowy dla `WB3S`:

- [MakeAtloV1TuyaWb3sStarterProfile](/home/langnet/Projekty/Supla_CD3S/src/atlo_v1_tuya_valve.cpp#L440)

Modul jest przygotowany pod siłownik zaworu z dwoma kierunkami sterowania silnikiem `open/close` i wspiera:

- kanal SUPLA typu `valve`
- dwa wyjscia silnika z blokada kierunkow
- albo jeden pin zasilajacy naped z krańcówkami, co pasuje do opisu `ATLO-V1-TUYA / WB3S`
- osobne czasy otwierania i zamykania
- opcjonalne krańcówki `open` / `close`
- flage `motor problem`, gdy krańcówka nie zostanie osiagnieta w czasie
- opcjonalny lokalny przycisk `toggle`
- opcjonalny `Action Trigger`
- opcjonalny czujnik zalania z automatycznym zamknieciem zaworu
- opcjonalny LED stanu zaworu

ATLO-V1-TUYA, o ktorym mowa w tym projekcie, uzywa modulu `WB3S`, wiec docelowy build powinien isc pod `BK7231T` / `wb3s`, a nie tylko pod `CB3S`.

Na podstawie podanego przez Ciebie opisu najbardziej prawdopodobny wariant startowy to:

- `P14` jako pojedynczy pin sterujacy napedem
- `P26` krańcówka `open`
- `P24` krańcówka `close`
- `P10/P11` zostawione dla flashowania UART
- `P0` traktowany jako UART diagnostyczny, wiec lepiej go nie zajmowac bez potrzeby

Wazne: to nadal jest sensowny profil startowy, a nie potwierdzony schemat konkretnej rewizji PCB. W [user_components.cpp](/home/langnet/Projekty/Supla_CD3S/src/user_components.cpp) jest gotowy, zakomentowany blok `AtloV1TuyaValveConfig` pod taki wariant, ale finalne GPIO warto jeszcze potwierdzic z Twojej sztuki.

Najprostszy start to:

```cpp
auto atloValve = ProjectModules::MakeAtloV1TuyaWb3sStarterProfile();
auto atloModule = ProjectModules::CreateAtloV1TuyaValveModule(atloValve);
```

Preset celowo nie wlacza domyslnie LED, przycisku ani czujnika zalania, bo te piny nie sa jeszcze potwierdzone.

Po tej zmianie aktywny runtime juz korzysta z tego wariantu jako domyslnego ukladu roboczego.
Ręczna zmiana pinow sterujacych odbywa sie przez:

- [atlo_v1_tuya_wb3s_config.h](/home/langnet/Projekty/Supla_CD3S/include/atlo_v1_tuya_wb3s_config.h)

Jesli trafisz na template z `GPIO12`, `GPIO13` albo `GPIO16`, traktuj go ostroznie. Taki zestaw nie pasuje do standardowego `WB3S/BK7231T`, wiec najpewniej dotyczy innego modulu Tuya i nie powinien byc bezposrednio przenoszony do tego projektu.

Praca wyglada teraz tak:

1. Otwierasz [atlo_v1_tuya_wb3s_config.h](/home/langnet/Projekty/Supla_CD3S/include/atlo_v1_tuya_wb3s_config.h) i ustawiasz piny aktywnego ukladu.
2. Otwierasz [user_components.cpp](/home/langnet/Projekty/Supla_CD3S/src/user_components.cpp), jesli chcesz dodac kolejne komponenty poza domyslnym ATLO.
3. W razie potrzeby poprawiasz stale ogolne w [board_config.h](/home/langnet/Projekty/Supla_CD3S/include/board_config.h).
4. Budujesz przez `pio run`.

Builder WWW nadal moze sluzyc do planowania GPIO i zaleznosci, ale realny firmware skladasz recznie w `src/user_components.cpp`.

## Integracja z gui-generic style builder

Masz teraz dwa rownolegle tryby pracy:

1. `manual` - aktywny profil ATLO i reczne dopisywanie elementow w [user_components.cpp](/home/langnet/Projekty/Supla_CD3S/src/user_components.cpp)
2. `gui_generic` - builder `web/` eksportuje profil JSON, a PlatformIO generuje z niego kompilowany rejestr komponentow

Przeplyw dla buildera:

1. Otwierasz [web/index.html](/home/langnet/Projekty/Supla_CD3S/web/index.html).
2. Klikasz `Eksportuj profil JSON`.
3. Zapisujesz plik jako `profiles/active_profile.json`.
4. Budujesz przez:

```sh
pio run -e wb3s_gui_generic
```

albo:

```sh
pio run -e cb3s_gui_generic
```

Podczas buildu skrypt [profile_codegen.py](/home/langnet/Projekty/Supla_CD3S/tools/profile_codegen.py) tworzy lokalny, ignorowany przez git plik [generated_profile_data.h](/home/langnet/Projekty/Supla_CD3S/include/generated_profile_data.h), a runtime przelacza sie z recznego ATLO na wygenerowany profil.

Jesli `profiles/active_profile.json` nie istnieje, srodowiska `*_gui_generic` automatycznie wracaja do manualnego fallbacku.

Szczegoly i zrodla: [docs/hardware-notes.md](/home/langnet/Projekty/Supla_CD3S/docs/hardware-notes.md)

Schema profilu buildera i mapowanie na klasy SUPLA: [device-profile-schema.md](/home/langnet/Projekty/Supla_CD3S/docs/device-profile-schema.md)

## Szybki start

Otworz [web/index.html](/home/langnet/Projekty/Supla_CD3S/web/index.html) w przegladarce albo uruchom prosty serwer HTTP w katalogu `web/`.

Symulacja firmware:

```sh
make -C firmware
./firmware/build/supla_cb3s_sim
```

## Nastepne kroki

1. Podpiac prawdziwy SDK/toolchain dla `BK7231N` zamiast symulacji hostowej.
2. Dodac warstwe HAL dla GPIO, relay, button, LED i Wi-Fi provisioning.
3. Rozszerzyc generator buildera o pelny model modulu zaworu `ATLO-V1-TUYA`.
