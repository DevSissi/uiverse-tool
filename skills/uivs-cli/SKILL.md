---
name: uivs-cli
description: "Fetch, search, convert, and verify Uiverse component code with the pure-HTTP uivs command in this repository. Use when working in uiverse-tool: pulling HTML/CSS/React/Vue/Svelte/Lit components from uiverse.io, converting a component into app code, searching by tag or creator, fixing CLI code generation, troubleshooting proxy or fetch failures, or verifying the CLI without launching a browser."
---

# uivs CLI

## Overview

Fetch and convert Uiverse components with the installed `uivs` command after `npm link` or a global install. Use `node bin/uivs.js` when running directly from an unlinked checkout. This project is a pure HTTP CLI: Node orchestrates output and conversion, while Python scripts fetch and search through `curl_cffi`. Do not reach for Playwright or a browser.

## Quick start

Prerequisites: Node.js 18+, Python 3.10+, and `pip install -r requirements.txt`.

Link the local CLI once, then run from the repo root:

```bash
npm link

uivs react NorthFishHasNa/soft-turtle-49
uivs vue https://uiverse.io/NorthFishHasNa/soft-turtle-49 /tmp/button.vue
uivs search rounded --limit 5
```

Supported languages: `html`, `css`, `react` (`jsx`/`tsx`), `vue`, `svelte`, `lit`.

If `uivs` is not linked, replace it with `node bin/uivs.js`.

If a fetch fails due to network blocking, retry with `--proxy <proxy-url>`, or set `UIVERSE_PROXY`, `HTTPS_PROXY`, or `HTTP_PROXY`.

## Core workflow

1. Search when the component URL is unknown.
2. Fetch with a language target.
3. Inspect the JSON for `postId`, `code`, `language`, `type`, and `tags`.
4. Save with an output file or reuse the printed code.
5. Run `bash skills/uivs-cli/scripts/verify-project.sh` or `npm run verify` after code changes.

URL input only accepts `uiverse.io` and `www.uiverse.io`. Bare input must be `author/slug`.

## Conversion behavior

- `html` and `css` return source code as stored.
- `react` / `jsx` / `tsx` parses HTML with `parse5` and emits JSX; non-Tailwind components wrap CSS in a styled-components `StyledWrapper`; Tailwind components use plain JSX.
- `vue` emits an SFC with scoped CSS unless the component is Tailwind.
- `svelte` emits markup plus a `<style>` block unless Tailwind.
- `lit` emits a `LitElement` with CSS or no styles for Tailwind.

Preserve the generated-code contract when editing `lib/convert.js`: `target`, `language`, `code`, plus the metadata added by `bin/uivs.js`.

Keep the converter on `parse5`; do not reintroduce `htmltojsx`.

## Verification

Run the local smoke script after edits:

```bash
bash skills/uivs-cli/scripts/verify-project.sh
# or
npm run verify
```

The script checks Node and Python syntax, CLI help and version output, language target resolution, and the `parse5` HTML-to-JSX conversion.

For live commands, require real parsed output: JSON with a `postId`, non-empty `code`, and a supported `language`. A `200` status alone is not proof of success.

## Common errors

- `Uiverse request failed: <status>`: network or upstream issue; retry with the local proxy.
- `fetch helper returned invalid JSON` or `Could not resolve post data`: inspect `scripts/fetch-post.py`, the `_data` route, and the proxy.
- `Unsupported host` or `Expected author/slug`: fix the input format, not the fetch layer.

## Reference

Read `references/commands.md` when a task needs the exact command table, module map, data routes, output shapes, or error details.
