# 前端代码评审助手

这个仓库包含两部分：

1. `src/` — 基于 React + Ant Design 的前端界面，支持粘贴前端代码、补充上下文，并展示 AI 生成的评审建议。
2. `worker/` + `mastra/` — Cloudflare Worker 入口，通过 Mastra 定义的 `frontendReviewAgent` 调用 OpenAI（或其它模型）生成结构化的代码审查报告。

## 快速开始

```bash
npm install
npm run dev           # 启动前端
wrangler dev          # 本地启动 Worker（会读取 worker/index.ts）
```

> Worker 会直接 import `mastra`，因此需要在环境变量中配置 `OPENAI_API_KEY`（或其它模型所需密钥）。

## 环境变量

前端仅依赖 Vite，默认把请求发送到 `/api/review`；如果部署在其他域名，可以配置 `VITE_REVIEW_API_URL`。  
Worker 读取以下变量：

- `OPENAI_API_KEY`（或模型所需的密钥）
- `AGENT_API_KEY`（用于前端与 Worker 之间的简单校验，可选）
- 其它 Cloudflare 相关变量可直接写入 `wrangler.toml` 的 `[vars]` 或使用 `wrangler secret put`

## 目录结构

```
.
├── src/                # 前端应用
│   ├── routes/
│   ├── App.tsx
│   └── ...
├── worker/index.ts     # Cloudflare Worker 入口
├── mastra/             # Mastra 配置（agents、workflows 等）
└── wrangler.toml       # Worker 配置
```

## Worker API

- `POST /api/review`  
  Body:
  ```json
  {
    "code": "/* 需要评审的代码 */",
    "filename": "App.tsx",
    "framework": "react",
    "context": "可选的业务背景"
  }
  ```
  Response:
  ```json
  {
    "success": true,
    "report": "Markdown 格式的评审建议"
  }
  ```

- `GET /health` — 健康检查

## 部署

1. 设置 Cloudflare KV/Secrets（至少需要 `OPENAI_API_KEY`）：
   ```bash
   wrangler secret put OPENAI_API_KEY
   ```
2. 构建前端（若需要静态托管）：
   ```bash
   npm run build
   ```
3. 部署 Worker：
   ```bash
   wrangler deploy
   ```

## 如何扩展

- 想接入其它模型：在 `mastra/agents/code-review-agent.ts` 中修改 `model` 字段即可。
- 想添加更细粒度的提示词：更新 `REVIEW_PROMPT`（Mastra Agent 指令）或 Worker 里的 `buildPrompt`。
- 想把评审结果同步到 GitHub/飞书：在 Worker 中解析 `report` 后调用对应的 Webhook。

欢迎根据自己的团队规范对提示词和界面进行个性化定制。 code-review 快乐 🎉
