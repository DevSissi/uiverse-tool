#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="${1:-$(cd "$SCRIPT_DIR/../../.." && pwd)}"
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

echo "html to jsx conversion"
node --input-type=module - <<'JS'
import { generateCode } from './lib/convert.js';

const html = '<button class="btn" disabled aria-label="Save"><svg viewBox="0 0 24 24" stroke-width="2" fill="none"><path d="M0 0h24v24H0z" /></svg><span style="color: red; margin: 0 auto">Save &amp; exit</span></button>';
const { code } = generateCode('react', {
  type: 'button',
  html,
  css: '',
  isTailwind: true,
});

const expected = [
  'className="btn"',
  'disabled',
  'strokeWidth="2"',
  "style={{ color: 'red', margin: '0 auto' }}",
  'Save &amp; exit',
];

for (const part of expected) {
  if (!code.includes(part)) {
    console.error(`missing expected jsx fragment: ${part}`);
    process.exit(1);
  }
}
JS

echo "ok"
