# Project: ai-gsmarena (PhoneIndex) Pre-Publication Assessment & Roadmap

## Architecture
- **Framework & Runtime**: Next.js 16.4.3 (Turbopack compiler, App Router), React 19.3.0, TypeScript 5 (strict mode, bundler module resolution, `@/*` path mapping).
- **Styling**: Tailwind CSS v4 via `@tailwindcss/node` build script (`scripts/build-css.mjs`), generating 4,094 utility classes compiled to `src/app/globals.css`.
- **Data Layer**: In-memory catalog of 939 smartphones across 38+ global brands (release years 2020 through 2026), aggregated and deduplicated from 8 distinct sources (`src/lib/brands/catalog-loader.ts`).
- **Database Architecture**: `prisma/schema.prisma` defines an enterprise PostgreSQL schema with pgvector preview (`Device`, `DeviceSpecs`, `EditorVerdict`, `EvidenceChunk`, `AffiliateOffer`, `PricePoint`, `EditorialDraft`), but Prisma Client is disconnected at runtime. All application state is loaded into memory at startup.
- **Client Architecture**: Monolithic client SPA (`src/app/page.tsx`, 1,756 lines, 1.32 MB single JavaScript chunk) managing 5 primary workspace tabs (`DEVICE_BENTO`, `PHONE_FINDER`, `COMPARE_STUDIO`, `DEBATE_ARENA`, `ADMIN_DESK`).
- **Intelligence Engine**: Deterministic regex and scoring rules engine (`phoneindex-rules-engine`, synthetic metadata, `living-score-v2`) with zero external LLM API dependencies.
- **Architectural Remediation Roadmap**: Certified blueprints in `PRE_PUBLICATION_ASSESSMENT_REPORT.md` Section 4 incorporate slug collision elimination (`+` -> `-plus`), Next.js 16 SSG with Promise params for `/devices/[slug]`, on-demand SSR with edge caching for `/compare/[slugs]`, decoupled 12 KB client search index, React 19 hydration-safe persistence (`usePersistentState`), hardened token-bucket rate limiting (5 req/min, burst 2, LRU bounded at 10,000 entries, proxy-safe IP extraction) with abort-forwarding SSE streaming for `/api/debate` (clean delta parsing, XML injection sanitization, structured persona delimiters), and a Two-Pillar Lab Provenance framework (CC BY 4.0 OpenLab + Parametric Simulation with explicit 180 mW baseline idle power, complete 3nm–12nm+ node scaling, compact stereo acoustic formulas, and trademark-safe `simulatedEnduranceHours` nomenclature).

