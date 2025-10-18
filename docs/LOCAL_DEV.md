# Local Development — GISTer Agent

This guide walks through installing, running, and debugging the hardened local agent stack.

## 1. Prerequisites

- Node.js 20+
- npm, yarn, or pnpm (monorepo is tool-agnostic)
- Chrome or Microsoft Edge with remote debugging enabled
- macOS 13+ or Windows 11 (Electron app ships for both)

## 2. Chrome DevTools Protocol Setup

Start Chrome with the remote debugging port exposed before launching the agent:

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Windows
"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222
```

If you omit this step the agent falls back to launching its own Chromium instance for development.

## 3. Install & Build Packages

```bash
# Install dependencies
yarn --cwd packages/agent install
yarn --cwd packages/agent-sdk install

# Build TypeScript outputs
yarn --cwd packages/agent build
yarn --cwd packages/agent-sdk build
```

> Tip: In development you can run `yarn --cwd packages/agent dev` to start the Electron app with `ts-node`.

## 4. Running the Agent

1. Export the shared secret used to mint/verify JWS tokens:
   ```bash
   export AGENT_JWS_SECRET="super-secret-hmac-key"
   ```
2. Ensure Chrome is running with remote debugging (see above).
3. Launch the Electron agent:
   ```bash
   yarn --cwd packages/agent dev
   ```
4. The local API listens on `http://127.0.0.1:8765` and displays a consent overlay when sessions start.

## 5. Backend Integration

The Next.js app consumes the local agent when `AGENT_MODE=1` is set.

```bash
cd app
export AGENT_MODE=1
export AGENT_BASE_URL="http://127.0.0.1:8765"
yarn dev
```

To mint a session token:

```bash
curl -X POST http://localhost:3000/api/agent/start \
  -H 'Content-Type: application/json' \
  --cookie 'next-auth.session-token=…' \
  -d '{
    "url": "https://poshmark.com/create-listing",
    "actions": ["open","fill","upload","click"],
    "device": { "os": "macOS", "name": "Workstation" }
  }'
```

Use the returned JWT with the localhost `/v1/session/start` endpoint.

## 6. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `INVALID_TOKEN` | Ensure the backend secret (`AGENT_JWS_SECRET`) matches the Electron runtime. Tokens expire in 120 s and are single-use. |
| `POLICY_DENIED` | Add the domain to `packages/agent/policy.json` and restart the agent. |
| `CONSENT_REQUIRED` | Click **Allow** on the consent overlay; routes retry automatically with exponential backoff. |
| File uploads fail | Confirm macOS full-disk access permissions and that paths use `file:///` URIs. |
| Event stream disconnects | Check that no firewall blocks `127.0.0.1:8765` SSE traffic; the backend proxies via `/api/agent/events/:jobId`. |

## 7. Observability

- Electron logs stdout/stderr to the console (see `packages/agent/logs/`).
- Backend errors are surfaced in Next.js server logs with prefixes `Agent start error`, `Agent run error`, and `Agent SSE proxy error`.
- Rate limiting and consent failures emit `ERROR` events on the SSE stream for client telemetry.
