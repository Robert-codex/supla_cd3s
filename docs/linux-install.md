# Linux Install

Poniżej masz gotowe polecenia dla systemow Debian-like oraz Fedora / Red Hat-like, z naciskiem na uruchomienie lokalnego buildera `gui-generic`, PlatformIO i buildow `cb3s_gui_generic` / `wb3s_gui_generic`.

## Debian / Ubuntu / Mint / Pop!_OS

```sh
sudo apt update
sudo apt install -y \
  git curl ca-certificates \
  python3 python3-pip python3-venv python3-dev \
  pipx build-essential
pipx ensurepath
pipx install platformio
```

Opcjonalnie, jesli chcesz lokalnie serwowac builder WWW:

```sh
cd /sciezka/do/Supla_CD3S/web
python3 -m http.server 8000
```

Typowy dostep do UART:

```sh
ls -l /dev/ttyUSB0 /dev/ttyACM0 2>/dev/null
sudo usermod -aG dialout "$USER"
```

Po dodaniu do grupy wyloguj sie i zaloguj ponownie.

## Fedora

```sh
sudo dnf upgrade --refresh -y
sudo dnf install -y \
  git curl ca-certificates \
  python3 python3-pip python3-devel \
  pipx gcc gcc-c++ make
pipx ensurepath
pipx install platformio
```

Opcjonalnie, lokalny serwer dla buildera WWW:

```sh
cd /sciezka/do/Supla_CD3S/web
python3 -m http.server 8000
```

Dostep do UART sprawdz tak:

```sh
ls -l /dev/ttyUSB0 /dev/ttyACM0 2>/dev/null
```

Nastepnie dodaj uzytkownika do grupy widocznej przy porcie szeregowym, najczesciej:

```sh
sudo usermod -aG dialout "$USER"
```

Jesli na Twoim systemie port nalezy do innej grupy, podstaw ja zamiast `dialout`.

## Klon i pierwszy start projektu

```sh
git clone <twoje_repo_lub_katalog> Supla_CD3S
cd Supla_CD3S
```

Builder WWW:

```sh
cd web
python3 -m http.server 8000
```

W przegladarce otwierasz:

```text
http://127.0.0.1:8000
```

## Build gui-generic

Po eksporcie buildera zapisz plik jako:

```text
profiles/active_profile.json
```

Build dla `WB3S / BK7231T`:

```sh
pio run -e wb3s_gui_generic
```

Build dla `CB3S / BK7231N`:

```sh
pio run -e cb3s_gui_generic
```

Upload:

```sh
pio run -e wb3s_gui_generic -t upload --upload-port /dev/ttyUSB0
```

Monitor:

```sh
pio device monitor -b 115200 -p /dev/ttyUSB0
```
