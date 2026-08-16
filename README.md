<div align="center">

# uivs

**Pure HTTP CLI for Uiverse components · 纯 HTTP 的 Uiverse 组件 CLI**

[![npm version](https://img.shields.io/npm/v/uivs?style=flat-square&logo=npm&logoColor=white&color=cb3837)](https://www.npmjs.com/package/uivs)
[![npm downloads](https://img.shields.io/npm/dm/uivs?style=flat-square&logo=npm&logoColor=white&color=cb3837)](https://www.npmjs.com/package/uivs)
[![Node.js](https://img.shields.io/badge/node.js-%3E%3D18-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Python](https://img.shields.io/badge/python-%3E%3D3.10-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square&logo=opensourceinitiative&logoColor=white)](https://opensource.org/license/mit)

No Playwright, no browser, no Chromium download.

不依赖 Playwright，不启动浏览器，不下载 Chromium。

</div>

## Features / 功能

- Fetch raw HTML / CSS from Uiverse components
- Convert components to React, Vue, Svelte, and Lit
- Search by tag, style, or creator name
- JSON output with category and tags
- Pure HTTP requests through Python `curl_cffi`
- Proxy support for restricted networks

---

- 获取 Uiverse 组件的原始 HTML / CSS
- 转换为 React、Vue、Svelte、Lit
- 支持按 tag、样式、作者名搜索
- JSON 输出包含分类和标签
- 通过 Python `curl_cffi` 发起纯 HTTP 请求
- 支持代理，适配受限网络

## Install / 安装

Requires Node.js 18+ and Python 3.10+.

需要 Node.js 18+ 与 Python 3.10+。

```bash
pip install curl_cffi
```

Install from the repository:

从仓库安装：

```bash
npm install -g .
```

After publishing to npm:

发布到 npm 后：

```bash
npm install -g uivs
```

## Usage / 用法

```bash
uivs html  NorthFishHasNa/soft-turtle-49
uivs css   NorthFishHasNa/soft-turtle-49
uivs react NorthFishHasNa/soft-turtle-49
uivs vue   NorthFishHasNa/soft-turtle-49
uivs svelte NorthFishHasNa/soft-turtle-49
uivs lit   NorthFishHasNa/soft-turtle-49
```

Search by tag or creator:

按标签或作者搜索：

```bash
uivs search button --limit 10
uivs search rounded --limit 5
uivs search NorthFishHasNa --limit 10
```

Full URLs are also accepted:

也支持完整 URL：

```bash
uivs react https://uiverse.io/NorthFishHasNa/soft-turtle-49
```

Save code to a file:

保存到文件：

```bash
uivs react NorthFishHasNa/soft-turtle-49 /tmp/button.jsx
uivs vue NorthFishHasNa/soft-turtle-49 /tmp/button.vue
```

## Commands / 命令

| Command / 命令 | English | 中文 |
| --- | --- | --- |
| `uivs html <input> [output]` | Fetch raw HTML | 获取原始 HTML |
| `uivs css <input> [output]` | Fetch raw CSS | 获取原始 CSS |
| `uivs react <input> [output]` | React + styled-components (`jsx` / `tsx` aliases) | React + styled-components（`jsx` / `tsx` 别名） |
| `uivs vue <input> [output]` | Vue SFC | Vue 单文件组件 |
| `uivs svelte <input> [output]` | Svelte component | Svelte 组件 |
| `uivs lit <input> [output]` | Lit component | Lit 组件 |
| `uivs search <query> [--limit N]` | Search by tag, style, or creator | 按标签、样式或作者搜索 |
| `uivs info <input>` | Print metadata, type, and tags | 输出元数据、分类和标签 |
| `uivs tags <input>` | Print tag list only | 只输出标签列表 |

## Output / 输出

Default output is JSON and includes category and tags.

默认输出为 JSON，并包含分类和标签。

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

## Proxy / 代理

If Uiverse is blocked in your network, use a proxy:

如果访问 Uiverse 受限，可以使用代理：

```bash
uivs --proxy <proxy-url> react NorthFishHasNa/soft-turtle-49
```

Or set one of the following environment variables:

或设置以下任一环境变量：

```text
UIVERSE_PROXY
HTTPS_PROXY
HTTP_PROXY
```

## Development / 开发

```bash
npm install
pip install -r requirements.txt
bash skills/uivs-cli/scripts/verify-project.sh
```

The smoke script checks Node / Python syntax, CLI help, version output, and language target resolution.

验证脚本会检查 Node / Python 语法、CLI 帮助、版本输出和语言目标解析。

## License / 许可证

MIT

---

Badges by [shields.io](https://shields.io) and [Simple Icons](https://simpleicons.org).

徽章来自 [shields.io](https://shields.io) 与 [Simple Icons](https://simpleicons.org)。
