#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOST="${LOCAL_BUILDER_HOST:-127.0.0.1}"
PORT="${LOCAL_BUILDER_PORT:-8182}"

cd "${ROOT_DIR}"
exec python3 -m local_builder.server --host "${HOST}" --port "${PORT}"
