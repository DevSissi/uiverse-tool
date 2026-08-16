<div align="center">

# uivs

**纯 HTTP 的 Uiverse 组件 CLI**

[English](./README.md) | **简体中文**

[![npm version](https://img.shields.io/npm/v/@cissibot%2Fuivs?style=flat-square&logo=npm&logoColor=white&color=cb3837)](https://www.npmjs.com/package/@cissibot/uivs)
[![npm downloads](https://img.shields.io/npm/dm/@cissibot%2Fuivs?style=flat-square&logo=npm&logoColor=white&color=cb3837)](https://www.npmjs.com/package/@cissibot/uivs)
[![Node.js](https://img.shields.io/badge/node.js-%3E%3D18-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Python](https://img.shields.io/badge/python-%3E%3D3.10-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square&logo=opensourceinitiative&logoColor=white)](https://opensource.org/license/mit)

不依赖 Playwright，不启动浏览器，不下载 Chromium。

</div>

## 功能

- 获取 Uiverse 组件的原始 HTML / CSS
- 转换为 React、Vue、Svelte、Lit
- 支持按 tag、样式、作者名搜索
- JSON 输出包含分类和标签
- 通过 Python `curl_cffi` 发起纯 HTTP 请求
- 使用 `parse5` 将 HTML 转换为 React/JSX
- 支持代理，适配受限网络

## 安装

需要 Node.js 18+ 与 Python 3.10+。

```bash
pip install curl_cffi
```

安装已发布的 npm 包为全局 CLI：

```bash
npm install -g @cissibot/uivs
```

或从仓库安装：

```bash
npm install -g .
```

## 用法

```bash
uivs html  NorthFishHasNa/soft-turtle-49
uivs css   NorthFishHasNa/soft-turtle-49
uivs react NorthFishHasNa/soft-turtle-49
uivs vue   NorthFishHasNa/soft-turtle-49
uivs svelte NorthFishHasNa/soft-turtle-49
uivs lit   NorthFishHasNa/soft-turtle-49
```

按标签或作者搜索：

```bash
uivs search button --limit 10
uivs search rounded --limit 5
uivs search NorthFishHasNa --limit 10
```

也支持完整 URL：

```bash
uivs react https://uiverse.io/NorthFishHasNa/soft-turtle-49
```

保存到文件：

```bash
uivs react NorthFishHasNa/soft-turtle-49 /tmp/button.jsx
uivs vue NorthFishHasNa/soft-turtle-49 /tmp/button.vue
```

## 命令

| 命令 | 说明 |
| --- | --- |
| `uivs html <input> [output]` | 获取原始 HTML |
| `uivs css <input> [output]` | 获取原始 CSS |
| `uivs react <input> [output]` | React + styled-components（`jsx` / `tsx` 别名） |
| `uivs vue <input> [output]` | Vue 单文件组件 |
| `uivs svelte <input> [output]` | Svelte 组件 |
| `uivs lit <input> [output]` | Lit 组件 |
| `uivs search <query> [--limit N]` | 按标签、样式或作者搜索 |
| `uivs info <input>` | 输出元数据、分类和标签 |
| `uivs tags <input>` | 只输出标签列表 |

## 输出

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

## 代理

如果访问 Uiverse 受限，可以使用代理：

```bash
uivs --proxy <proxy-url> react NorthFishHasNa/soft-turtle-49
```

或设置以下任一环境变量：

```text
UIVERSE_PROXY
HTTPS_PROXY
HTTP_PROXY
```

## 开发

```bash
npm install
pip install -r requirements.txt
bash skills/uivs-cli/scripts/verify-project.sh
```

验证脚本会检查 Node / Python 语法、CLI 帮助、版本输出和语言目标解析。

## 许可证

MIT

---

徽章来自 [shields.io](https://shields.io) 与 [Simple Icons](https://simpleicons.org)。
