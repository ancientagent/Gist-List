# GISTer Development Team Workflow

## Team Structure

### Design Phase
**GPT-5 Web Model**
- **Role**: Architecture and feature design
- **Responsibilities**:
  - Design Pass A and Pass B feature specifications
  - Create technical architecture documents
  - Define mood engine personas and chip system
  - Specify notification types and UI components

**Output**: Design documents in `/docs/` directory

---

### Implementation Phase

**GPT-5 Codex Medium (Cursor Agent)**
- **Role**: Code implementation
- **Responsibilities**:
  - Execute Pass A implementation from design specs
  - Execute Pass B implementation (upcoming)
  - Write TypeScript/React components
  - Implement backend API routes
  - Update Prisma schema if needed
  - Commit changes to codebase

**Tools**: Cursor IDE with GPT-5 Codex Medium

**Output**: Implemented features in codebase

---

### Testing & Troubleshooting Phase

**Claude Code (Anthropic)**
- **Role**: Local environment setup and troubleshooting
- **Responsibilities**:
  - Set up local development environment for founder testing
  - Troubleshoot Prisma, database, and build issues
  - Debug WSL2-specific problems
  - Document setup process and known issues
  - Assist with Pass B troubleshooting after implementation
  - Create/update technical documentation

**Tools**: Claude Code CLI

**Output**:
- Working local dev environment
- Technical documentation
- Troubleshooting guides

---

### Deployment Phase

