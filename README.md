<div align="center">

# uivs

**Pure HTTP CLI for Uiverse components**

**English** | [简体中文](./README.zh-CN.md)

[![npm version](https://img.shields.io/npm/v/@cissibot%2Fuivs?style=flat-square&logo=npm&logoColor=white&color=cb3837)](https://www.npmjs.com/package/@cissibot/uivs)
[![npm downloads](https://img.shields.io/npm/dm/@cissibot%2Fuivs?style=flat-square&logo=npm&logoColor=white&color=cb3837)](https://www.npmjs.com/package/@cissibot/uivs)
[![Node.js](https://img.shields.io/badge/node.js-%3E%3D18-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Python](https://img.shields.io/badge/python-%3E%3D3.10-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square&logo=opensourceinitiative&logoColor=white)](https://opensource.org/license/mit)

No Playwright, no browser, no Chromium download.

</div>

## Features

- Fetch raw HTML / CSS from Uiverse components
- Convert components to React, Vue, Svelte, and Lit
- Search by tag, style, or creator name
- JSON output with category and tags
- Pure HTTP requests through Python `curl_cffi`
- HTML to React/JSX conversion via `parse5`
- Proxy support for restricted networks

## Agent Skill

This repository ships a companion agent skill at `skills/uivs-cli/SKILL.md`. It guides coding agents through fetching, searching, converting, and verifying Uiverse components with `uivs`.

Install it globally for agents that support `skills`:

```bash
npx skills add DevSissi/uiverse-tool --skill uivs-cli -g -y
```

The CLI is fully usable without the skill.

## Install

Requires Node.js 18+ and Python 3.10+.

```bash
pip install curl_cffi
```

Install the published package as a global CLI:

```bash
npm install -g @cissibot/uivs
```

Or install from the repository:

```bash
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

## Commands

| Command | Description |
| --- | --- |
| `uivs html <input> [output]` | Fetch raw HTML |
| `uivs css <input> [output]` | Fetch raw CSS |
| `uivs react <input> [output]` | React + styled-components (`jsx` / `tsx` aliases) |
| `uivs vue <input> [output]` | Vue SFC |
| `uivs svelte <input> [output]` | Svelte component |
| `uivs lit <input> [output]` | Lit component |
| `uivs search <query> [--limit N]` | Search by tag, style, or creator |
| `uivs info <input>` | Print metadata, type, and tags |
| `uivs tags <input>` | Print tag list only |

## Output

Default output is JSON and includes category and tags.

```json
{
  "target": "react",
  "language": "jsx",
  "username": "NorthFishHasNa",
  "slug": "soft-turtle-49",
  "url": "https://uiverse.io/NorthFishHasNa/soft-turtle-49",
  "type": "button",
  "tags": ["button", "rounded", "click", "navy"],
  "isTailwind": false,
  "postId": "aa4a45a2-a962-4bdc-a4c9-a681aea46ee8",
  "length": 893,
  "code": "..."
}
```

## Proxy

If Uiverse is blocked in your network, use a proxy:

```bash
uivs --proxy <proxy-url> react NorthFishHasNa/soft-turtle-49
```

Or set one of the following environment variables:

```text
UIVERSE_PROXY
HTTPS_PROXY
HTTP_PROXY
```

## Development

```bash
npm install
pip install -r requirements.txt
bash skills/uivs-cli/scripts/verify-project.sh
```

The smoke script checks Node / Python syntax, CLI help, version output, and language target resolution.

## License

MIT

---

Badges by [shields.io](https://shields.io) and [Simple Icons](https://simpleicons.org).
