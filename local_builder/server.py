#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import signal
import shutil
import subprocess
import threading
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

try:
    from serial.tools import list_ports as serial_list_ports
except ImportError:
    serial_list_ports = None

ROOT_DIR = Path(__file__).resolve().parent.parent
WEB_DIR = ROOT_DIR / "web"
DATA_DIR = ROOT_DIR / "local_builder" / "data"
BUILDS_DIR = DATA_DIR / "builds"
WORK_DIR = DATA_DIR / "work"
STATE_LOCK = threading.Lock()
MONITOR_LOG_PATH = DATA_DIR / "monitor.log"


class MonitorSession:
    def __init__(self) -> None:
        self.process: subprocess.Popen[bytes] | None = None
        self.port: str = ""
        self.baud: int = 115200
        self.started_at: float = 0.0
        self.updated_at: float = 0.0
        self.status: str = "stopped"
        self.error: str = ""


MONITOR_SESSION = MonitorSession()


def ensure_dirs() -> None:
    for path in (DATA_DIR, BUILDS_DIR, WORK_DIR):
        path.mkdir(parents=True, exist_ok=True)


def json_response(handler: BaseHTTPRequestHandler, status: int, payload: Any) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    if handler.command != "HEAD":
        handler.wfile.write(body)


def text_response(handler: BaseHTTPRequestHandler, status: int, payload: str) -> None:
    body = payload.encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "text/plain; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    if handler.command != "HEAD":
        handler.wfile.write(body)


def guess_mime(path: Path) -> str:
    if path.suffix == ".html":
        return "text/html; charset=utf-8"
    if path.suffix == ".css":
        return "text/css; charset=utf-8"
    if path.suffix == ".js":
        return "application/javascript; charset=utf-8"
    if path.suffix == ".json":
        return "application/json; charset=utf-8"
    if path.suffix == ".bin":
        return "application/octet-stream"
    if path.suffix == ".uf2":
        return "application/octet-stream"
    if path.suffix == ".map":
        return "text/plain; charset=utf-8"
    if path.suffix == ".elf":
        return "application/octet-stream"
    if path.suffix == ".log":
        return "text/plain; charset=utf-8"
    return "application/octet-stream"


def load_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def run_git_output(*args: str) -> str:
    try:
        completed = subprocess.run(
            ["git", *args],
            cwd=str(ROOT_DIR),
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            timeout=3,
        )
    except (OSError, subprocess.SubprocessError):
        return ""
    return completed.stdout.decode("utf-8", errors="replace").strip()


def source_signature() -> str:
    head = run_git_output("rev-parse", "HEAD")
    dirty = run_git_output("status", "--porcelain", "--", "web", "tools", "platformio.ini", "src", "include")
    return f"head={head or 'none'}|dirty={hashlib.sha1(dirty.encode('utf-8')).hexdigest() if dirty else 'clean'}"


def discover_platformio_executable() -> str | None:
    override = os.environ.get("PLATFORMIO_CMD", "").strip()
    if override:
        return override
    candidates = (
        ROOT_DIR / ".venv" / "bin" / "platformio",
        ROOT_DIR / ".venv" / "bin" / "pio",
    )
    for candidate in candidates:
        if candidate.exists():
            return str(candidate)
    for name in ("platformio", "pio"):
        resolved = shutil.which(name)
        if resolved:
            return resolved
    return None


def parse_env_names() -> list[str]:
    platformio_ini = ROOT_DIR / "platformio.ini"
    envs: list[str] = []
    for line in platformio_ini.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped.startswith("[env:") and stripped.endswith("]"):
            envs.append(stripped[5:-1])
    return envs


def list_serial_ports() -> list[dict[str, str]]:
    ports: list[dict[str, str]] = []
    seen: set[str] = set()
    if serial_list_ports is not None:
        for port in sorted(serial_list_ports.comports(), key=lambda item: item.device):
            if not port.device or port.device in seen:
                continue
            if not is_usb_uart_port(port.device, port.description or "", getattr(port, "hwid", "")):
                continue
            seen.add(port.device)
            label = port.device
            if port.description and port.description != "n/a":
                label = f"{label} | {port.description}"
            ports.append({"path": port.device, "label": label})
    for pattern in ("/dev/ttyUSB*", "/dev/ttyACM*"):
        for entry in sorted(Path("/").glob(pattern.lstrip("/")), key=lambda item: str(item)):
            path = str(entry)
            if path in seen:
                continue
            seen.add(path)
            ports.append({"path": path, "label": path})
    return ports