**DeepAgent**
- **Role**: Production deployment and automation
- **Responsibilities**:
  - Deploy to production (https://gistlist.abacusai.app)
  - Execute Sweep B deployment
  - Manage production database
  - Handle CI/CD pipeline

**Output**: Live production deployment

---

## Development Workflow

### Pass A: AI Assistant Upgrade (Framework)

```
┌─────────────────────────────────────────────────────────────┐
│                    1. DESIGN PHASE                          │
│                   GPT-5 Web Model                           │
│                                                             │
│  • Design chip system architecture                         │
│  • Define 8 mood engine personas                           │
│  • Spec INSIGHT notification type                          │
│  • Create feature flags                                    │
│                                                             │
│  Output: /docs/INDEX.md, /docs/overview/CHANGELOG.md       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 2. IMPLEMENTATION PHASE                     │
│              GPT-5 Codex Medium (Cursor)                    │
│                                                             │
│  • Implement ChipsRow.tsx component                        │
│  • Create mood engine (moods.ts)                           │
│  • Add notification types (types.ts)                       │
│  • Wire up INSIGHT type backend                            │
│  • Add Quick Facts panel UI stub                           │
│  • Enable feature flags                                    │
│                                                             │
│  Output: Code committed to repository                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              3. SETUP & TESTING PHASE                       │
│                    Claude Code                              │
│                                                             │
│  • Clone repository to WSL2                                │
│  • Install dependencies (npm --legacy-peer-deps)           │
│  • Fix Prisma client path issues                           │
│  • Fix TypeScript errors                                   │
│  • Configure database connection for WSL2                  │
│  • Clear Next.js build cache                               │
│  • Start dev server                                        │
│  • Document all issues and solutions                       │
│                                                             │
│  Output: LOCAL_SETUP.md, working dev environment           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  4. FOUNDER TESTING                         │
│                   (Baris - Founder)                         │
│                                                             │
│  • Test Pass A features locally or on production           │
│  • Verify chip system works                                │
│  • Test mood engine personas                               │
│  • Check INSIGHT notifications                             │
│  • Approve for Sweep B                                     │
└─────────────────────────────────────────────────────────────┘
```

### Pass B: (Upcoming - TBD)

```
┌─────────────────────────────────────────────────────────────┐
│                    1. DESIGN PHASE                          │
│                   GPT-5 Web Model                           │
│                                                             │
│  • Design Pass B features                                  │
│  • Create technical specifications                         │
│                                                             │
│  Output: Pass B design docs                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 2. IMPLEMENTATION PHASE                     │
│              GPT-5 Codex Medium (Cursor)                    │
│                                                             │
│  • Implement Pass B features                               │
│  • Code review and testing                                 │
│                                                             │
│  Output: Pass B code                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              3. TROUBLESHOOTING PHASE                       │
│                    Claude Code                              │
│                                                             │
│  • Assist with any Pass B setup issues                     │
│  • Debug problems                                          │
│  • Update documentation                                    │
│                                                             │
│  Output: Updated docs, fixes                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  4. DEPLOYMENT PHASE                        │
│                     DeepAgent                               │
│                                                             │
│  • Deploy Sweep B to production                            │
│  • Monitor deployment                                      │
│                                                             │
│  Output: Live Sweep B features                             │
└─────────────────────────────────────────────────────────────┘
```

## Communication & Handoffs

### Handoff 1: Design → Implementation
- **From**: GPT-5 Web Model
- **To**: GPT-5 Codex Medium (Cursor)
- **Deliverable**: Design documents in `/docs/`
- **Success Criteria**: Clear feature specifications with file paths and implementation details

### Handoff 2: Implementation → Testing
- **From**: GPT-5 Codex Medium (Cursor)
- **To**: Claude Code
- **Deliverable**: Committed code in repository
- **Success Criteria**: Code compiles, feature flags enabled, no obvious errors

### Handoff 3: Testing → Founder Review
- **From**: Claude Code
- **To**: Founder (Baris)
- **Deliverable**: Working local environment + documentation
- **Success Criteria**:
  - Local dev server runs on http://localhost:3000
  - All Pass A features testable
  - Documentation complete

### Handoff 4: Founder Approval → Sweep B
- **From**: Founder (Baris)
- **To**: GPT-5 Codex Medium (Cursor)
- **Deliverable**: Approval to proceed with Sweep B
- **Success Criteria**: Pass A features verified and approved

### Handoff 5: Sweep B Implementation → Troubleshooting
- **From**: GPT-5 Codex Medium (Cursor)
- **To**: Claude Code
- **Deliverable**: Sweep B code
- **Success Criteria**: Code committed, ready for testing

### Handoff 6: Troubleshooting → Deployment
- **From**: Claude Code
- **To**: DeepAgent
- **Deliverable**: Tested and verified Sweep B
- **Success Criteria**: All features working, documentation updated

## Current Status

**Pass A**: ✅ Complete
- Design: ✅ Done (GPT-5 Web Model)
- Implementation: ✅ Done (GPT-5 Codex Medium)
- Local Setup: ⚠️ In Progress (Claude Code)
  - Dependencies installed ✅
  - Prisma client generated ✅
  - TypeScript errors fixed ✅
  - Dev server running ✅
  - Database connection: ⚠️ Slow but functional
  - Founder testing: 🔄 Pending

**Pass B**: ⏳ Awaiting Pass A approval

## Known Issues (Pass A Testing)

### Critical
- **Database latency**: WSL2 → Hosted PostgreSQL has 20-30 second query times
  - **Status**: Expected behavior, not blocking
  - **Workaround**: Test on production for faster experience

### Non-Critical
- **Prisma path resolution**: Manual copy needed in WSL2 environment
  - **Status**: Documented in LOCAL_SETUP.md
  - **Impact**: One-time setup issue

## Repository Structure

```
/mnt/c/Gist-List/app/
├── docs/
│   ├── INDEX.md                  # Pass A feature overview
│   ├── LOCAL_SETUP.md            # Environment setup (Claude Code)
│   ├── TEAM_WORKFLOW.md          # This file
│   └── overview/
│       └── CHANGELOG.md          # Pass A changes
├── src/
│   ├── notifications/            # Pass A: Notification system
│   └── components/               # Pass A: UI components
├── app/
│   ├── api/                      # API routes
│   └── listing/                  # Listing pages
└── prisma/
    └── schema.prisma             # Database schema
```

## Team Communication

### For Implementation Questions
- **Contact**: GPT-5 Codex Medium (Cursor)
- **Scope**: Code implementation, architecture decisions

### For Setup/Troubleshooting
- **Contact**: Claude Code
- **Scope**: Local development, build issues, debugging

### For Deployment
- **Contact**: DeepAgent
- **Scope**: Production deployment, infrastructure

### For Design Changes
- **Contact**: GPT-5 Web Model
- **Scope**: Feature specifications, architecture updates

## Version Control

**Current Branch**: main
**Pass A Commits**: Committed by GPT-5 Codex Medium (Cursor)
**Documentation Commits**: Committed by Claude Code

**Commit Message Format**:
```
[PASS_A] <description> - <author>

Examples:
[PASS_A] Implement chip system - Cursor
[PASS_A] Add mood engine personas - Cursor
[PASS_A] Document local setup - Claude Code
```

## Testing Environments

### Local Development (WSL2)
- **URL**: http://localhost:3000
- **Database**: Hosted PostgreSQL (slow connection)
- **Purpose**: Feature testing, development
- **Owner**: Claude Code setup, Founder testing

### Production
- **URL**: https://gistlist.abacusai.app
- **Database**: Hosted PostgreSQL (fast connection)
- **Purpose**: End-user testing, deployment verification
- **Owner**: DeepAgent deployment

## Next Steps

1. **Immediate**: Founder tests Pass A features
2. **After Pass A approval**: Begin Pass B design
3. **Pass B implementation**: GPT-5 Codex Medium (Cursor)
4. **Pass B troubleshooting**: Claude Code
5. **Pass B deployment**: DeepAgent
