# Awesome MyGo

[![Website](https://img.shields.io/badge/website-mygodock.dev-3fd3f5)](https://mygodock.dev)
[![CI](https://github.com/yldm-tech/awesome-mygo/actions/workflows/ci.yml/badge.svg)](https://github.com/yldm-tech/awesome-mygo/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/yldm-tech/awesome-mygo)](LICENSE)

把围绕 [MyGo](https://github.com/egoist/mygo) 的应用、插件、组件和文档收集在一个站点里：**[mygodock.dev](https://mygodock.dev)**。MyGo 是用 Go 构建桌面应用的工具包，界面可以是原生 UI，也可以是 Web 前端。

[English](README.md) · 简体中文 · [繁體中文](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md)

[![Awesome MyGo](.github/assets/banner.png)](https://mygodock.dev)

## 站点内容

- **作品**：用 MyGo 做的桌面应用，可按名称、最新或最热排序。每款都有自己的页面，包含完整介绍、截图（项目提供时）、界面类型（原生 UI 或 Web 前端）、分类、收录时间，以及同一作者的其他作品。
- **插件**：官方插件，标明适用于网页、原生 UI 还是两者，另有 `mygo-cli` 工具链。
- **UI 组件**：为 MyGo 应用做的组件库、主题与图标。
- **状态管理**：MyGo 应用的状态方案，以及 MyGo 自带的绑定服务、通道和类型化事件。
- **文档**：官方指南、社区文章和官方资源。
- 用 <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd> **搜索**全部内容；想收录某个项目时，提交表单会替你写好条目。

站点支持简体中文、繁体中文、英语、日语和韩语。每个页面在每种语言下都有独立地址（`?lang=en`），由服务端渲染，并带有 hreflang 链接和 sitemap。筛选、排序和标签页也都记在地址里（`/showcase?cat=dev&sort=newest`），分享出去的链接打开的就是同一个视图。

## 技术实现

pnpm monorepo，由 [TanStack Start](https://tanstack.com/start) 运行在 [Cloudflare Workers](https://workers.cloudflare.com) 上：

| 路径 | 内容 |
|---|---|
| `apps/web` | 站点：React 19、TanStack Start（服务端渲染），以及带 `@cloudflare/vite-plugin` 的 Vite。`wrangler.jsonc` 把它部署到 `mygodock.dev`。 |
| `packages/catalog` | 数据：`data/*.json`（应用、UI 组件、状态方案、插件、文章、指南）及其 JSON Schema，五种语言的界面文案，搜索与提交表单的条目。测试会校验每个条目。 |
| `packages/enrich` | 补全提交 bot 开的 PR：从项目仓库取应用图标，截图优先用表单里填的链接、否则从仓库取，并用 Claude 写五种语言的文案。由 `.github/workflows/enrich-submission.yml` 运行。 |

应用图标来自 [yldm-tech/ai-logo](https://github.com/yldm-tech/ai-logo)，由它的 CDN 提供；它未收录的少数应用使用 `apps/web/public/icons/` 里的官方图标。

每个应用页都有一张分享卡片：1200×630 的 PNG，包含应用的图标、名称、作者和截图，链接预览会显示它。`vite build` 把卡片生成到 `/og/`（代码在 `apps/web/og`），所以 bot 新加的应用在部署时就有自己的卡片。生成卡片需要联网：构建时会下载 ai-logo 图标，名称里有非拉丁文字时还会从 Google Fonts 取字形。

## 本地开发

需要 Node.js 24 或更高版本，以及 pnpm。

```sh
pnpm install
pnpm dev          # 本地站点，由 Workers 运行时渲染
pnpm test         # catalog 测试
pnpm typecheck
pnpm build
pnpm preview      # 在 Workers 运行时中运行生产构建
```

`pnpm deploy` 会用 Wrangler 构建并部署，需要一个包含 `apps/web/wrangler.jsonc` 中域名 zone 的 Cloudflare 账户。

表单的直接提交通过安装在本仓库上的 GitHub App 完成，前面有 Cloudflare Turnstile 人机验证和按 IP 的限流。给这个 App 开 *Contents* 和 *Pull requests* 的读写权限，把它的私钥转成 PKCS#8（`openssl pkcs8 -topk8 -nocrypt -in key.pem -out key-pkcs8.pem`），然后在 `apps/web` 下用 `wrangler secret put` 设置四个 secret：`GITHUB_APP_ID`、`GITHUB_APP_PRIVATE_KEY`（PKCS#8 文件）、`TURNSTILE_SITE_KEY` 和 `TURNSTILE_SECRET_KEY`。四个都设好之前，表单只提供 GitHub 链接。本地测试时，把 Turnstile 的[测试密钥](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)写进 `apps/web/.dev.vars`。

bot 开出 PR 后，*Complete submission* workflow 会补上表单问不到的内容：应用图标，按 MyGo 的查找方式取（`mygo.json` 的 `icon`，没有则用 `resources/icon.png`；如果是 `mygo init` 生成的 MyGo 默认图标就不加）、README 里第一张不是图标或其他方形 logo 的截图，以及五种语言的简介和介绍。它会跑 catalog 检查，以 bot 身份推到同一分支，并在 PR 里留言说明做了什么；合并前仍需维护者审核。需要在仓库的 Actions 设置里配置 secret：`SUBMIT_APP_PRIVATE_KEY`（App 的 PKCS#8 私钥，与 Worker 用的相同）、`LLM_API_KEY`（Anthropic Messages API 的密钥），走网关时再加 `LLM_BASE_URL`；以及变量 `SUBMIT_APP_CLIENT_ID`（App 的 Client ID）。变量 `LLM_MODEL` 可以换模型（默认 `claude-opus-5-5`）。没有 `LLM_API_KEY` 时文案保持提交时的样子。

## 收录项目

每个条目都是 [`packages/catalog/data`](packages/catalog/data) 下单独的一个 JSON 文件，放在所属类别的目录里，以 `slug` 命名：

| 文件 | 内容 |
|---|---|
| `apps/<slug>.json` | 用 MyGo 做的应用 |
| `ui/<slug>.json` | UI 组件库 |
| `state/<slug>.json` | 状态管理 |
| `plugins/<slug>.json` | 插件 |
| `articles/<slug>.json` | 文章 |
| `docs/<slug>.json` | MyGo 官方指南 |

添加方式有两种：

- **在站点上：** 点「提交」填表，或者直接粘贴整条 JSON 条目，然后提交：不需要 GitHub 账号，站点的 bot 会替你开 PR。有 GitHub 账号的话，也可以把生成的条目提交为 Issue，或在 GitHub 编辑器里打开为这个条目新建的文件自己加上。
- **在仓库里：** 在所属类别的目录下加一个文件，然后提 PR。

一个应用的文件 `apps/my-app.json` 长这样：

```json
{
  "$schema": "../schema/app.schema.json",
  "slug": "my-app",
  "name": "My App",
  "author": "your-github-login",
  "kind": "native",
  "url": "https://my-app.dev",
  "repo": "you/my-app",
  "summary": { "en": "One line about the app.", "ja": "アプリの一行説明。" },
  "description": { "en": "A few sentences for the app's page." },
  "added": "2026-11-04T12:00:00Z"
}
```

- 文件名与 `slug` 相同。`added` 是条目加入站点的时间（UTC），站点 bot 会自动填写，手动添加时写当前时间。除官方指南外每个类别都有这个字段：作品集可以按它把最新的应用排在前面，UI 组件库、状态管理、文章和社区插件按它从早到晚排列；官方插件和官方指南按名字排列。每个条目一个文件，所以同时添加条目的多个 PR 不会互相冲突。
- 其他类别的文件同样在字段外带 `$schema`、`slug` 和 `added`（官方指南没有 `added`），具体字段见 `data/schema/` 里对应的 schema。
- `url` 是应用主页：官网，没有官网就填仓库地址，不要求在 GitHub 上。开源应用再用 `repo` 填 GitHub 仓库（`owner/name`），闭源应用不填。
- 文本字段按语言各写一份。`en` 必填；`zh-CN`、`zh-TW`、`ja`、`ko` 可选，缺少的语言显示英文。
- 每个文件都在 `$schema` 里指向自己的 JSON Schema（在 `data/schema/`），VS Code 等编辑器会在你输入时补全并检查字段。
- 链接必须是 https。截图请把宽约 1200px 的 WebP 放进 `apps/web/public/shots/`，并写 `"screenshot": "my-app.webp"`。应用图标写 `"icon": { "ailogo": "<id>" }`，id 来自 [ai-logo](https://github.com/yldm-tech/ai-logo)；用应用自己的图标时，把 256px 的 WebP 放进 `apps/web/public/icons/`，并写 `"icon": { "file": "my-app.webp" }`。不写则显示字母图标。
- `pnpm test` 会校验每个条目，出错时指出文件、条目和字段。CI 会在每个 PR 上运行它。

界面文案在 `packages/catalog/locales/`，每种语言一个 JSON 文件，键完全相同。`zh-CN.json` 是基准：新增的键要同时加进其余四个文件；缺键或 `{x}`/`{n}` 占位符不一致时，`pnpm typecheck` 和 `pnpm test` 会报错。

## 致谢

- [MyGo](https://github.com/egoist/mygo) 由 [egoist](https://github.com/egoist) 创建（MIT）。作品、插件和指南的数据以它的仓库和官网为准。
- 应用图标来自 [yldm-tech/ai-logo](https://github.com/yldm-tech/ai-logo)（MIT）或应用自己的图标；截图来自 egoist/mygo 的作品展示和各项目的 README。两者都归各应用作者所有，名称和标志是其商标，仅用于识别。

## 许可证

代码以 [MIT 许可证](LICENSE) 发布。
