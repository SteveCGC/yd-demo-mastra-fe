# YD Mastra Agent

This workspace contains the Mastra agent (`mastra/`) plus a Vite dashboard (`src/`). The production backend is a lightweight Cloudflare Worker (`worker/index.ts`) that calls the Mastra agent directly without the hefty `#server` runtime.

## Prerequisites

- Node.js 20+
- A Cloudflare account with Workers enabled and an API token that can deploy Workers + manage routes
- Required API keys (OpenAI, any custom agent keys)

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

Key values:

- `OPENAI_API_KEY` – used by the Mastra agent  
- `AGENT_API_KEY` – optional custom key exposed to the Worker

Secrets should not live in `wrangler.toml`. Instead, rely on the `.env` file locally and `wrangler secret put <NAME>` once the Worker is created.

## Local Development

- `npm run dev` – Frontend (Vite)
- `npm run dev:mastra` – Run Mastra locally with the Cloudflare deployer disabled
- `npm run lint` – ESLint

## One-Command Cloudflare Deploy

1. Ensure `.env` is populated and run `npm install` if you have not already.
2. Execute:

```bash
npm run deploy:cloudflare
```

Wrangler builds `worker/index.ts` (which imports the `mastra` instance) and deploys it directly—no intermediate `.mastra/output` bundle is required, so the final Worker stays under Cloudflare's bundle limits. Adjust routes/custom domains via `wrangler.toml` if needed (the default file already includes a sample `[[routes]]` block).
