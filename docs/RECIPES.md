# Agent Recipes

Agent recipes describe deterministic automation flows executed by the localhost agent via the SDK. Each recipe is a JSON document containing an ordered list of steps.

## 1. JSON Schema

```json
{
  "name": "poshmark.demo",
  "steps": [
    { "type": "open", "url": "https://poshmark.com/create-listing" },
    { "type": "fill", "items": [
      { "selector": "input[name=title]", "text": "Vintage Jacket" }
    ]},
    { "type": "upload", "selector": "input[type=file]", "files": ["file:///path/photo.jpg"] },
    { "type": "click", "selector": "button[type=submit]" },
    { "type": "wait", "event": "PUBLISHED", "timeoutMs": 20000 }
  ]
}
```

### Step Types

| Type | Required Fields | Description |
| --- | --- | --- |
| `open` | `url` | Navigate the attached Chrome tab to a form URL. |
| `fill` | `items[]` (`selector`, `text`) | Human-paced typing into form controls. |
| `upload` | `selector`, `files[]` | Attach files via `<input type="file">` elements. Use absolute file URIs. |
| `click` | `selector` | Trigger button/CTA clicks; agent waits for navigation idle. |
| `wait` | `event`, `timeoutMs?` | Block until the specified SSE event is observed (default timeout 15 s). |

### Authoring Guidelines

- Prefer stable selectors (IDs, `data-*`, accessible names) over brittle CSS chains.
- Keep human intent clear—field values should be representative but non-sensitive.
- Respect platform auth flows; if a login or challenge page appears the agent emits `NEEDS_LOGIN` or `CHALLENGE_DETECTED` and should abort.
- File uploads must use fully-qualified `file:///` URIs with OS-appropriate casing and permissions.
- Allow enough wait time for publication pages (`PUBLISHED`) or intermediate confirmation modals.

## 2. Reference Recipes

Two sample recipes ship with the repo under `packages/agent-recipes/`:

- `poshmark.demo.json` – Baseline listing workflow for Poshmark drafts.
- `mercari.demo.json` – Equivalent flow for Mercari listings.

## 3. Executing Recipes

Use the provided runner to execute recipes through the SDK.

```bash
# Build the SDK first
yarn --cwd packages/agent-sdk build

# Export a valid single-use token minted from /api/agent/start
export AGENT_SESSION_TOKEN="<jwt>"

# Run the recipe
node examples/run-recipe.js packages/agent-recipes/poshmark.demo.json
```

The runner streams all events to stdout and aborts on timeouts or agent errors. Adjust `AGENT_BASE_URL` if the agent listens on a non-default host.
