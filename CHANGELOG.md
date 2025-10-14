
## [Unreleased] - 2025-10-14

### Added
- **Test Sample Data Feature** - Development-only "Use Sample" button on camera screen
  - Creates test listings with brief descriptions (e.g., "vintage Canon camera")
  - Triggers full AI analysis pipeline for testing
  - Enables faster testing of notifications, AI analysis, and premium features
  - Only visible in development mode (`NODE_ENV !== 'production'`)
  - New API endpoint: `/api/listings/sample`

### Changed
- Camera screen component now redirects to `/listings` page after creating sample listing
- Sample listings go through complete AI analysis flow (not pre-filled)

