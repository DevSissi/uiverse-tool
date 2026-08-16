#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${1:-$(pwd)}"
cd -- "$REPO_DIR"

echo "node syntax"
node --check bin/uivs.js
node --check lib/fetch.js
node --check lib/convert.js

echo "python syntax"
python3 - <<'PY'
import ast
from pathlib import Path

for path in (Path("scripts/fetch-post.py"), Path("scripts/search-posts.py")):
    ast.parse(path.read_text(), filename=str(path))
PY

echo "cli help and version"
node bin/uivs.js --help >/dev/null
expected="uivs $(node -p "require('./package.json').version")"
actual="$(node bin/uivs.js --version)"
if [[ "$actual" != "$expected" ]]; then
    echo "unexpected version: $actual (expected $expected)" >&2
    exit 1
fi

echo "target resolution"
node --input-type=module -e "import { resolveTarget } from './lib/convert.js'; console.log(resolveTarget('jsx'));" | grep -qx react

echo "ok"
