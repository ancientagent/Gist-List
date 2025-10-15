
## [Unreleased] - 2025-10-14

### Added - GIST Mode UI Overhaul
- **Camera Toggle** - Users can now turn camera on/off
  - Camera OFF: Shows GISTer assistant interface
  - Camera ON: Traditional photo capture mode
  - Smooth transitions between modes
- **GISTer Assistant Interface** - Friendly assistant for text-only listings
  - Beautiful gradient background
  - Welcoming character placeholder
  - Ready for future enhancements
- **Text-Only Listings** - Create listings without photos
  - Type or dictate description
  - Get full AI analysis
  - Same experience as photo-based listings
- **Settings Page** - New dedicated settings screen
  - User profile and subscription tier display
  - Account, notifications, privacy settings
  - Help & support access
  - Sign out functionality moved here
- **Post Status Indicators** - Visual status for each listing
  - Color-coded status badges
  - Post buttons for ready listings
  - Clear at-a-glance understanding
- **Store Manager (Premium)** - New premium feature placeholder
  - Visible but locked for free users
  - Positioned at bottom right of listings
  - Encourages premium upgrades
- **Notification Badges** - (!) indicators on draft listings
  - Red badge on listing thumbnails
  - Alerts users to items needing attention
- **Test Sample Data Feature** - Development-only "Use Sample" button on camera screen
  - Creates test listings with brief descriptions (e.g., "vintage Canon camera")
  - Triggers full AI analysis pipeline for testing
  - Enables faster testing of notifications, AI analysis, and premium features
  - Only visible in development mode (`NODE_ENV !== 'production'`)
  - New API endpoint: `/api/listings/sample`

### Changed
- **Camera Screen Navigation** - Simplified from 3-button to 2-button layout
  - Settings (left) and Listings (right) buttons
  - Removed bottom navigation bar
  - Cleaner, more focused interface
- **Listings Screen Navigation** - Simplified from 3-button to 2-button layout
  - "Gistings" button (left) links to camera/GIST mode
  - "Store Manager" button (right, locked)
  - Removed camera FAB button
- **Connections Icon** - Changed from gear to cable connector (Plug2)
  - More intuitive representation
  - Moved to header (from bottom nav)
- **Sign Out Location** - Moved from listings header to settings page
  - Better organization
  - Cleaner listings interface
- **Listing Cards** - Enhanced with status bars and post buttons
  - Status bar shows post state and timing
  - Post button available for non-posted listings
  - Improved visual hierarchy
- Camera screen component now redirects to `/listings` page after creating sample listing
- Sample listings go through complete AI analysis flow (not pre-filled)

### Removed
- 3-button bottom navigation bars (replaced with 2-button layouts)
- Camera FAB button from listings page
- Sign out button from listings header

