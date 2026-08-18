<div align="center">

# uivs

**uivs is a pure HTTP CLI for Uiverse components.**

It fetches component HTML/CSS and converts it into React, Vue, Svelte, or Lit code. No Playwright, no browser, no Chromium download.

**English** | [简体中文](./README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/@cissibot%2Fuivs?style=flat-square&logo=npm&logoColor=white&color=cb3837)](https://www.npmjs.com/package/@cissibot/uivs)
[![npm downloads](https://img.shields.io/npm/dm/@cissibot%2Fuivs?style=flat-square&logo=npm&logoColor=white&color=cb3837)](https://www.npmjs.com/package/@cissibot/uivs)
[![Node.js](https://img.shields.io/badge/node.js-%3E%3D18-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Python](https://img.shields.io/badge/python-%3E%3D3.10-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square&logo=opensourceinitiative&logoColor=white)](https://opensource.org/license/mit)

</div>

## Features

- Fetch raw HTML or CSS from a Uiverse component
- Convert components to React, Vue, Svelte, or Lit
- Search by tag, style, or creator name
- Print JSON metadata or save code to a file
- Use a proxy when Uiverse is blocked in your network

## Install

Requires Node.js 18+ and Python 3.10+.

Install the Python dependency with [uv](https://docs.astral.sh/uv/):

```bash
uv venv
uv pip install curl_cffi
export UIVERSE_PYTHON="$PWD/.venv/bin/python"
```

Or with `pip` into whichever interpreter `uivs` will use:

```bash
pip install curl_cffi
```

Install the published package as a global CLI:

```bash
npm install -g @cissibot/uivs
```

Or install from the repository:

```bash
uv pip install -r requirements.txt
npm install -g .
```

## Usage

```bash
uivs html  NorthFishHasNa/soft-turtle-49
uivs css   NorthFishHasNa/soft-turtle-49
uivs react NorthFishHasNa/soft-turtle-49
uivs vue   NorthFishHasNa/soft-turtle-49
uivs svelte NorthFishHasNa/soft-turtle-49
uivs lit   NorthFishHasNa/soft-turtle-49
```

Search by tag or creator:

```bash
uivs search button --limit 10
uivs search rounded --limit 5
uivs search NorthFishHasNa --limit 10
```

Full URLs are also accepted:

```bash
uivs react https://uiverse.io/NorthFishHasNa/soft-turtle-49
```

Save code to a file:

```bash
uivs react NorthFishHasNa/soft-turtle-49 /tmp/button.jsx
uivs vue NorthFishHasNa/soft-turtle-49 /tmp/button.vue
```

Inspect metadata or tags:

```bash
uivs info NorthFishHasNa/soft-turtle-49
uivs tags NorthFishHasNa/soft-turtle-49
```

## Commands

| Command | Description |
| --- | --- |
| `uivs html <input> [output]` | Fetch raw HTML |
| `uivs css <input> [output]` | Fetch raw CSS |
| `uivs react\|jsx\|tsx <input> [output]` | React component (`jsx` / `tsx` aliases) |
| `uivs vue <input> [output]` | Vue SFC |
| `uivs svelte <input> [output]` | Svelte component |
| `uivs lit <input> [output]` | Lit component |
| `uivs search <query> [--limit N]` | Search by tag, style, or creator (`N` is 1-100, default 10) |
| `uivs info <input>` | Print metadata: type, title, description, author, and tags |
| `uivs tags <input>` | Print tag list only |
| `uivs --help` / `--version` | Show help or version |

## Output

Default output is JSON and includes the component type and tags.

```json
{
  "target": "react",
  "language": "jsx",
  "username": "NorthFishHasNa",
  "slug": "soft-turtle-49",
  "url": "https://uiverse.io/NorthFishHasNa/soft-turtle-49",
  "type": "button",
  "tags": ["button", "rounded", "button", "text", "rectangular", "click", "navy"],
  "isTailwind": false,
  "postId": "aa4a45a2-a962-4bdc-a4c9-a681aea46ee8",
  "length": 894,
  "code": "..."
}
```

When an output file is passed, the code is written to the file and omitted from the printed JSON. The JSON always goes to stdout and status or error messages go to stderr, so `uivs ... | jq` stays clean.

Search results are JSON too, with `query`, `count`, `results`, `page`, and `hasNextPage`.

Invalid input fails with a message on stderr and exit code 1: an unsupported language, an unknown option, or a `--limit` outside 1-100.

## Proxy

If Uiverse is blocked in your network, pass a proxy:

```bash
uivs --proxy <proxy-url> react NorthFishHasNa/soft-turtle-49
```

Or set one of the following environment variables:

```text
UIVERSE_PROXY
HTTPS_PROXY
HTTP_PROXY
```

`uivs` calls Python through `python3`, falling back to `python`. Set `UIVERSE_PYTHON` to point at a specific interpreter.

## Agent Skill

The repository also ships a companion agent skill for coding agents. Install it globally:

```bash
npx skills add DevSissi/uiverse-tool --skill uivs-cli -g -y
```

The CLI is fully usable without the skill.

## License

MIT
