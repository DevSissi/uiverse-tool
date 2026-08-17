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

const failures = [];
const check = (label, condition) => {
  if (!condition) {
    failures.push(label);
  }
};
const react = (post) => generateCode('react', { css: '', isTailwind: true, ...post }).code;

// Attribute, style, and entity handling.
const attrs = react({
  type: 'button',
  html: '<button class="btn" disabled aria-label="Save"><svg viewBox="0 0 24 24" stroke-width="2" fill="none"><path d="M0 0h24v24H0z" /></svg><span style="color: red; margin: 0 auto">Save &amp; exit</span></button>',
});
for (const part of [
  'className="btn"',
  'disabled',
  'strokeWidth="2"',
  "style={{ color: 'red', margin: '0 auto' }}",
  'Save &amp; exit',
]) {
  check(`jsx fragment: ${part}`, attrs.includes(part));
}

// parse5 reports a namespaced attribute as name + prefix; the prefix must
// survive so `xlink:href` becomes `xlinkHref` rather than a bare `href`.
check('namespaced attribute', react({ type: 'icon', html: '<svg><use xlink:href="#a"/></svg>' }).includes('xlinkHref="#a"'));

// Sibling roots need a fragment, a single root must not gain one.
const multiRoot = react({
  type: 'checkbox',
  html: '<input type="checkbox" id="c"><label for="c">Hi</label>',
});
check('multi-root wraps in a fragment', multiRoot.includes('<>') && multiRoot.includes('</>'));
check('single root stays unwrapped', !react({ type: 'button', html: '<button>a</button>' }).includes('<>'));
check('leading whitespace does not force a fragment', !react({ type: 'button', html: '\n  <button>a</button>\n' }).includes('<>'));
check('significant text spacing preserved', react({ type: 'button', html: 'Hello <b>world</b>' }).includes("Hello{' '}"));
check('empty markup stays valid jsx', react({ type: 'button', html: '' }).includes('<></>'));
// StyledWrapper already supplies the single root, so no fragment is nested.
const wrapped = generateCode('react', {
  type: 'button',
  html: '<div>a</div><div>b</div>',
  css: '.a { color: red; }',
  isTailwind: false,
}).code;
check('wrapped multi-root skips the fragment', !/<StyledWrapper>\s*<>/.test(wrapped));
check('wrapped multi-root keeps both roots', wrapped.includes('<div>a</div>') && wrapped.includes('<div>b</div>'));

// CSS custom properties must survive verbatim for React.
const vars = react({ type: 'loader', html: '<div style="--i: 1; -webkit-mask: none"><b>a</b></div>' });
check('custom property preserved', vars.includes("'--i': '1'"));
check('vendor property camelized', vars.includes("WebkitMask: 'none'"));

// Declarations split on separators only, so a `;` inside url() or quotes
// must not truncate the value.
const inlineUrl = react({ type: 'icon', html: '<div style="background: url(data:image/svg+xml;base64,AAA); color: red"><b>a</b></div>' });
check('semicolon inside url() kept', inlineUrl.includes("background: 'url(data:image/svg+xml;base64,AAA)'"));
check('declaration after url() parsed', inlineUrl.includes("color: 'red'"));

// Tagged-template safety: `${` must not become a live interpolation, while
// CSS backslash escapes must reach the consumer unchanged.
const templates = generateCode('react', {
  type: 'button',
  html: '<b>x</b>',
  css: '.a { content: "${x}"; } .b::after { content: "\\2192"; }',
  isTailwind: false,
});
check('interpolation escaped', templates.code.includes('\\${x}'));
check('css escape preserved', templates.code.includes('"\\2192"'));

// `type` is used as a JS identifier and a custom-element name.
check('hyphenated type', react({ type: 'radio-button', html: '<i></i>' }).includes('const RadioButton'));
check('missing type', react({ type: null, html: '<i></i>' }).includes('const Component'));
const litLeadingDigit = generateCode('lit', { type: '3d-card', html: '<i></i>', css: '', isTailwind: true }).code;
check('lit class identifier', /^export class My[A-Za-z0-9]+ extends LitElement \{$/m.test(litLeadingDigit));
check('lit custom element name', litLeadingDigit.includes("@customElement('my-3d-card')"));

// Styles are omitted rather than emitted blank.
const bare = { type: 'button', html: '<b>x</b>', css: '', isTailwind: false };
check('vue without css', generateCode('vue', bare).code === '<template>\n  <b>x</b>\n</template>\n');
check('svelte without css', generateCode('svelte', bare).code === '<b>x</b>\n');

if (failures.length) {
  for (const failure of failures) {
    console.error(`failed: ${failure}`);
  }
  process.exit(1);
}
JS

echo "argument validation"
# Assert the specific rejection message: exit codes alone cannot tell a real
# validation failure apart from an unrelated network or dependency error.
expect_error() {
    local pattern="$1"
    shift
    local output
    if output="$(node bin/uivs.js "$@" 2>&1 >/dev/null)"; then
        echo "expected failure from: uivs $* " >&2
        exit 1
    fi
    if [[ "$output" != *"$pattern"* ]]; then
        echo "expected '$pattern' from: uivs $*" >&2
        echo "actual: $output" >&2
        exit 1
    fi
}

for bad in 0 -5 abc 101 1e9; do
    expect_error '--limit must be an integer' search x --limit "$bad"
done
expect_error 'Unsupported language' bogus author/slug
expect_error 'Unknown option' react author/slug --nope
expect_error 'Missing value for --proxy' react author/slug --proxy
expect_error 'Missing value for --proxy' react author/slug --proxy --limit 5
expect_error 'Missing value for --limit' search x --limit

echo "piped stdout stays intact"
# console.log on a pipe is asynchronous: exiting mid-write silently truncates
# large payloads, so assert the JSON survives a pipe end to end.
STUB_DIR="$(mktemp -d)"
trap 'rm -rf "$STUB_DIR"' EXIT
cat > "$STUB_DIR/python3" <<STUB
#!/usr/bin/env bash
exec "$(command -v python3)" -c '
import json
print(json.dumps({"username": "a", "slug": "b", "url": "https://uiverse.io/a/b",
                  "postId": "pid", "type": "button", "isTailwind": False,
                  "tags": [], "html": "<button>Go</button>",
                  "css": ".btn-%d { color: red; }\n" * 20000}))
'
STUB
chmod +x "$STUB_DIR/python3"
PATH="$STUB_DIR:$PATH" node bin/uivs.js react a/b > "$STUB_DIR/out.json"
PATH="$STUB_DIR:$PATH" node bin/uivs.js react a/b | cat > "$STUB_DIR/piped.json"
node -e "
const fs = require('node:fs');
const direct = fs.readFileSync(process.argv[1], 'utf8');
const piped = fs.readFileSync(process.argv[2], 'utf8');
const parsed = JSON.parse(piped);
if (piped !== direct) {
  console.error('piped stdout differs from redirected stdout');
  process.exit(1);
}
if (parsed.code.length !== parsed.length || parsed.code.length < 200000) {
  console.error('piped payload was truncated');
  process.exit(1);
}
" "$STUB_DIR/out.json" "$STUB_DIR/piped.json"

echo "ok"
