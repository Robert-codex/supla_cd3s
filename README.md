# Supla CD3S

Starter projektu firmware Supla dla modulow `CB3S` / `WB3S` z ukladem `BK7231N` / `BK7231T` oraz prostym builderem konfiguracji inspirowanym `gui-generic-builder.supla.io`.

Builder jest teraz zintegrowany z firmware lokalnie: eksportowany profil JSON moze byc bezposrednio zamieniony na kompilowany rejestr komponentow przez srodowiska `cb3s_gui_generic` i `wb3s_gui_generic`.

Repo ma teraz tez osobny lokalny builder HTTP dla `Supla_CD3S`, niezalezny od architektury `GUI-Generic/ESP`. Serwuje on UI z katalogu `web/`, przyjmuje profil JSON z formularza i uruchamia build `PlatformIO` bezposrednio w tym repo.

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

## Lokalny builder HTTP

Mozesz uruchomic osobny builder dla tego repo:

```sh
./scripts/run_local_builder.sh
```

Domyslny adres:

```text
http://127.0.0.1:8182/
```

Builder:

- serwuje istniejacy frontend z `web/`
- wysyla aktualny profil bezposrednio do lokalnego API
- zapisuje go jako `profiles/active_profile.json` w workspace builda
- kompiluje tylko srodowiska `*_gui_generic`
- zapisuje artefakty i logi w `local_builder/data/`

Jesli w systemie nie ma `platformio` / `pio`, panel builda pokaze odpowiedni komunikat diagnostyczny.

Dostep po LAN jest mozliwy. Wystarczy wystawic serwer na wszystkich interfejsach:

```sh
LOCAL_BUILDER_HOST=0.0.0.0 LOCAL_BUILDER_PORT=8182 ./scripts/run_local_builder.sh
```

Wtedy builder bedzie dostepny z innych urzadzen w sieci pod adresem:

```text
http://IP_TWOJEGO_HOSTA:8182/
```

Pamietaj, ze upload UART i monitor portu szeregowego nadal wykonuje host, na ktorym fizycznie podlaczony jest modul.

## Uklad bez konfliktu z `builder.regnal.eu`

Najrozsadniejszy uklad na tej samej maszynie to:

- zostawic obecny builder SUPLA/ESP pod `builder.regnal.eu`
- ten builder `Supla_CD3S` uruchamiac na osobnym porcie `127.0.0.1:8182`
- wystawic go przez osobny hostname, np. `cd3s-builder.regnal.eu`

Finalny publiczny adres tego buildera:

```text
https://cd3s-builder.regnal.eu
```

Gotowe pliki w repo:

- usluga buildera: [supla_cd3s_builder.service](/home/langnet/Projekty/Supla_CD3S/scripts/supla_cd3s_builder.service)
- przykladowy config tunelu: [cloudflared-cd3s-builder.yml.example](/home/langnet/Projekty/Supla_CD3S/scripts/cloudflared-cd3s-builder.yml.example)
- przykladowa usluga `cloudflared`: [cloudflared-cd3s-builder.service.example](/home/langnet/Projekty/Supla_CD3S/scripts/cloudflared-cd3s-builder.service.example)

Docelowy podzial:

- `builder.regnal.eu` -> stary builder ESP/SUPLA
- `cd3s-builder.regnal.eu` -> ten builder `Supla_CD3S`

## Wdrozenie na tej maszynie

Adres LAN hosta w tej chwili:

```text
192.168.2.119
```

Lokalny start bez tunelu:

```sh
LOCAL_BUILDER_HOST=127.0.0.1 LOCAL_BUILDER_PORT=8182 ./scripts/run_local_builder.sh
```

Lokalny test po LAN:

```sh
LOCAL_BUILDER_HOST=0.0.0.0 LOCAL_BUILDER_PORT=8182 ./scripts/run_local_builder.sh
```

Wtedy builder bedzie dostepny pod:

```text
http://192.168.2.119:8182/
```

Docelowe wdrozenie bez konfliktu z obecnym tunelem:

1. Skopiuj usluge buildera:

```sh
sudo cp scripts/supla_cd3s_builder.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now supla_cd3s_builder.service
```

2. Skopiuj przyklad configu tunelu i uzupelnij:

```sh
cp scripts/cloudflared-cd3s-builder.yml.example scripts/cloudflared-cd3s-builder.yml
```

Ustaw w nim prawidlowy `credentials-file` i zostaw hostname:

```text
cd3s-builder.regnal.eu
```

3. Skopiuj przyklad uslugi `cloudflared` i popraw sciezke configu:

```sh
sudo cp scripts/cloudflared-cd3s-builder.service.example /etc/systemd/system/cloudflared-cd3s-builder.service
sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared-cd3s-builder.service
```

4. W Cloudflare DNS/Zero Trust dodaj rekord lub route dla:

```text
cd3s-builder.regnal.eu
```

Ten builder nie powinien uzywac tego samego hostname co `builder.regnal.eu`.

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
