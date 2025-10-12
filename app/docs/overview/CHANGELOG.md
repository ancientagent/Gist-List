# Gister Changelog

## Sweep B: Buyer Search Marketplace & Advanced Features (Oct 9-12, 2025)

### 🔍 Buyer Search Marketplace
- **SearchIndex Model**: Implemented comprehensive facet-based quality grading system for buyer search
- **Voice Search**: Added voice input for buyer search queries
- **Advanced Faceted Search API**: Multi-field search with quality scoring and relevance ranking
- **Metadata-Only Architecture**: Optimized photo storage - only metadata and thumbnails stored, images hosted by marketplaces

### 🔔 Notifications Infrastructure Revamp
- **Notifications System**: Complete overhaul of notification handling and display
- **Mood Engine**: Context-aware notification tones and styling
- **Section-Scoped Chips**: Smart categorization of notifications by section
- **Quick Facts Panel**: UI framework for contextual insights

### 🧪 E2E Test Automation
- **Playwright Integration**: Comprehensive end-to-end test framework
- **Automated Testing**: Sign-in, photo upload, listing creation, marketplace connections
- **Test Helpers**: Reusable test utilities for common workflows
- **CI/CD Ready**: Test automation framework for deployment pipeline

### 🔗 Marketplace Integrations
- **eBay OAuth**: Full OAuth 2.0 integration with consent flow
- **Etsy OAuth**: Complete Etsy marketplace connection with API integration
- **Reverb API**: API key-based integration for musical instrument listings
- **Connections UI**: Dedicated page for managing marketplace connections
- **Auto-Post Status Tracking**: Real-time status updates for marketplace posting

### 🔌 Chrome Extension Integration
- **Extension Auth API**: Secure authentication endpoints for extension communication
- **Listings Sync**: Real-time sync of listings between app and extension
- **Scheduled Posting**: API for timed auto-posting to multiple marketplaces
- **Extension v2.0.0**: Rebranded and packaged Gister Chrome Extension

### 🗄️ Database & Schema Updates
- **SearchIndex Table**: Denormalized search data with facet grading (50+ fields)
- **ScheduledPost Model**: Support for timed marketplace posting
- **Photo Metadata**: Updated schema for metadata-only architecture
- **Listing Enhancements**: Additional fields for search indexing and quality scoring
- **Multiple Migrations**: Schema evolution with backward compatibility

### 📱 PWA & Mobile Readiness
- **PWA Manifest**: Configured for "Add to Home Screen" on iOS/Android
- **Mobile-Optimized UI**: Responsive design for all screen sizes
- **Touch-Friendly**: Optimized interactions for mobile devices
- **Viewport Configuration**: Proper mobile viewport settings

### 🏗️ Infrastructure & DevOps
- **Merge Checklist**: Comprehensive pre/post-merge validation process
- **Git Workflow**: Feature branch strategy with automated conflict detection
- **Build Optimization**: Improved build times and caching
- **Deployment Pipeline**: Streamlined deployment to gistlist.abacusai.app

---

## Pass A: GISTer AI Assistant Upgrade (Framework) (Oct 9, 2025)

- Added section-scoped chips and INSIGHT type wiring
- Extended notification payloads with `section`, `mood`, `context` (in `actionData`)
- Introduced mood engine and tone tooltips
- Added Quick Facts panel (UI stub only)
- Feature flags enabled by default for testing

---

## Previous Releases

### Core Features (Launch - Oct 8, 2025)
- 📸 **Camera Interface**: AI-powered photo capture and listing generation
- 🎤 **Voice Input**: Voice-to-text for hands-free listing creation
- 🤖 **AI Analysis**: GPT-4 Vision for automatic item description and pricing
- 💰 **Market Research**: Real-time pricing data from multiple marketplaces
- 👤 **Authentication**: NextAuth.js with email/password signup
- 💳 **Stripe Integration**: Premium subscriptions and payment processing
- 🗃️ **PostgreSQL Database**: Relational data storage with Prisma ORM
- 📦 **Listing Management**: Create, edit, and manage inventory
- 🎨 **Modern UI**: Responsive design with Tailwind CSS and shadcn/ui