## Feature Inventory
| # | Feature | Category | Status | Primary Source Reference | Description |
|---|---|---|---|---|---|
| 1 | In-Memory Catalog Loader | Data Layer | Implemented | `src/lib/brands/catalog-loader.ts:173-204` | Aggregation & deduplication of 939 smartphones across 38+ brands |
| 2 | Device Bento View | Spec Display | Implemented | `src/app/page.tsx:688-1008` | 6 high-density hardware pills, radar chart, score provenance, tagline |
| 3 | Foldable Kinematics | Telemetry | Implemented | `src/app/page.tsx:814-882`, `PhoneSizeComparator.tsx:815-880` | Dual-state dimensions (open vs folded), hinge telemetry, crease depth |
| 4 | Living Score Price Simulator | Dynamic Pricing | Implemented | `src/app/page.tsx:886-943`, `src/lib/editors.ts:124-216` | Dynamic recalculation of Pragmatist score & recommendation based on street price slider |
| 5 | Buyer Priority Weight Tuner | Personalization | Implemented | `src/app/page.tsx:589-631` | Real-time sliders adjusting 4 editor weights (0-100%) and composite scores |
| 6 | Core 4 AI Editor Personas | Editorial | Implemented | `src/app/page.tsx:1012-1152`, `src/lib/editors.ts:1-217` | Silicon Geek, Camera Purist, Pragmatist, Daily Driver standardized cards & metrics |
| 7 | Editorial Full Modal | Editorial | Implemented | `src/features/editorial/EditorialModal.tsx:1-166` | Accessible dialog with keyboard trapping, full text critique, pros/cons |
| 8 | Grounded Evidence Store | Sourcing | Implemented | `src/app/page.tsx:1158-1232` | Sourced citations (YouTube, Reddit, Lab) with topic and sentiment badges |
| 9 | True-Scale Size Visualizer | Ergonomics | Implemented | `src/components/PhoneSizeComparator.tsx:1-3818` | Millimeter-accurate SVG silhouettes, camera bump protrusion, side-by-side & overlay |
| 10 | Phone Finder Studio | Discovery | Implemented | `src/components/PhoneFinderStudio.tsx:1-947` | 6 1-click presets, 4-column parametric sliders/toggles, multi-metric sorting |
| 11 | Smart Spec Diff | Comparison | Implemented | `src/app/page.tsx:1441-1533`, `src/lib/debate-engine.ts:27-223` | 8 pairwise comparison rows, advantage highlighting, "Why It Matters" translations |
| 12 | Ask the Editors (Debate Arena) | Decision AI | Implemented | `src/features/debate/DebateArena.tsx:1-204`, `src/lib/debate-engine.ts:251-412` | 4 scenario presets, custom prompt input, 4-editor debate turns, panel consensus |
| 13 | Manual Spec Studio & Presets | Administration | Implemented | `src/components/ManualSpecEntryStudio.tsx:1-1166` | Form with Xperia 1 VII, Xiaomi 15 Ultra, iPhone 17 Air presets and contour analysis |
| 14 | Inline Spec Sheet Editing | Administration | Implemented (Buggy) | `src/components/FullSpecSheet.tsx:310-356` | In-sheet editing for 11 hardware fields with session override (key mismatch bug) |
| 15 | Admin Authentication | Security | Implemented | `src/lib/server/admin-session.ts:1-67`, `src/features/admin/AdminAccessPanel.tsx:1-89` | HMAC-SHA256 signed session cookie, timing-safe key validation |
| 16 | Dynamic URL Deep Linking | Routing / SEO | Planned Roadmap | `src/app/` (Needs `[slug]` routes) | Collision-free SSG for `/devices/[slug]`, on-demand SSR for `/compare/[slugs]`, and decoupled 12KB search index |
| 17 | Multi-Device Comparison Matrix | Comparison | Planned Roadmap | `src/app/page.tsx:1318-1352` | 3-4 device side-by-side comparison across full encyclopedic specs |
| 18 | Sticky Compare Column Headers | Usability | Pre-Pub Fix | `src/app/page.tsx:1442-1532` | Persistent header pinning device names during vertical diff scroll |
| 19 | Persistent Comparison Dock | Usability | Pre-Pub Fix | `src/components/PhoneFinderStudio.tsx:908-918` | Bottom tray allowing multi-selection from Phone Finder without tab interruption |
| 20 | Inline Spec Sheet Key Alignment | Bug Fix | Pre-Pub Fix (P0) | `src/components/FullSpecSheet.tsx:310-356` | Fix label mismatches between `handleSaveInlineEdits` and `buildEncyclopedicSpecs` |
| 21 | Responsive Header & Navigation | Responsiveness | Pre-Pub Fix (P1) | `FullSpecSheet.tsx:430`, `page.tsx:492` | Flex-wrap on FullSpecSheet controls, visible scroll hints on tab bar |
| 22 | Dark Mode & Typography Foundations | Design System | Pre-Pub Fix (P2) | `layout.tsx:1-23`, `tailwind-input.css:3-5` | Semantic color variables, dark theme support, Google fonts loading (`Inter`, `JetBrains Mono`) |
| 23 | User State Persistence | Personalization | Planned Roadmap | `src/hooks/usePersistentState.ts` | React 19 hydration-safe persistent hook with isHydrated gate, schema envelopes, and cross/intra-tab sync |
| 24 | Real LLM Hybridization | AI Engine | Planned Roadmap | `src/app/api/debate/route.ts` | Rate-limited (5 req/min, burst 2, LRU 10k) streaming SSE debate engine with ReadableStream, req.signal abort forwarding, clean delta parsing, and XML injection guardrails |
| 25 | Database & Review Queue Persistence | Backend | Planned Roadmap | `prisma/schema.prisma`, `src/app/api/ingest/` | Activate Prisma client and persistent storage for catalog additions and drafts |
| 26 | Empirical Lab Benchmarks & Simulated Models | Telemetry / Sourcing | Planned Roadmap | `src/lib/lab-measurements.ts` | Two-pillar provenance framework (CC BY 4.0 OpenLab + Parametric Physics Simulations with 180mW idle baseline, full 3nm-12nm+ node table, compact stereo acoustics, and simulatedEnduranceHours metric) with legal disclaimer |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| M1 | Pre-Publication Assessment Report Deliverable | Comprehensive Markdown deliverable `PRE_PUBLICATION_ASSESSMENT_REPORT.md` documenting tech stack audit, user journeys, UI/UX evaluation across viewports, prioritized pre-publication adjustments (P0-P3), and strategic feature roadmap | Survey Handoffs | COMPLETED |
| M2 | Review, Challenge & Architectural Amendments | 2 Reviewers and 2 Challengers conducted empirical stress-testing (uncovering slug collisions, SSR vs SSG explosion, React 19 hydration mismatch, unauthenticated LLM endpoints, and lab provenance liabilities); Round 2 Explorers resolved blockers; Challenger R2-2 formulated 6 concrete hardening specifications; Worker R3 applied final hardening across Rate Limiting, SSE Streaming, and Lab Simulations | M1 Deliverables | COMPLETED |
| M3 | Forensic Audit Verification | Forensic auditor independently verified zero fabrications, authentic findings, verified file references, and requirement adherence (CLEAN certified by Auditor R3-1) | M2 Verification | COMPLETED |
| M4 | Gate & Final Reporting | Orchestrator gate evaluation passed and comprehensive human report synthesis delivered to parent agent | M3 Forensic Audit | COMPLETED |

