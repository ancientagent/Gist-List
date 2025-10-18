# GISTer Agent — Local & Cloud APIs

This document describes the production-ready interfaces that power the local-first agent. It covers both the **localhost service** that runs inside the Electron container as well as the **Next.js backend endpoints** that orchestrate jobs and mint secure session tokens.

---

## 1. Localhost Agent API (Electron + Puppeteer Core)

- **Base URL:** `http://127.0.0.1:8765`
- **Authentication:** Single-use JWS (`HS256`) provided by the backend.
- **Consent:** All DOM-manipulation routes require explicit user approval through the consent overlay.

### 1.1 Session Lifecycle

| Endpoint | Method | Description |
| --- | --- | --- |
| `/v1/session/start` | `POST` | Start a consent-gated session. Body: `{ token, url, actions[] }`. Returns `{ sessionId, consent }`. Tokens expire after 120 s and are single-use. |
| `/v1/session/cancel` | `POST` | Cancels the active session `{ sessionId }` and tears down state. |

### 1.2 Browser & DOM Control

| Endpoint | Method | Body | Response | Events |
| --- | --- | --- | --- | --- |
| `/v1/browser/open` | `POST` | `{ sessionId, url? }` | `{ ok: true }` | `OPENING`, `OPENED_FORM` |
| `/v1/dom/fill` | `POST` | `{ sessionId, steps:[{selector,text}] }` | `{ ok: true }` | `FILLED_FIELDS` |
| `/v1/dom/upload` | `POST` | `{ sessionId, selector, files[] }` | `{ ok: true }` | `UPLOADED_IMAGES` |
| `/v1/dom/click` | `POST` | `{ sessionId, selector }` | `{ ok: true }` | `SUBMITTED`, `PUBLISHED` |
| `/v1/page/state` | `GET` | `?sessionId=` | `{ url, title }` | – |

### 1.3 Event Stream

- **Endpoint:** `GET /v1/events/stream?sessionId=…`
- **Protocol:** Server-Sent Events (`text/event-stream`).
- **Payload:** `{ type, timestamp, data? }`
- **Event Types:** `OPENING`, `OPENED_FORM`, `FILLED_FIELDS`, `UPLOADED_IMAGES`, `SUBMITTED`, `PUBLISHED`, `NEEDS_LOGIN`, `CHALLENGE_DETECTED`, `ERROR` (with `{ code }`).

### 1.4 Error Codes

| Code | Meaning |
| --- | --- |
| `INVALID_TOKEN` | Token failed verification or expired. |
| `CONSENT_REQUIRED` | User has not approved the consent overlay. |
| `CONSENT_DENIED` | User explicitly rejected the consent overlay. |
| `SESSION_CANCELLED` | Session was cancelled locally before completion. |
| `SESSION_EXPIRED` | Session TTL elapsed; mint a new token. |
| `POLICY_DENIED` | Domain not on allow-list. |
| `INVALID_ACTION` | Requested action is not supported or approved. |
| `BAD_SELECTOR` | CSS selector not found within timeout. |
| `RATE_LIMITED` | Session exceeded actions-per-minute budget. |
| `AGENT_ERROR` | Unexpected internal error (see Electron logs). |

---

## 2. Backend Agent Orchestration (Next.js)

All routes live under `app/app/api/agent/*`. They require a signed-in user and respect the `AGENT_MODE=1` feature flag. When the flag is disabled every route returns a disabled response.

### 2.1 `POST /api/agent/start`

Mint a short-lived JWS and persist an `AgentSession` record.

- **Body:**
  ```json
  {
    "url": "https://poshmark.com/create-listing",
    "actions": ["open", "fill", "upload", "click"],
    "device": { "id": "optional", "os": "macOS", "name": "MacBook Pro" }
  }
  ```
- **Response:**
  ```json
  {
    "token": "<jwt>",
    "expiresAt": "2025-10-14T18:45:00.000Z",
    "session": {
      "id": "cls...",
      "consentState": "pending",
      "domain": "poshmark.com",
      "actions": ["open", "fill", "upload", "click"]
    }
  }
  ```
- **Notes:**
  - Domains are filtered via the policy router (`resolvePostingStrategy`).
  - Device metadata is normalized into `AgentDevice` with `lastSeenAt` heartbeat updates.

### 2.2 `POST /api/agent/run`

Start a session and optionally execute automation steps through the localhost agent.

- **Body:**
  ```json
  {
    "url": "https://www.mercari.com/sell/",
    "actions": ["open", "fill", "upload", "click"],
    "steps": [
      { "type": "open", "url": "https://www.mercari.com/sell/" },
      { "type": "fill", "items": [{ "selector": "input[name=title]", "text": "Sample" }] },
      { "type": "click", "selector": "button[type=submit]" },
      { "type": "wait", "event": "PUBLISHED", "timeoutMs": 20000 }
    ],
    "device": { "os": "Windows", "name": "Desktop" }
  }
  ```
- **Response:**
  ```json
  {
    "session": {
      "id": "cls...",
      "agentSessionId": "f4a5...",
      "consent": "pending",
      "expiresAt": "2025-10-14T18:45:00.000Z"
    }
  }
  ```
- **Behavior:**
  - Retries DOM actions until consent is granted (max ~15 s backoff).
  - Updates Prisma `AgentSession` with the remote `agentSessionId` for SSE proxying.
  - Returns `500` with `error: AGENT_RUN_FAILED` if any step fails.

### 2.3 `GET /api/agent/events/:jobId`

Proxy Server-Sent Events from the localhost agent back to authenticated clients.

- Resolves the job via Prisma ensuring ownership.
- Streams events with `retry: 5000` header and aborts when the client disconnects.

### 2.4 `POST /api/agent/strategy`

Simple router endpoint that reports which automation pipeline to use for a given domain, honoring `AGENT_MODE` and allow-lists.

```json
{ "domain": "poshmark.com" } -> { "strategy": "agent" }
```

---

## 3. Data Model Touchpoints

- `AgentDevice` keeps track of registered desktops with heartbeat timestamps and cached policy snapshots.
- `AgentSession` stores minted tokens, consent state, remote session IDs, and expiry metadata.
- Both models are linked to `User` and automatically updated by the backend routes above.

---

## 4. Security & Compliance Checklist

- **JWS**: HS256, ≤120 s TTL, single-use enforcement in the Electron runtime.
- **Policy Engine**: `policy.json` allow-list for domain gating, rate limiting, navigation same-origin guard.
- **Consent Overlay**: Electron window shows domain/action summary before enabling `/v1/dom/*`.
- **PII Hygiene**: Form values are never logged or persisted—only structural events are emitted.
- **SSE Proxy**: Requires authenticated user and matching `AgentSession` ownership before streaming.

Refer to `docs/LOCAL_DEV.md` for setup, Chrome DevTools debugging, and troubleshooting tips.
