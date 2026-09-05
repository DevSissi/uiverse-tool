<div align="center">

# uivs

**uivs 是一个纯 HTTP 的 Uiverse 组件 CLI。**

它可以抓取组件的 HTML/CSS，并转换成 React、Vue、Svelte 或 Lit 代码。不依赖 Playwright，不启动浏览器，不下载 Chromium。

[English](./README.md) | **简体中文**

[![npm version](https://img.shields.io/npm/v/@cissibot%2Fuivs?style=flat-square&logo=npm&logoColor=white&color=cb3837)](https://www.npmjs.com/package/@cissibot/uivs)
[![npm downloads](https://img.shields.io/npm/dm/@cissibot%2Fuivs?style=flat-square&logo=npm&logoColor=white&color=cb3837)](https://www.npmjs.com/package/@cissibot/uivs)
[![Node.js](https://img.shields.io/badge/node.js-%3E%3D18-339933?style=flat-square&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Python](https://img.shields.io/badge/python-%3E%3D3.10-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square&logo=opensourceinitiative&logoColor=white)](https://opensource.org/license/mit)

</div>

## 功能

- 获取 Uiverse 组件的原始 HTML / CSS
- 转换为 React、Vue、Svelte、Lit
- 按标签、样式或作者名搜索
- 输出 JSON 元数据，或保存代码到文件
- 网络受限时可通过代理使用

## 安装

需要 Node.js 18+，以及 [uv](https://docs.astral.sh/uv/) 或一个能 import `curl_cffi`
的 Python 3.10+ 解释器，二者有其一即可。

```bash
npm install -g @cissibot/uivs
```

有 uv 时，安装到此为止。Python 辅助脚本以 PEP 723 内联声明自己的依赖，`uv run` 会在首次
调用时装好 `curl_cffi`。uv 写入的一切都在它自己的目录里——`uv cache dir` 与 `uv python dir`，
默认都是 XDG 路径——不会落进你的项目。

或从仓库安装：

```bash
npm install -g .
```

### 没有 uv 时

已装好 `curl_cffi` 的解释器会被直接使用，根本不会走到 uv：

```bash
pip install curl_cffi
```

要用的解释器不是 `PATH` 上的 `python3` 时（例如在某个 virtualenv 里），用
`UIVERSE_PYTHON` 指定，它的优先级高于其他所有运行器：

```bash
export UIVERSE_PYTHON=/path/to/python
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

查看元数据或标签：

```bash
uivs info NorthFishHasNa/soft-turtle-49
uivs tags NorthFishHasNa/soft-turtle-49
```

## 命令

| 命令 | 说明 |
| --- | --- |
| `uivs html <input> [output]` | 获取原始 HTML |
| `uivs css <input> [output]` | 获取原始 CSS |
| `uivs react\|jsx\|tsx <input> [output]` | React 组件（`jsx` / `tsx` 别名） |
| `uivs vue <input> [output]` | Vue 单文件组件 |
| `uivs svelte <input> [output]` | Svelte 组件 |
| `uivs lit <input> [output]` | Lit 组件 |
| `uivs search <query> [--limit N]` | 按标签、样式或作者搜索（`N` 取 1-100，默认 10） |
| `uivs info <input>` | 输出元数据：类型、标题、描述、作者和标签 |
| `uivs tags <input>` | 只输出标签列表 |
| `uivs --help` / `--version` | 显示帮助或版本 |

## 输出

默认输出为 JSON，包含组件类型和标签。

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

指定输出文件时，代码会写入文件并从打印的 JSON 中省略。JSON 始终写入 stdout，状态和错误信息写入 stderr，因此 `uivs ... | jq` 不会被污染。

搜索结果同样是 JSON，包含 `query`、`count`、`results`、`page` 和 `hasNextPage`。

输入不合法时会在 stderr 报错并以退出码 1 结束：不支持的语言、未知选项，或超出 1-100 的 `--limit`。

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

`uivs` 依次尝试 `python3`、`python`、`uv run` 来运行 Python 辅助脚本。可设置 `UIVERSE_PYTHON` 指定解释器。

## Agent 技能

仓库同时提供配套的 Agent 技能，供编码代理使用。全局安装：

```bash
npx skills add DevSissi/uiverse-tool --skill uivs-cli -g -y
```

CLI 本身不依赖该技能，可独立使用。

## 许可证

MIT
