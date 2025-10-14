# GISTer Product Roadmap
**Living Document - Update as priorities change**

---

## 🎯 Vision

**Mission**: Empower resellers to list items 10x faster with AI-powered automation and multi-platform marketplace integrations.

**Target Users**:
- Individual resellers (eBay, Mercari, Poshmark sellers)
- Small business resellers
- Thrift store operators
- Estate sale professionals

---

## 🏆 Current State (October 2025)

### ✅ Completed Features:
- AI-powered listing generation (camera → listing)
- Special items detection with premium gating
- Marketplace integrations (eBay, Etsy, Reverb)
- Chrome extension for semi-automated posting
- Premium feature gating (FREE, BASIC, PRO tiers)
- Smart notifications system (chips)
- Buyer search marketplace with facet grading
- Cost tracking & transparency
- PWA support for mobile

### 📊 Metrics:
- Users: Early stage (<100)
- Listings Created: Growing
- Marketplaces: 3 direct integrations + 6 via extension
- AI Accuracy: ~85% confidence on item identification

---

## 🚧 In Progress (October 2025)

### Telemetry & Analytics
**Owner**: GPT (parallel work)  
**Timeline**: Week of Oct 14-18, 2025  
**Status**: 🚧 In Progress

**Goals**:
- User behavior tracking
- Error monitoring
- Performance analytics
- Conversion funnel analysis

**Success Metrics**:
- Event tracking implemented
- Error rate dashboard live
- User flow analysis complete

---

## 📅 Q4 2025 Roadmap

### 🔥 High Priority

#### 1. Unified Inventory System ("Shelf")
**Timeline**: Oct 16-25, 2025  
**Effort**: 2 weeks  
**Status**: 📋 Planned

**Description**: Single inventory page with multiple input methods for power users.

**Features**:
- Batch image upload (drag-and-drop up to 50 images)
- CSV/Excel import with AI parsing
- Text writeup parsing (paste descriptions)
- Manual entry form
- Gallery-like inventory view
- Bulk actions (edit, delete, post to platforms)
- Background AI processing
- Real-time status updates

**User Flow**:
1. User uploads batch of images or CSV
2. AI processes in background
3. User sees gallery with progress indicators
4. User reviews/edits auto-generated listings
5. User selects items → bulk post to platforms

**Database Changes**:
- Add `Listing.batchId` (optional, for grouping)
- Add `Listing.processingStatus` (pending, processing, complete, error)

**Success Metrics**:
- 10+ items uploaded per session (avg)
- 80%+ AI accuracy on batch processing
- <2 min average processing time per 10 items

---

#### 2. AI Provider Migration (Gemini 2.5 Flash)
**Timeline**: Oct 20-30, 2025  
**Effort**: 1.5 weeks  
**Status**: 📋 Planned

**Description**: Migrate from OpenAI GPT-4 to Gemini 2.5 Flash for cost savings.

**Reasons**:
- 70% cost reduction (estimated)
- Competitive performance
- Multimodal capabilities
- Faster inference

**Migration Plan**:
1. Create `lib/gemini.ts` module
2. Implement parallel testing (10% traffic to Gemini)
3. Compare quality metrics (accuracy, detail, relevance)
4. Gradual rollout (10% → 50% → 100%)
5. Deprecate OpenAI integration
6. Update cost tracking

**Risk Mitigation**:
- A/B testing with quality checks
- Rollback plan if quality drops
- User feedback monitoring

**Success Metrics**:
- 60%+ cost reduction achieved
- <5% drop in AI accuracy
- No increase in user complaints

---

#### 3. Enhanced Market Research
**Timeline**: Nov 1-15, 2025  
**Effort**: 2 weeks  
**Status**: 📋 Planned  
**Premium Feature**: Yes

**Description**: Real-time market data from multiple sources.

**Features**:
- Historical price charts (6-12 months)
- Competitor analysis (pricing, listings count)
- Seasonal trend detection
- Best time to sell recommendations
- Price drop alerts
- Similar items comparison

**Data Sources**:
- eBay Sold Listings API
- Etsy Marketplace API
- Third-party market data providers (TBD)

**UI Components**:
- Interactive price history chart
- Competitor listings table
- Trend indicators
- Recommended pricing widget

**Success Metrics**:
- 20%+ increase in premium conversions
- Users price items within 10% of market average
- Positive user feedback on insights quality

---

### 🎨 Medium Priority

#### 4. Mobile App (React Native)
**Timeline**: Q1 2026  
**Effort**: 8 weeks  
**Status**: 📋 Planned

**Description**: Native iOS and Android apps for on-the-go listing.

**MVP Features**:
- Camera capture
- AI listing generation
- Basic editing
- Post to marketplaces
- View all listings

**Phase 1**: iOS (TestFlight)
**Phase 2**: Android (Google Play)
**Phase 3**: Full feature parity with web

---

#### 5. Bulk Operations & Automation
**Timeline**: Nov 15-30, 2025  
**Effort**: 2 weeks  
**Status**: 📋 Planned

**Description**: Power user features for managing large inventories.

**Features**:
- Bulk edit (price, condition, tags)
- Bulk delete
- Bulk post to marketplaces
- Templates (save common listing patterns)
- Duplicate listing
- Archive/restore
- Export to CSV

**User Stories**:
- "As a reseller with 100+ items, I want to update prices for all items in a category at once."
- "As a thrift store owner, I want to duplicate a listing and only change the size/color."

---

#### 6. Advanced Search & Filters
**Timeline**: Dec 2025  
**Effort**: 1 week  
**Status**: 📋 Planned

**Description**: Enhanced search for sellers to find their own listings.

**Features**:
- Full-text search
- Filter by status, date, platform, price range
- Sort by various fields
- Saved searches
- Search history