## Code Layout
- `PRE_PUBLICATION_ASSESSMENT_REPORT.md` — Project root: Complete standalone pre-publication assessment report covering Requirements R1–R5 and Acceptance Criteria (amended with Round 2 architectural blueprints and Round 3 hardening).
- `PROJECT.md` — Project root: Authoritative project architecture, feature inventory, milestone tracking, and code layout reference.
- `.agents/teamwork/` — Teamwork coordination metadata, progress tracking, and survey reports:
  - `ORIGINAL_REQUEST.md`: Master user request requirements.
  - `teamwork_explorer_survey_1/handoff.md`: Architecture & Tech Stack exploration findings.
  - `teamwork_explorer_survey_2/handoff.md`: Feature Inventory & User Journey mapping findings.
  - `teamwork_explorer_survey_3/handoff.md`: UI/UX, Design System, Responsiveness & Usability findings.
  - `teamwork_worker_report_1/`: Initial report authoring.
  - `teamwork_challenger_2/handoff.md`: Adversarial empirical challenge report and REQUEST_CHANGES findings.
  - `teamwork_explorer_r2_1/`: Slug collision elimination, deduplication patch, and dynamic URL routing blueprint.
  - `teamwork_explorer_r2_2/`: React 19 hydration architecture & resilient state persistence blueprint.
  - `teamwork_explorer_r2_3/`: AI security, rate limiting, SSE streaming, and two-pillar lab provenance blueprints.
  - `teamwork_worker_report_2/`: Report amendment authoring (BRIEFING.md, DISPATCH.md, progress.md, handoff.md).
  - `teamwork_challenger_r2_2/handoff.md`: Adversarial empirical stress testing report (6 technical and operational defects identified).
  - `teamwork_worker_report_3/`: Final hardening report authoring (BRIEFING.md, DISPATCH.md, progress.md, handoff.md).
- `src/` — Primary application source code:
  - `src/app/`: App Router root layout, single-page monolith (`page.tsx`), and API routes (`/api/admin/session`, `/api/debate`, `/api/ingest`).
  - `src/components/`: Core UI components (`FullSpecSheet.tsx`, `ManualSpecEntryStudio.tsx`, `PhoneFinderStudio.tsx`, `PhoneSizeComparator.tsx`, `RadarChart.tsx`, `VisualFidelityBadge.tsx`).
  - `src/features/`: Domain feature modules (`admin/`, `catalog/`, `debate/`, `editorial/`).
  - `src/lib/`: Domain engines, scoring rubrics, seed data, brand catalog definitions, and admin session encryption.

## Verification Commands
```powershell
# 1. Run unit test suite
npm test

# 2. Verify TypeScript compilation
npm run typecheck

# 3. Verify ESLint compliance
npm run lint

# 4. Verify Living Score distribution across 939 catalog devices
npm run score:audit

# 5. Verify Visual Profile asset coverage
npm run visual:audit

# 6. Verify production build and client bundle size
npm run build
```
