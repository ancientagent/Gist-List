
# GISTer Changelog
**Living Document - Update with every code change**

---

## 2025-10-15 - Codex Agent (Telemetry Phase 1)

### Added
- feat(telemetry): introduced `trackEvent` helper for client-side tracking
- feat(telemetry): created `/api/telemetry/track` endpoint for event recording
- feat(listing): instrumented manual price updates, condition changes, and price chip applications
- feat(listing): surfaced Smart Chip suggestions when selecting Like New (comes with) or Poor (missing)

### Notes
- note: exercise price + condition edits in dev and confirm events land in `TelemetryEvent`

---

## 2025-10-14 - DeepAgent (Session 2)

### Added
- feat(dev): Development helper - "Use Sample" button in camera page
- feat(dev): Sample listing API endpoint for quick testing
- feat(dev): Five sample items with varied data (vintage, collectibles, electronics, etc.)

### Documentation
- docs: Updated CHANGELOG.md with development tools additions
- docs: Updated session summary for dev tools

---

## 2025-10-14 - DeepAgent (Session 1)

### Added
- feat(docs): Implemented multi-agent documentation strategy
- feat(docs): Created AGENT_INSTRUCTIONS.md for new agents
- feat(docs): Created DOCUMENTATION_STRATEGY.md for documentation philosophy
- feat(docs): Created living documents in `/docs/` folder
- feat(docs): Created `/sessions/` folder for session summaries

### Changed
- refactor(ui): Reduced condition dropdown sensitivity to prevent accidental changes
- style(ui): Improved "Not It" button placement on camera page
- style(ui): Fixed content box formatting for premium pack descriptions

### Fixed
- fix(ui): Resolved dropdown touch sensitivity issues on mobile
- fix(premium): Special items now always detected regardless of tier
- fix(premium): Free users see special item teaser with upgrade prompt

### Documentation
- docs: Created comprehensive CHANGELOG.md (this file)
- docs: Created FEATURES.md with feature inventory
- docs: Created ARCHITECTURE.md with system design
- docs: Created API.md with endpoint documentation
- docs: Created DATABASE.md with schema documentation
- docs: Created ROADMAP.md with future plans
- docs: Moved SESSION_SUMMARY_2025-10-14.md to sessions/ folder

---

## Historical Changes (Pre-Documentation Strategy)

### 2025-10-12 - Sweep B: Buyer Search Marketplace
- feat(search): Implemented comprehensive facet-based quality grading system
- feat(search): Added voice search for buyer queries
- feat(search): Advanced faceted search API with quality scoring
- feat(storage): Metadata-only architecture for photo storage

### 2025-10-10 - Notifications Infrastructure Revamp
- feat(notifications): Complete overhaul of notification handling
- feat(notifications): Context-aware mood engine
- feat(notifications): Section-scoped chips system
- feat(ui): Quick Facts panel framework

### 2025-10-09 - E2E Test Automation
- feat(testing): Playwright integration for E2E tests
- feat(testing): Automated testing for sign-in, photo upload, listing creation
- feat(testing): Test helpers for common workflows

### 2025-10-08 - Marketplace Integrations
- feat(ebay): Full OAuth 2.0 integration with consent flow
- feat(etsy): Complete Etsy marketplace connection
- feat(reverb): API key-based integration for musical instruments
- feat(ui): Connections page for managing marketplace credentials
- feat(marketplace): Auto-post status tracking

### 2025-10-07 - Chrome Extension Integration
- feat(extension): Extension auth API for secure communication
- feat(extension): Real-time listings sync between app and extension
- feat(extension): Scheduled posting API for timed auto-posting
- feat(extension): Rebranded GISTer Chrome Extension v2.0.0

### 2025-10-05 - Database & Schema Updates
- feat(db): SearchIndex table with denormalized search data
- feat(db): ScheduledPost model for timed marketplace posting
- feat(db): Photo metadata schema updates
- feat(db): Listing enhancements for search indexing

### 2025-10-03 - PWA & Mobile Readiness
- feat(pwa): PWA manifest for "Add to Home Screen"
- feat(mobile): Mobile-optimized responsive UI
- feat(mobile): Touch-friendly interactions
- feat(mobile): Proper mobile viewport configuration

---

## Conventional Commits Legend

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation only changes
- **style**: Formatting, missing semi colons, etc; no code change
- **refactor**: Refactoring production code
- **test**: Adding tests, refactoring tests; no production code change
- **chore**: Updating build tasks, package manager configs, etc; no production code change

---

**Last Updated**: 2025-10-14  
**Maintained By**: All agents and developers
