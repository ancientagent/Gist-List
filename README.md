<div align="center">

<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

  <h1>Built with AI Studio</h2>

  <p>The fastest path from prompt to production with Gemini.</p>

  <a href="https://aistudio.google.com/apps">Start building</a>

</div>

---

## 🧩 Documentation Map

For technical and creative context:

- [Agent Instructions](AGENT_INSTRUCTIONS.md) – operational guardrails for Codex Cloud
- [GISTer Core Bible](docs/GISTer_Core_Bible.md) – defines GISTer's tone, ethics, and behavior
- [GISTer Copy Library](docs/assistant_copy_library.md) – sample dialogue and reflections
- [Codex Cloud Build Brief](docs/Codex%20Cloud%20Build%20Brief%20%E2%80%9CGISTer%E2%80%9D%20Assistant.md) – full assistant system architecture
- [Feature 19: GISTer Assistant System](docs/features/19_GISTer_Assistant%20_System.md) – assistant dialogue and behavior spec
- [Feature 20: Affinity Learning System](docs/features/20_Affinity_Learning_System.md) – personalization and learning spec
- [Feature 21: Reflection Library](docs/features/21_Reflection_Library.md) – contextual reflection system spec
- [Features Documentation](docs/FEATURES.md) – complete feature inventory
- [Architecture](docs/ARCHITECTURE.md) – system design patterns
- [API Documentation](docs/API.md) – endpoint reference
- [Database Schema](docs/DATABASE.md) – data models
- [Changelog](docs/CHANGELOG.md) – living document of all changes
- [Roadmap](docs/ROADMAP.md) – current priorities and future plans
- [Agent API](docs/AGENT_API.md) – localhost + backend orchestration
- [Agent Recipes](docs/RECIPES.md) – automation JSON schema & samples
- [Agent Local Dev](docs/LOCAL_DEV.md) – setup, debugging, troubleshooting

## 🚀 Agent Automation Quickstart

1. **Install dependencies**
   ```bash
   yarn --cwd packages/agent install
   yarn --cwd packages/agent-sdk install
   yarn --cwd app install
   ```
2. **Start Chrome with CDP** (macOS example)
   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
   ```
3. **Run the Electron agent**
   ```bash
   export AGENT_JWS_SECRET="local-dev-secret"
   yarn --cwd packages/agent dev
   ```
4. **Enable backend agent mode**
   ```bash
   cd app
   export AGENT_MODE=1
   export AGENT_BASE_URL="http://127.0.0.1:8765"
   yarn dev
   ```
5. **Mint a session token & execute a recipe**
   ```bash
   curl -X POST http://localhost:3000/api/agent/start \
     -H 'Content-Type: application/json' \
     --cookie 'next-auth.session-token=…' \
     -d '{"url":"https://poshmark.com/create-listing","actions":["open","fill","upload","click"],"device":{"os":"macOS","name":"Laptop"}}'

   export AGENT_SESSION_TOKEN="<jwt-from-response>"
   yarn --cwd packages/agent-sdk build
   node examples/run-recipe.js packages/agent-recipes/poshmark.demo.json
   ```

The runner streams events (`OPENED_FORM`, `PUBLISHED`, etc.) from the local agent to stdout. For more details see `docs/AGENT_API.md` and `docs/LOCAL_DEV.md`.
