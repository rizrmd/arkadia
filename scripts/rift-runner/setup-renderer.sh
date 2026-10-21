#!/bin/sh
set -eu
uv python install cpython-3.11-linux-x86_64-gnu
RIFT_PYTHON=$(uv python find cpython-3.11-linux-x86_64-gnu)
uv venv --python "$RIFT_PYTHON" "$HOME/.local/rift-render-gnu"
uv pip install --python "$HOME/.local/rift-render-gnu/bin/python" --python-platform x86_64-manylinux_2_28 bpy==4.5.3
python3 scripts/rift-runner/setup-render-deps.py libsm6 libice6 libgomp1 libgl1 libegl1 libglx0 libglvnd0 libopengl0 libxxf86vm1
