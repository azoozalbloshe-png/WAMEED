#!/usr/bin/env bash
set -euo pipefail
backend_dir="$(cd -- "$(dirname -- "$0")" && pwd)"
cd "$backend_dir"
exec "$backend_dir/../.venv/bin/python" run_server.py
