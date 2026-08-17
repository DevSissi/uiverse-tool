# uivs CLI Reference

## Install

Package: `@cissibot/uivs`

```bash
pip install -r requirements.txt
npm link
# or
npm install -g .
# or
npm install -g @cissibot/uivs
```

`npm link` exposes the `uivs` command. When the command is not linked, use `node bin/uivs.js`.

## Commands

| Command | Purpose |
| --- | --- |
| `uivs html <input> [output]` | Raw HTML |
| `uivs css <input> [output]` | Raw CSS |
| `uivs react\|jsx\|tsx <input> [output]` | React + styled-components or Tailwind JSX |
| `uivs vue <input> [output]` | Vue SFC |
| `uivs svelte <input> [output]` | Svelte component |
| `uivs lit <input> [output]` | Lit component |
| `uivs search <query> [--limit N]` | Search by tag, style, or creator (`N` is an integer 1-100, default 10) |
| `uivs info <input>` | Metadata, type, and tags |
| `uivs tags <input>` | Tag list only |
| `uivs --help` / `--version` | Help and version |

## Input formats

Accept `author/slug` or a full URL:

```text
NorthFishHasNa/soft-turtle-49
https://uiverse.io/NorthFishHasNa/soft-turtle-49
```

Only `uiverse.io` and `www.uiverse.io` hosts are accepted.

## Output shapes

Fetched post fields:

```json
{
  "username": "NorthFishHasNa",
  "slug": "soft-turtle-49",
  "url": "https://uiverse.io/NorthFishHasNa/soft-turtle-49",
  "postId": "aa4a45a2-a962-4bdc-a4c9-a681aea46ee8",
  "type": "button",
  "isTailwind": false,
  "title": "",
  "description": "",
  "author": "NorthFishHasNa",
  "tags": ["button"],
  "html": "...",
  "css": "..."
}
```

CLI generated output adds `target`, `language`, `length`, and `code`. When an output file is passed, the printed JSON omits `code`.

Search output:

```json
{
  "query": "rounded",
  "count": 1234,
  "results": [
    {
      "username": "...",
      "slug": "...",
      "url": "https://uiverse.io/...",
      "postId": "aa4a45a2-a962-4bdc-a4c9-a681aea46ee8",
      "type": "button",
      "theme": "...",
      "isTailwind": false
    }
  ],
  "page": 0,
  "hasNextPage": true
}
```

## Module map

| File | Responsibility |
| --- | --- |
| `bin/uivs.js` | Argument parsing, dispatch, JSON output, file saving |
| `lib/fetch.js` | Input parsing, proxy resolution, running Python helpers |
| `lib/convert.js` | `resolveTarget` and `generateCode` |
| `scripts/fetch-post.py` | Fetch one post via `curl_cffi` |
| `scripts/search-posts.py` | Search and paginate via `curl_cffi` |
| `.github/workflows/publish.yml` | Tag-driven npm publish via GitHub Actions |

## Data routes

Post:

```text
https://uiverse.io/<username>/<slug>?_data=routes/$username.$friendlyId
```

Search:

```text
https://uiverse.io/elements?_data=routes/$category&search=<query>&page=<page>
```

Python helpers use `curl_cffi` with Chrome impersonation and a 30-second timeout.

## Python interpreter

Precedence: `UIVERSE_PYTHON`, then `python3`, then `python`. Only a missing
interpreter falls through to the next candidate; a helper script that runs and
fails reports its own error.

## Proxy behavior

Precedence:

1. `--proxy <url>`
2. `UIVERSE_PROXY`
3. `HTTPS_PROXY` / `https_proxy`
4. `HTTP_PROXY` / `http_proxy`

For restricted networks, pass `--proxy` or set `UIVERSE_PROXY` with a proxy URL that works in your environment.

## Development and publishing

- `npm run verify` runs the skill smoke script.
- `bash skills/uivs-cli/scripts/verify-project.sh` runs the same checks directly.
- There is no production build step; the workflow only runs `npm run build --if-present` as a no-op.
- `.github/workflows/publish.yml` publishes on `v*` tags with npm trusted publishing.

## Verification rules

- Require parsed JSON with `postId` for fetch commands.
- Require non-empty `code` and a supported `language` for conversion.
- `HTTP 200` alone does not prove success.
- Keep the no-browser invariant when extending the tool.
- Keep React conversion on `parse5`; do not reintroduce `htmltojsx`.

Run `npm run verify` or `bash skills/uivs-cli/scripts/verify-project.sh` for syntax and CLI smoke checks.
