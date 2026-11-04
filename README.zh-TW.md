# MyGo Dock

[![Website](https://img.shields.io/badge/website-mygodock.dev-3fd3f5)](https://mygodock.dev)
[![CI](https://github.com/yldm-tech/awesome-mygo/actions/workflows/ci.yml/badge.svg)](https://github.com/yldm-tech/awesome-mygo/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/yldm-tech/awesome-mygo)](LICENSE)

把圍繞 [MyGo](https://github.com/egoist/mygo) 的應用、外掛、元件和文件收集在一個網站裡：**[mygodock.dev](https://mygodock.dev)**。MyGo 是用 Go 打造桌面應用的工具包，介面可以是原生 UI，也可以是 Web 前端。

[English](README.md) · [简体中文](README.zh-CN.md) · 繁體中文 · [日本語](README.ja.md) · [한국어](README.ko.md)

[![MyGo Dock](.github/assets/banner.png)](https://mygodock.dev)

## 網站內容

- **作品**：23 款用 MyGo 打造的桌面應用，每款都有完整介紹、截圖（專案有提供時）、介面類型（原生 UI 或 Web 前端），以及同一作者的其他作品。
- **外掛**：11 個官方外掛，標明適用於網頁、原生 UI 還是兩者，另有 `mygo-cli` 工具鏈。
- **UI 元件**：為 MyGo 應用打造的元件庫、主題與圖示。
- **狀態管理**：MyGo 應用的狀態方案，以及 MyGo 內建的綁定服務、通道和型別化事件。
- **文件**：20 篇官方指南、一篇社群文章和官方資源。
- 用 <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd> **搜尋**全部內容；想收錄某個專案時，提交表單會替你寫好條目。

網站支援簡體中文、繁體中文、英語、日語和韓語。每個頁面在每種語言下都有獨立網址（`?lang=en`），由伺服器端渲染，並帶有 hreflang 連結和 sitemap。

## 技術實作

pnpm monorepo，由 [TanStack Start](https://tanstack.com/start) 執行在 [Cloudflare Workers](https://workers.cloudflare.com) 上：

| 路徑 | 內容 |
|---|---|
| `apps/web` | 網站：React 19、TanStack Start（伺服器端渲染），以及帶 `@cloudflare/vite-plugin` 的 Vite。`wrangler.jsonc` 把它部署到 `mygodock.dev`。 |
| `packages/catalog` | 資料：應用、外掛、元件、狀態方案、指南，五種語言的介面文案，搜尋與提交條目。測試會檢查每個條目在每種語言下都已填寫完整。 |

應用圖示來自 [yldm-tech/ai-logo](https://github.com/yldm-tech/ai-logo)，由它的 CDN 提供；它未收錄的少數應用使用 `apps/web/public/icons/` 裡的官方圖示。

## 本機開發

需要 Node.js 24 或更新版本，以及 pnpm。

```sh
pnpm install
pnpm dev          # 本機網站，由 Workers 執行環境渲染
pnpm test         # catalog 測試
pnpm typecheck
pnpm build
pnpm preview      # 在 Workers 執行環境中執行正式建置
```

`pnpm deploy` 會用 Wrangler 建置並部署，需要一個包含 `apps/web/wrangler.jsonc` 中網域 zone 的 Cloudflare 帳戶。

## 收錄專案

應用來自 MyGo 官方的作品展示。要收錄應用，請向 [`egoist/mygo` 的 `website/src/showcase.ts`](https://github.com/egoist/mygo/blob/main/website/src/showcase.ts) 提交 PR。元件、外掛、狀態方案和文章，請在本倉庫[提交 Issue](https://github.com/yldm-tech/awesome-mygo/issues/new)。網站上的「提交」表單兩種都能替你寫好：作品產生 showcase.ts 條目，其他類別產生填好內容的 Issue。

要直接為本站新增內容，編輯 `packages/catalog/src`：

- `catalog.ts`：應用（`APP_ROWS`，附五種語言的一句話描述）、UI 元件、狀態方案、外掛和指南。
- `about.ts`：應用的完整介紹，五種語言。
- `strings.ts`：介面文案，每個鍵是一個包含五種語言的陣列。
- 截圖放在 `apps/web/public/shots/`，WebP 格式，寬約 1200px。

提交 PR 前請執行 `pnpm test`：缺少翻譯、缺少描述或連結不是 https 時，測試會失敗。

## 致謝

- [MyGo](https://github.com/egoist/mygo) 由 [egoist](https://github.com/egoist) 建立（MIT）。作品、外掛和指南的資料以它的倉庫和官網為準。
- 應用圖示來自 [yldm-tech/ai-logo](https://github.com/yldm-tech/ai-logo)（MIT）或應用自己的圖示；截圖來自 egoist/mygo 的作品展示和各專案的 README。兩者都歸各應用作者所有，名稱和標誌是其商標，僅用於識別。

## 授權

程式碼以 [MIT 授權](LICENSE) 發布。
