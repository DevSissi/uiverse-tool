---
name: uivs-cli
description: "Fetch, search, convert, and verify Uiverse component code with the uivs CLI in this repository. Use when working in uiverse-tool: pulling HTML/CSS/React/Vue/Svelte/Lit components from uiverse.io, converting a component into app code, searching by tag or creator, fixing CLI code generation, troubleshooting proxy or fetch failures, running verification, or preparing the @cissibot/uivs package."
---

# uivs CLI

## Overview

The repository ships the pure-HTTP npm CLI `@cissibot/uivs` with the `uivs` executable. Node.js orchestrates CLI parsing, JSON output, and code conversion; Python `curl_cffi` helpers perform network fetch and search. Do not use Playwright or Chromium.

## Quick start

Prerequisites: Node.js 18+, plus either a Python 3.10+ interpreter that can
import `curl_cffi` (`pip install -r requirements.txt`) or uv. An interpreter
that has the dependency is used directly; otherwise the PEP 723 header in the
helpers lets `uv run` provision it, with no separate install step. Point
`UIVERSE_PYTHON` at the interpreter when it is not the `python3` on `PATH`.

Install or link the CLI once:

```bash
npm link
# or
npm install -g .
# or
npm install -g @cissibot/uivs
```

Then run from the repo root:

```bash
uivs react NorthFishHasNa/soft-turtle-49
uivs vue https://uiverse.io/NorthFishHasNa/soft-turtle-49 /tmp/button.vue
uivs search rounded --limit 5
```

Supported languages: `html`, `css`, `react` (`jsx`/`tsx`), `vue`, `svelte`, `lit`.

If `uivs` is not linked, replace it with `node bin/uivs.js`.

## Core workflow

1. Search when the component URL is unknown.
2. Fetch with a language target.
3. Inspect the JSON for `postId`, `code`, `language`, `type`, and `tags`.
4. Save with an output file or reuse the printed code.
5. Run `npm run verify` or `bash skills/uivs-cli/scripts/verify-project.sh` after code changes.

URL input only accepts `uiverse.io` and `www.uiverse.io`. Bare input must be `author/slug`.

## Conversion behavior

- `html` and `css` return source code as stored.
- `react` / `jsx` / `tsx` parses HTML with `parse5` and emits JSX; non-Tailwind components wrap CSS in a styled-components `StyledWrapper`; Tailwind components use plain JSX.
- `vue` emits an SFC with scoped CSS unless the component is Tailwind.
- `svelte` emits markup plus a `<style>` block unless Tailwind.
- `lit` emits a `LitElement` with CSS or no styles for Tailwind.

Preserve the generated-code contract when editing `lib/convert.js`: `target`, `language`, `code`, plus the metadata added by `bin/uivs.js`. Keep the converter on `parse5`; do not reintroduce `htmltojsx`.

## Verification

Run the local smoke script after edits:

```bash
npm run verify
# or
bash skills/uivs-cli/scripts/verify-project.sh
```

The script checks Node and Python syntax, CLI help and version output, language target resolution, the `parse5` HTML-to-JSX conversion (attributes, fragment roots for sibling markup, CSS custom properties, tagged-template escaping, component naming, empty-CSS output), argument rejection messages, and that a large payload survives a piped stdout intact.

For live commands, require real parsed output: JSON with a `postId`, non-empty `code`, and a supported `language`. A `200` status alone is not proof of success.

## Common errors

- `Uiverse request failed: <status>`: network or upstream issue; retry with the local proxy.
- `fetch helper returned invalid JSON` or `Could not resolve post data`: inspect `scripts/fetch-post.py`, the `_data` route, and the proxy.
- `Unsupported host` or `Expected author/slug`: fix the input format, not the fetch layer.
- `Unsupported language`: pass one of the supported targets or a `jsx`/`tsx` alias.
- `Missing Python dependency curl_cffi`: no runner could supply it. Run `pip install -r requirements.txt` and set `UIVERSE_PYTHON` if it went into a virtualenv, or install uv so `uv run` provisions it.
- `No Python runner was found`: install uv, or set `UIVERSE_PYTHON` to a Python 3.10+ interpreter that has `curl_cffi`.
- `--limit must be an integer between 1 and 100`: pass an integer in range.

## Invariants

- Never print results with `process.exit` still pending: `bin/uivs.js` awaits the stdout drain so piped output cannot be truncated.
- Source HTML/CSS embedded in tagged templates must pass through `escapeTemplate`, which neutralizes backticks and `${` while leaving CSS backslash escapes raw.
- `type` from Uiverse is untrusted: derive JS identifiers with `componentName` and custom-element names with `customElementName`.

## Reference

Read `references/commands.md` when a task needs the exact command table, module map, data routes, output shapes, proxy behavior, or publishing workflow.
