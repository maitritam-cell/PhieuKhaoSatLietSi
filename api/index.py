# Vercel Python entrypoint shim.
# The application itself is implemented in server.js.
# This file exists so Vercel's Python runtime detector has a valid entrypoint.
from typing import Any

def handler(request: Any) -> Any:
    raise RuntimeError(
        "Python entrypoint placeholder: use the Node.js server entrypoint for this project."
    )