---

### 🌟 Nice to Have

#### 7. Analytics Dashboard
**Timeline**: Q1 2026  
**Effort**: 3 weeks  
**Status**: 📋 Planned  
**Premium Feature**: Yes

**Description**: Insights into selling performance.

**Metrics**:
- Total sales
- Average sale price
- Most profitable platforms
- Best-selling categories
- Listing performance (views, favorites)
- Time to sell analytics

**Charts**:
- Sales over time
- Category breakdown
- Platform comparison
- Price distribution

---

#### 8. Social Sharing
**Timeline**: Q2 2026  
**Effort**: 1 week  
**Status**: 📋 Planned

**Description**: Share listings to social media.

**Platforms**:
- Facebook
- Instagram
- Twitter/X
- Pinterest

**Features**:
- Auto-generate social post with image
- Shortened link tracking
- Schedule posts
- Cross-posting to multiple platforms

---

#### 9. Team Collaboration
**Timeline**: Q2 2026  
**Effort**: 4 weeks  
**Status**: 📋 Planned  
**Premium Feature**: Yes (PRO tier)

**Description**: Multi-user accounts for businesses.

**Features**:
- Team workspaces
- Role-based access (admin, editor, viewer)
- Shared inventory
- Activity log
- User permissions

**User Stories**:
- "As a thrift store owner, I want my employees to add listings but not delete them."
- "As a reseller, I want my assistant to help with listing but not access my marketplace credentials."

---

#### 10. Internationalization (i18n)
**Timeline**: Q3 2026  
**Effort**: 3 weeks  
**Status**: 📋 Planned

**Description**: Support for non-English languages.

**Target Languages** (priority order):
1. Spanish
2. French
3. German
4. Japanese

**Scope**:
- UI translations
- AI prompts (multilingual listings)
- Currency conversion
- Regional marketplace support

---

## 🔬 Experimental / Research

### AI-Powered Photography Tips
**Concept**: Real-time feedback while capturing photos to improve image quality.

**Features**:
- Lighting suggestions
- Angle recommendations
- Background removal
- Auto-enhance filters

---

### Voice Commands
**Concept**: "Add listing for blue Nike shoes size 10" → creates listing

**Use Cases**:
- Hands-free listing creation
- While driving or sorting items
- Accessibility for visually impaired

---

### Augmented Reality (AR) Preview
**Concept**: See how item looks in different settings before listing.

**Use Cases**:
- Furniture placement
- Clothing try-on
- Size comparison

---

## ❌ Deprioritized / Not Pursuing

### ~~Dropshipping Integration~~
**Reason**: Outside core reseller use case, complex supplier management

### ~~Print-on-Demand~~
**Reason**: Different business model, requires design tools

### ~~Auction Management~~
**Reason**: Most platforms moving away from auctions

---

## 🎓 User Education & Onboarding

### Planned Improvements:
- Interactive tutorial on first listing
- Video guides for marketplace connections
- Best practices blog
- Community forum
- Success stories showcase

---

## 🔍 Key Metrics to Track

### Product Metrics:
- **Daily Active Users (DAU)**
- **Listings Created per User**
- **Premium Conversion Rate**
- **Marketplace Posting Success Rate**
- **AI Accuracy Score**
- **Time to Create Listing** (target: <2 min)
- **User Retention** (30-day, 90-day)

### Business Metrics:
- **Monthly Recurring Revenue (MRR)**
- **Customer Acquisition Cost (CAC)**
- **Lifetime Value (LTV)**
- **Churn Rate**
- **Net Promoter Score (NPS)**

### Technical Metrics:
- **API Uptime** (target: 99.9%)
- **Average API Response Time** (target: <500ms)
- **Error Rate** (target: <0.1%)
- **AI Processing Time** (target: <30s per listing)

---

## 💡 Feedback Loops

### User Feedback Channels:
1. In-app feedback button
2. Email support
3. User interviews (monthly)
4. Feature request voting
5. Analytics & telemetry

### Decision-Making Process:
1. Gather feedback
2. Analyze usage data
3. Prioritize by impact/effort
4. Update roadmap
5. Communicate changes

---

## 🚀 Launch Milestones

### ✅ Milestone 1: MVP Launch (Sept 2025)
- Camera capture + AI listing
- Basic marketplace integrations
- Free tier launch

### ✅ Milestone 2: Premium Features (Oct 2025)
- Special items detection
- Premium analysis
- Stripe integration

### 🎯 Milestone 3: Power User Tools (Nov 2025)
- Unified inventory
- Batch upload
- Bulk operations

### 🎯 Milestone 4: Mobile First (Q1 2026)
- React Native app launch
- App Store approval
- Mobile marketing push

### 🎯 Milestone 5: Scale & Optimize (Q2 2026)
- Team collaboration
- Analytics dashboard
- AI cost optimization

---

## 📞 Roadmap Governance

### Update Frequency:
- **Weekly**: Review progress on in-progress items
- **Monthly**: Reprioritize based on user feedback
- **Quarterly**: Major roadmap revision

### Stakeholders:
- Product team
- Engineering team
- User community
- Investors (if applicable)

### Communication:
- **Internal**: CHANGELOG.md + session summaries
- **External**: Public roadmap page (future)
- **Users**: Release notes + email announcements

---

## 🤝 How to Contribute to Roadmap

### For Agents/Developers:
1. Review this roadmap before starting new features
2. Update status when working on roadmap items
3. Add new ideas to "Experimental" section
4. Provide feedback on feasibility/effort estimates

### For Users (future):
1. Submit feature requests via in-app form
2. Vote on features in community forum
3. Participate in user interviews

---

**Last Updated**: 2025-10-14  
**Maintained By**: Product team + all agents  
**Next Review**: 2025-10-21