def is_usb_uart_port(path: str, description: str, hwid: str) -> bool:
    normalized_path = path.lower()
    normalized_desc = description.lower()
    normalized_hwid = hwid.lower()
    if any(token in normalized_path for token in ("ttyusb", "ttyacm", "cu.usb", "tty.usb")):
        return True
    usb_markers = (
        "usb",
        "uart",
        "serial",
        "ch340",
        "cp210",
        "ftdi",
        "pl2303",
        "usb-serial",
        "ttl",
    )
    haystack = f"{normalized_desc} {normalized_hwid}"
    return any(marker in haystack for marker in usb_markers)


def list_build_artifacts(build_hash: str) -> list[dict[str, str]]:
    build_dir = BUILDS_DIR / build_hash
    metadata = load_json(build_dir / "metadata.json", {})
    return metadata.get("artifacts", [])


@dataclass
class BuildRequest:
    env: str
    profile_payload: dict[str, Any]
    custom_name: str = ""
    force_rebuild: bool = False
    source_sig: str = ""
    hash: str = ""

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> "BuildRequest":
        request = cls(
            env=str(payload.get("env", "")).strip(),
            profile_payload=payload.get("profile_payload", {}) if isinstance(payload.get("profile_payload", {}), dict) else {},
            custom_name=str(payload.get("custom_name", "")).strip(),
            force_rebuild=bool(payload.get("force_rebuild", False)),
            source_sig=source_signature(),
        )
        request.hash = request.compute_hash()
        return request

    def compute_hash(self) -> str:
        canonical = json.dumps(
            {
                "env": self.env,
                "profile_payload": self.profile_payload,
                "custom_name": self.custom_name,
                "source_sig": self.source_sig,
            },
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        return hashlib.md5(canonical.encode("utf-8")).hexdigest()


@dataclass
class BuildMetadata:
    hash: str
    status: str
    created_at: float
    updated_at: float
    env: str
    custom_name: str
    source_signature: str
    profile_name: str
    build_system: str = "supla_cd3s"
    artifacts: list[dict[str, str]] = field(default_factory=list)
    preferred_artifact: dict[str, str] = field(default_factory=dict)
    log_path: str = ""
    error: str = ""
    platformio_cmd: str = ""
    upload_status: str = ""
    upload_port: str = ""
    upload_log_path: str = ""
    upload_error: str = ""
    upload_updated_at: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["created_at_iso"] = datetime.fromtimestamp(self.created_at).isoformat()
        payload["updated_at_iso"] = datetime.fromtimestamp(self.updated_at).isoformat()
        return payload


class BuildManager:
    def __init__(self) -> None:
        self.platformio_cmd = discover_platformio_executable()

    def config_payload(self) -> dict[str, Any]:
        envs = parse_env_names()
        generated_envs = [env for env in envs if env.endswith("_gui_generic")]
        manual_envs = [env for env in envs if env not in generated_envs]
        return {
            "build_system": "supla_cd3s",
            "project_dir": str(ROOT_DIR),
            "envs": envs,
            "generated_envs": generated_envs,
            "manual_envs": manual_envs,
            "default_env": generated_envs[0] if generated_envs else (envs[0] if envs else ""),
            "platformio_cmd": self.platformio_cmd or "",
            "serial_ports": list_serial_ports(),
        }

    def load_metadata(self, build_hash: str) -> BuildMetadata | None:
        payload = load_json(BUILDS_DIR / build_hash / "metadata.json", None)
        if not payload:
            return None
        return BuildMetadata(**payload)

    def save_metadata(self, metadata: BuildMetadata) -> None:
        build_dir = BUILDS_DIR / metadata.hash
        build_dir.mkdir(parents=True, exist_ok=True)
        save_json(build_dir / "metadata.json", asdict(metadata))

    def list_history(self) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        for meta_file in BUILDS_DIR.glob("*/metadata.json"):
            payload = load_json(meta_file, None)
            if not payload:
                continue
            metadata = BuildMetadata(**payload)
            items.append(metadata.to_dict())
        items.sort(key=lambda item: item["updated_at"], reverse=True)
        return items[:20]

    def validate_request(self, request: BuildRequest) -> str:
        if not request.env:
            return "Brak wybranego srodowiska builda."
        if request.env not in parse_env_names():
            return f"Nieznane srodowisko builda: {request.env}."
        if not request.env.endswith("_gui_generic"):
            return "Lokalny builder obsluguje tylko srodowiska *_gui_generic."
        if not request.profile_payload:
            return "Brak profilu buildera do kompilacji."
        return ""

    def enqueue(self, request: BuildRequest) -> BuildMetadata:
        now = time.time()
        existing = self.load_metadata(request.hash)
        if existing and not request.force_rebuild and existing.status == "completed" and existing.artifacts:
            return existing

        metadata = BuildMetadata(
            hash=request.hash,
            status="queued",
            created_at=existing.created_at if existing else now,
            updated_at=now,
            env=request.env,
            custom_name=request.custom_name,
            source_signature=request.source_sig,
            profile_name=str(request.profile_payload.get("metadata", {}).get("name", "")),
            platformio_cmd=self.platformio_cmd or "",
        )
        self.save_metadata(metadata)
        thread = threading.Thread(target=self._run_build, args=(request,), daemon=True)
        thread.start()
        return metadata

    def _run_build(self, request: BuildRequest) -> None:
        metadata = self.load_metadata(request.hash)
        if metadata is None:
            return

        if not self.platformio_cmd:
            metadata.status = "failed"
            metadata.updated_at = time.time()
            metadata.error = "Nie znaleziono polecenia platformio/pio."
            self.save_metadata(metadata)
            return

        work_dir = WORK_DIR / request.hash
        build_dir = BUILDS_DIR / request.hash
        log_path = build_dir / "build.log"
        metadata.status = "building"
        metadata.updated_at = time.time()
        metadata.log_path = str(log_path.relative_to(ROOT_DIR))
        metadata.error = ""
        metadata.artifacts = []
        metadata.preferred_artifact = {}
        metadata.upload_status = ""
        metadata.upload_error = ""
        metadata.upload_port = ""
        metadata.upload_log_path = ""
        metadata.upload_updated_at = 0.0
        self.save_metadata(metadata)

        try:
            if work_dir.exists():
                shutil.rmtree(work_dir)
            shutil.copytree(
                ROOT_DIR,
                work_dir,
                ignore=shutil.ignore_patterns(
                    ".git",
                    ".pio",
                    ".venv",
                    "__pycache__",
                    "*.pyc",
                    "local_builder/data",
                ),
            )
            profiles_dir = work_dir / "profiles"
            profiles_dir.mkdir(parents=True, exist_ok=True)
            save_json(profiles_dir / "active_profile.json", request.profile_payload)

            with log_path.open("w", encoding="utf-8") as log_file:
                completed = subprocess.run(
                    [self.platformio_cmd, "run", "-e", request.env],
                    cwd=str(work_dir),
                    stdout=log_file,
                    stderr=subprocess.STDOUT,
                    check=False,
                )

            if completed.returncode != 0:
                metadata.status = "failed"
                metadata.updated_at = time.time()
                metadata.error = f"Build zakonczyl sie kodem {completed.returncode}."
                self.save_metadata(metadata)
                return

            artifacts = self._collect_artifacts(request.hash, request.env, work_dir)
            metadata.artifacts = artifacts
            metadata.preferred_artifact = self._select_preferred_artifact(artifacts)
            metadata.status = "completed"
            metadata.updated_at = time.time()
            self.save_metadata(metadata)
        except Exception as exc:  # noqa: BLE001
            metadata.status = "failed"
            metadata.updated_at = time.time()
            metadata.error = str(exc)
            self.save_metadata(metadata)

    def _collect_artifacts(self, build_hash: str, env: str, work_dir: Path) -> list[dict[str, str]]:
        env_dir = work_dir / ".pio" / "build" / env
        if not env_dir.exists():
            return []

        build_out_dir = BUILDS_DIR / build_hash / "artifacts"
        build_out_dir.mkdir(parents=True, exist_ok=True)

        artifacts: list[dict[str, str]] = []
        patterns = ("*.bin", "*.uf2", "*.elf", "*.map")
        for pattern in patterns:
            for source in sorted(env_dir.glob(pattern), key=lambda item: item.name):
                target = build_out_dir / source.name
                shutil.copy2(source, target)
                artifacts.append(
                    {
                        "name": source.name,
                        "path": str(target.relative_to(ROOT_DIR)),
                        "url": f"/artifacts/{build_hash}/{source.name}",
                        "role": self._artifact_role(source),
                    }
                )
        return artifacts

    def _artifact_role(self, path: Path) -> str:
        name = path.name.lower()
        if name == "firmware.bin":
            return "flash"
        if name.endswith(".uf2"):
            return "flash"
        if "ota" in name and name.endswith(".bin"):
            return "ota"
        if name.endswith(".elf"):
            return "elf"
        if name.endswith(".map"):
            return "map"
        if name.endswith(".bin"):
            return "binary"
        return "other"

    def _select_preferred_artifact(self, artifacts: list[dict[str, str]]) -> dict[str, str]:
        if not artifacts:
            return {}
        role_priority = {"flash": 0, "ota": 1, "binary": 2, "elf": 3, "map": 4, "other": 5}
        ordered = sorted(
            artifacts,
            key=lambda item: (role_priority.get(item.get("role", "other"), 9), item.get("name", "")),
        )
        return ordered[0]

    def upload(self, build_hash: str, upload_port: str) -> BuildMetadata:
        metadata = self.load_metadata(build_hash)
        if metadata is None:
            raise ValueError("Build nie istnieje.")
        if metadata.status != "completed":
            raise ValueError("Upload wymaga zakonczonego builda.")
        if not upload_port:
            raise ValueError("Brak portu uploadu.")
        if not self.platformio_cmd:
            raise ValueError("Nie znaleziono polecenia platformio/pio.")

        metadata.upload_status = "queued"
        metadata.upload_port = upload_port
        metadata.upload_error = ""
        metadata.upload_updated_at = time.time()
        upload_log_path = BUILDS_DIR / build_hash / "upload.log"
        metadata.upload_log_path = str(upload_log_path.relative_to(ROOT_DIR))
        self.save_metadata(metadata)

        thread = threading.Thread(
            target=self._run_upload,
            args=(build_hash, upload_port),
            daemon=True,
        )
        thread.start()
        return metadata

    def _run_upload(self, build_hash: str, upload_port: str) -> None:
        metadata = self.load_metadata(build_hash)
        if metadata is None:
            return
        work_dir = WORK_DIR / build_hash
        upload_log = ROOT_DIR / metadata.upload_log_path if metadata.upload_log_path else BUILDS_DIR / build_hash / "upload.log"
        if not work_dir.exists():
            metadata.upload_status = "failed"
            metadata.upload_error = "Brak workspace builda. Zrob build ponownie przed uploadem."
            metadata.upload_updated_at = time.time()
            self.save_metadata(metadata)
            return

        metadata.upload_status = "uploading"
        metadata.upload_updated_at = time.time()
        self.save_metadata(metadata)

        try:
            with upload_log.open("w", encoding="utf-8") as log_file:
                completed = subprocess.run(
                    [
                        self.platformio_cmd,
                        "run",
                        "-e",
                        metadata.env,
                        "-t",
                        "upload",
                        "--upload-port",
                        upload_port,
                    ],
                    cwd=str(work_dir),
                    stdout=log_file,
                    stderr=subprocess.STDOUT,
                    check=False,
                )

            metadata.upload_updated_at = time.time()
            if completed.returncode != 0:
                metadata.upload_status = "failed"
                metadata.upload_error = f"Upload zakonczyl sie kodem {completed.returncode}."
            else:
                metadata.upload_status = "completed"
                metadata.upload_error = ""
            self.save_metadata(metadata)
        except Exception as exc:  # noqa: BLE001
            metadata.upload_status = "failed"
            metadata.upload_error = str(exc)
            metadata.upload_updated_at = time.time()
            self.save_metadata(metadata)

    def monitor_status(self) -> dict[str, Any]:
        with STATE_LOCK:
            status = MONITOR_SESSION.status
            if MONITOR_SESSION.process is not None and MONITOR_SESSION.process.poll() is not None:
                if status == "running":
                    MONITOR_SESSION.status = "stopped"
                    MONITOR_SESSION.updated_at = time.time()
                    if MONITOR_SESSION.process.returncode not in (0, -signal.SIGTERM, 143):
                        MONITOR_SESSION.error = f"Monitor zakonczyl sie kodem {MONITOR_SESSION.process.returncode}."
                MONITOR_SESSION.process = None
            return {
                "status": MONITOR_SESSION.status,
                "port": MONITOR_SESSION.port,
                "baud": MONITOR_SESSION.baud,
                "started_at": MONITOR_SESSION.started_at,
                "updated_at": MONITOR_SESSION.updated_at,
                "started_at_iso": datetime.fromtimestamp(MONITOR_SESSION.started_at).isoformat() if MONITOR_SESSION.started_at else "",
                "updated_at_iso": datetime.fromtimestamp(MONITOR_SESSION.updated_at).isoformat() if MONITOR_SESSION.updated_at else "",
                "error": MONITOR_SESSION.error,
                "log_tail": tail_text(MONITOR_LOG_PATH, 8000) if MONITOR_LOG_PATH.exists() else "",
            }

    def start_monitor(self, port: str, baud: int) -> dict[str, Any]:
        if not port:
            raise ValueError("Brak portu monitora.")
        if not self.platformio_cmd:
            raise ValueError("Nie znaleziono polecenia platformio/pio.")
        with STATE_LOCK:
            if MONITOR_SESSION.process is not None and MONITOR_SESSION.process.poll() is None:
                self._stop_monitor_locked()
            MONITOR_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
            with MONITOR_LOG_PATH.open("w", encoding="utf-8") as log_file:
                log_file.write(f"[monitor] starting on {port} @ {baud}\n")
            log_handle = MONITOR_LOG_PATH.open("ab")
            process = subprocess.Popen(
                [self.platformio_cmd, "device", "monitor", "-b", str(baud), "-p", port],
                cwd=str(ROOT_DIR),
                stdout=log_handle,
                stderr=subprocess.STDOUT,
            )
            MONITOR_SESSION.process = process
            MONITOR_SESSION.port = port
            MONITOR_SESSION.baud = baud
            MONITOR_SESSION.started_at = time.time()
            MONITOR_SESSION.updated_at = MONITOR_SESSION.started_at
            MONITOR_SESSION.status = "running"
            MONITOR_SESSION.error = ""
        return self.monitor_status()

    def stop_monitor(self) -> dict[str, Any]:
        with STATE_LOCK:
            self._stop_monitor_locked()
        return self.monitor_status()

    def _stop_monitor_locked(self) -> None:
        process = MONITOR_SESSION.process
        MONITOR_SESSION.updated_at = time.time()
        if process is None:
            MONITOR_SESSION.status = "stopped"
            return
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait(timeout=3)
        MONITOR_SESSION.process = None
        MONITOR_SESSION.status = "stopped"


BUILD_MANAGER = BuildManager()


class BuilderHandler(BaseHTTPRequestHandler):
    def _serve_file(self, path: Path) -> None:
        if not path.exists() or not path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND)
            return
        body = path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", guess_mime(path))
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/api/config":
            json_response(self, HTTPStatus.OK, BUILD_MANAGER.config_payload())
            return
        if parsed.path == "/api/monitor":
            json_response(self, HTTPStatus.OK, BUILD_MANAGER.monitor_status())
            return
        if parsed.path == "/api/history":
            json_response(self, HTTPStatus.OK, {"items": BUILD_MANAGER.list_history()})
            return
        if parsed.path == "/api/serial-ports":
            json_response(self, HTTPStatus.OK, {"items": list_serial_ports()})
            return
        if parsed.path.startswith("/api/builds/"):
            build_hash = parsed.path.removeprefix("/api/builds/").strip("/")
            metadata = BUILD_MANAGER.load_metadata(build_hash)
            if metadata is None:
                json_response(self, HTTPStatus.NOT_FOUND, {"error": "Build nie istnieje."})
                return
            payload = metadata.to_dict()
            log_file = ROOT_DIR / metadata.log_path if metadata.log_path else None
            if log_file and log_file.exists():
                payload["log_tail"] = tail_text(log_file, 8000)
            else:
                payload["log_tail"] = ""
            upload_log_file = ROOT_DIR / metadata.upload_log_path if metadata.upload_log_path else None
            if upload_log_file and upload_log_file.exists():
                payload["upload_log_tail"] = tail_text(upload_log_file, 8000)
            else:
                payload["upload_log_tail"] = ""
            json_response(self, HTTPStatus.OK, payload)
            return
        if parsed.path.startswith("/artifacts/"):
            rel = parsed.path.removeprefix("/artifacts/").strip("/")
            path = BUILDS_DIR / rel
            self._serve_file(path)
            return
        if parsed.path == "/favicon.ico":
            self.send_response(HTTPStatus.NO_CONTENT)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if parsed.path == "/" or parsed.path == "":
            self._serve_file(WEB_DIR / "index.html")
            return
        asset_path = (WEB_DIR / parsed.path.lstrip("/")).resolve()
        if WEB_DIR.resolve() not in asset_path.parents and asset_path != WEB_DIR.resolve():
            self.send_error(HTTPStatus.FORBIDDEN)
            return
        self._serve_file(asset_path)

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path not in {"/api/build", "/api/upload", "/api/monitor/start", "/api/monitor/stop"}:
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            json_response(self, HTTPStatus.BAD_REQUEST, {"error": "Niepoprawny Content-Length."})
            return

        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except json.JSONDecodeError:
            json_response(self, HTTPStatus.BAD_REQUEST, {"error": "Payload musi byc JSON-em."})
            return

        if parsed.path == "/api/build":
            request = BuildRequest.from_payload(payload)
            error = BUILD_MANAGER.validate_request(request)
            if error:
                json_response(self, HTTPStatus.BAD_REQUEST, {"error": error})
                return

            metadata = BUILD_MANAGER.enqueue(request)
            json_response(self, HTTPStatus.ACCEPTED, metadata.to_dict())
            return

        if parsed.path == "/api/monitor/start":
            port = str(payload.get("port", "")).strip()
            try:
                baud = int(payload.get("baud", 115200))
            except (TypeError, ValueError):
                json_response(self, HTTPStatus.BAD_REQUEST, {"error": "Niepoprawny baud rate."})
                return
            try:
                monitor = BUILD_MANAGER.start_monitor(port, baud)
            except ValueError as exc:
                json_response(self, HTTPStatus.BAD_REQUEST, {"error": str(exc)})
                return
            json_response(self, HTTPStatus.ACCEPTED, monitor)
            return

        if parsed.path == "/api/monitor/stop":
            json_response(self, HTTPStatus.OK, BUILD_MANAGER.stop_monitor())
            return

        build_hash = str(payload.get("build_hash", "")).strip()
        upload_port = str(payload.get("upload_port", "")).strip()
        try:
            metadata = BUILD_MANAGER.upload(build_hash, upload_port)
        except ValueError as exc:
            json_response(self, HTTPStatus.BAD_REQUEST, {"error": str(exc)})
            return
        json_response(self, HTTPStatus.ACCEPTED, metadata.to_dict())

    def do_HEAD(self) -> None:  # noqa: N802
        self.do_GET()


def tail_text(path: Path, max_chars: int) -> str:
    text = path.read_text(encoding="utf-8", errors="replace")
    if len(text) <= max_chars:
        return text
    return text[-max_chars:]


def main() -> None:
    parser = argparse.ArgumentParser(description="Supla CD3S local builder")
    parser.add_argument("--host", default=os.environ.get("LOCAL_BUILDER_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("LOCAL_BUILDER_PORT", "8182")))
    args = parser.parse_args()

    ensure_dirs()
    server = ThreadingHTTPServer((args.host, args.port), BuilderHandler)
    print(f"Supla CD3S builder: http://{args.host}:{args.port}/")
    server.serve_forever()


if __name__ == "__main__":
    main()
