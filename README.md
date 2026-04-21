# SRN 前端

**字幕中继网络（SRN）** 的 Web 前端 —— 一个去中心化、加密安全的字幕分发网络。本项目是基于 Vue 3 + Vite 构建的单页应用，部署在 Cloudflare Pages 上，并通过 SRN Worker 进行反向代理。

## 功能简介

- **字幕搜索** — 支持按影片/剧集名称搜索（可选 TMDB 自动补全），或直接通过 TMDB ID 查询
- **结果浏览** — 按字幕压缩包、季和语言分组展示，支持单集下载和整季包下载
- **中继统计** — 显示字幕记录总数、索引的唯一标题数和唯一剧集数
- **客户端身份** — 在浏览器 localStorage 中自动生成 Ed25519 密钥对；支持通过十六进制导入弹窗导入已有密钥对
- **工作量证明鉴权** — 在发起 API 请求前，于 Web Worker 中完成 SHA-256 PoW 挑战；导航栏实时显示挖矿进度

## 快速开始

```bash
npm install
npm run generate:api   # 从线上 Worker 的 OpenAPI Schema 生成 TypeScript 类型
npm run dev            # 启动本地开发服务器，地址 http://localhost:5173
```

开发服务器会将 `/v1/*`、`/ui`、`/doc` 和 `/favicon.svg` 代理到线上 SRN Worker（`srn-worker.delibill.workers.dev`），无需本地启动后端。

## 构建

```bash
npm run build    # 类型检查（vue-tsc）后构建到 dist/
npm run preview  # 在本地预览生产构建
```

产物输出至 `dist/`。构建时会将 `__APP_VERSION__`（取自 `package.json`）注入到应用中；构建阶段无需任何环境变量。

## 其他命令

```bash
npm run format:check  # 检查代码格式（Prettier）— CI 中运行
npm run format:fix    # 自动修复格式问题
npm run generate:api  # 从 Worker 的 /doc 接口重新生成 src/types/srn-api.d.ts
```

## 部署

推送到 `main` 分支后，`.github/workflows/deploy.yml` 会自动部署到 Cloudflare Pages。Pull Request 会触发预览部署，并将预览 URL 以评论形式发布到 PR 中。

Cloudflare Pages 的 `*.pages.dev` 域名仅作为 CDN 源站使用 —— 终端用户通过 SRN Worker 的域名访问应用，Worker 将 `/*` 请求代理到该 Pages 部署。

所需 GitHub Secrets：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`。

## 架构

```
浏览器
  │
  ▼
SRN Worker  (srn-worker.delibill.workers.dev)
  ├─ /v1/*  →  API（D1 + R2，PoW 鉴权）
  ├─ /ui    →  Scalar API 文档
  └─ /*     →  本应用（Cloudflare Pages）
```

所有 API 调用均使用相对路径（`/v1/…`），因此会解析到 Worker 所服务的任意域名。类型化 API 客户端（`src/lib/apiClient.ts`）由 `openapi-fetch` + `openapi-typescript` 根据 Worker 的 OpenAPI Schema 自动生成。

<!-- doc-sha: 07a7fda972951778c3ac11528e074ae5162dd1fe -->
