# PhoneIndex (`ai-gsmarena`) Test Infrastructure & Architecture

## Overview
This document defines the comprehensive automated test architecture and feature verification infrastructure for **PhoneIndex** (`ai-gsmarena`). The test framework is built on **Vitest 5.0.5** with TypeScript 5 strict type checking, exercising opaque-box testing across all 5 implementation phases and 35 features in `PROJECT.md § Feature Inventory`.

---

## 1. Test Architecture & 4-Tier Methodology

The test suite follows a 4-tier opaque-box validation methodology, culminating in a Master Release Gate test suite:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PHONEINDEX TEST ARCHITECTURE                         │
├────────────────────────────────────────────────────────────────────────┤
│  Master Release Harness: src/test/e2e-release.test.ts                  │
│  ├── Invariant Gate: >900 Devices, Unique IDs, Zero Slug Collisions   │
│  ├── Scoring Gate: living-score-v2 dynamic spread >= 2.0               │
│  └── Adversarial Gate: XML Injection Neutralization, Bounded Models    │
├────────────────────────────────────────────────────────────────────────┤
│  Tier 4: Real-World Workflows (src/test/tier4-application-workflows)  │
│  ├── Workflow 1: Flagship Enthusiast Compare & AI Debate               │
│  ├── Workflow 2: Pragmatic Buyer Value Hunting & Price Drop Simulator  │
│  ├── Workflow 3: Flicker-Sensitive Eye-Care (PWM >= 1920 Hz)          │
│  ├── Workflow 4: Dual-Pillar Lab Telemetry, Battery & Acoustic LUFS    │
│  └── Workflow 5: Custom Hardware Spec Synthesis & Storage Hydration    │
├────────────────────────────────────────────────────────────────────────┤
│  Tier 3: Cross-Feature Combinations (src/test/tier3-cross-feature)    │
│  ├── Comb 1: Debounced Search + Filter + Dock + Living Score Weights  │
│  ├── Comb 2: Multi-Device (3-4) Diff Matrix + True-Scale Silhouette   │
│  ├── Comb 3: Inline Spec Editing + Score Update + Debate Grounding     │
│  ├── Comb 4: Rate Limiter Burst + AI Debate Streaming Local Fallback   │
│  ├── Comb 5: Regional Currency Conversion + Price Drop Recommendation │
│  └── Comb 6: Pinned Dock Intra-Tab & Cross-Tab Synchronization        │
├────────────────────────────────────────────────────────────────────────┤
│  Tier 2: Boundary & Corner Cases (src/test/tier2-boundary-corner)      │
│  ├── Empty States: Zero-match filters, whitespace queries, empty edits│
│  ├── Capacity Limits: Comparison dock max 4, Launch validation (2-4)  │
│  ├── Rate Limiter Stress: Burst 2, 10k LRU eviction, remainder credit │
│  ├── Injection & Copy: XML tag breakout protection, em-dash stripping  │
│  ├── Arithmetic Safety: 0 mAh, 20k mAh, unknown node, 75cm³ LUFS floor│
│  └── Storage Resilience: Schema v0 -> v1 migration, QuotaExceededError│
├────────────────────────────────────────────────────────────────────────┤
│  Tier 1: Feature Coverage (src/test/tier1-feature-coverage)            │
│  └── 35 Dedicated Test Cases covering Features #1 through #35         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Layout & Test Suite Map

All test files reside within the `src/test/` directory, co-located alongside the application logic and picked up automatically by `vitest.config.mts`:

| Test File | Tier / Scope | Test Count | Description |
|---|---|---|---|
| `src/test/helpers/test-utils.ts` | Test Infrastructure | N/A | Shared test utilities, filesystem inspectors, slug normalizer oracle, and lab formula references |
| `src/test/tier1-feature-coverage.test.ts` | Tier 1 | 35 | Dedicated happy-path coverage verifying all 35 features across Phases 1–5 |
| `src/test/tier2-boundary-corner.test.ts` | Tier 2 | 18 | Rigorous boundary conditions, capacity limits, rate-limit LRU stress, injection attacks, and arithmetic limits |
| `src/test/tier3-cross-feature.test.ts` | Tier 3 | 6 | Cross-feature interactions (search + dock, diff + silhouette, rate limit + debate fallback, FX + pricing) |
| `src/test/tier4-application-workflows.test.ts` | Tier 4 | 5 | End-to-end user workflows mirroring real-world enthusiast, pragmatic, and power-user sessions |
| `src/test/e2e-release.test.ts` | Release Harness | 6 | Master release gates verifying catalog scale, identifier uniqueness, living-score bounds, and release readiness |
| `src/lib/foundation.test.ts` | Unit / Baseline | 22 | Core foundation unit tests covering scoring, presets, visual resolver, debate request parsing, and session signing |

---

## 3. Feature Inventory Mapping (35/35 Features)

| Feature # | Feature Name | Milestone | Test File & Location | Verification Mechanism |
|---|---|---|---|---|
| 1 | Inline Spec Editing Key Realignment | M1 | `tier1-feature-coverage.test.ts:18` | Sync canonical labels with `handleSaveInlineEdits` |
| 2 | Global React Error Boundary | M1 | `tier1-feature-coverage.test.ts:63` | Verify `src/app/error.tsx` interface and reset CTA |
| 3 | Responsive Action Bar & Mobile Wrap | M1 | `tier1-feature-coverage.test.ts:75` | Verify `flex-wrap` and mobile viewport responsiveness |
| 4 | Staged Comparison Dock | M1 | `tier1-feature-coverage.test.ts:82` | Test dock staging queue up to 4 contenders |
| 5 | Sticky Contender Comparison Header | M1 | `tier1-feature-coverage.test.ts:107` | Verify sticky pinned comparison header bar |
| 6 | Keystroke Debouncing (`useDebounce`) | M1 | `tier1-feature-coverage.test.ts:114` | Test 180ms delay trailing edge execution |
| 7 | Mobile Nav Fade & Drawer Affordance | M1 | `tier1-feature-coverage.test.ts:137` | Verify tab scroll container and drawer usability |
| 8 | Typography Google Font Injection | M2 | `tier1-feature-coverage.test.ts:147` | Verify Inter and JetBrains Mono configuration |
| 9 | CSS Variable Dark Mode Tokens & Toggle | M2 | `tier1-feature-coverage.test.ts:153` | Verify dark theme tokens and surface styling |
| 10 | W3C Valid Button Semantics | M2 | `tier1-feature-coverage.test.ts:158` | Verify `<button>` elements do not nest `<h3>` |
| 11 | Semantic Spec Table / ARIA Grid Roles | M2 | `tier1-feature-coverage.test.ts:164` | Verify tabular accessibility and ARIA roles |
| 12 | Range Slider Accessible ARIA Attributes | M2 | `tier1-feature-coverage.test.ts:169` | Verify `aria-label` and `aria-valuetext` |
| 13 | Phone Finder Zero-Match Empty State | M2 | `tier1-feature-coverage.test.ts:175` | Test empty state card and filter reset CTA |
| 14 | Living Score Range De-Compression | M2 | `tier1-feature-coverage.test.ts:181` | Verify dynamic score range (5.5–9.9) and recommendations |
| 15 | Tailwind Config Features Inclusion | M2 | `tier1-feature-coverage.test.ts:204` | Verify `content` includes `./src/features/**/*` |
| 16 | Responsive Catalog Sort Grid | M2 | `tier1-feature-coverage.test.ts:209` | Verify flex-wrap responsive sort layout |
| 17 | Accessible Micro-Typography Contrast | M2 | `tier1-feature-coverage.test.ts:214` | Verify WCAG AA >= 4.5:1 text styling |
| 18 | Visual Fidelity Badge Accessible Tooltips | M2 | `tier1-feature-coverage.test.ts:219` | Test tooltip explaining asset fidelity tiers |
| 19 | Slug Collision Elimination (`-plus` norm) | M3 | `tier1-feature-coverage.test.ts:228` | Test `+` -> `-plus` and unique catalog slugs |
| 20 | Static Device Detail Routing (`/devices/[slug]`) | M3 | `tier1-feature-coverage.test.ts:241` | Verify `generateStaticParams` and Product JSON-LD |
| 21 | On-Demand SSR Comparison Routing (`/compare/[slugs]`)| M3 | `tier1-feature-coverage.test.ts:262` | Test `-vs-` dynamic parameter splitting |
| 22 | Client Bundle Decoupling / Search Index | M3 | `tier1-feature-coverage.test.ts:271` | Assert compact search candidate size <120 bytes |
| 23 | Multi-Device (3 to 4) Spec Diff Matrix | M3 | `tier1-feature-coverage.test.ts:284` | Evaluate multi-column winner highlighting for 3-4 devices |
| 24 | Multi-Device Physical Silhouette Comparator | M3 | `tier1-feature-coverage.test.ts:294` | Test multi-device SVG true-scale silhouette lineup |
| 25 | React 19 Hydration-Safe Persistence | M3 | `tier1-feature-coverage.test.ts:300` | Verify version envelope, isHydrated, and storage resilience |
| 26 | Cross-Tab & Intra-Tab State Sync | M3 | `tier1-feature-coverage.test.ts:314` | Test synchronization event dispatch and listener |
| 27 | Token Bucket Rate Limiter | M4 | `tier1-feature-coverage.test.ts:326` | Test burst 2, 5 req/min (12s refill), LRU eviction |
| 28 | Streaming AI Debate Route (SSE) | M4 | `tier1-feature-coverage.test.ts:360` | Verify `text/event-stream` delta chunks & fallback |
| 29 | Prompt Injection XML Sanitization | M4 | `tier1-feature-coverage.test.ts:366` | Verify angle bracket escaping and length capping |
| 30 | Parameterized CAD Silhouette Archetypes | M4 | `tier1-feature-coverage.test.ts:374` | Verify manifest visual profiles and archetypes |
| 31 | Two-Pillar Lab Provenance Schema | M4 | `tier1-feature-coverage.test.ts:380` | Validate `VERIFIED_PHYSICAL_LAB` vs `SIMULATED_PARAMETRIC` |
| 32 | Deterministic Battery Endurance Simulation | M4 | `tier1-feature-coverage.test.ts:391` | Verify formula with 180mW idle power and node factors |
| 33 | Deterministic Acoustic Loudness Simulation | M4 | `tier1-feature-coverage.test.ts:404` | Verify LUFS calculation based on chassis volume |
| 34 | Mandatory Legal Independence Disclaimers | M4 | `tier1-feature-coverage.test.ts:422` | Assert independence disclaimers from GSMArena/DxOMark |
| 35 | Regional Price Conversion & Retailer Offers | M4 | `tier1-feature-coverage.test.ts:430` | Verify EUR, GBP, INR currency conversions |

---

## 4. Execution & Verification Commands

All test and verification commands are native to the project workspace:

### 1. Execute Full Automated Test Suite (All Tiers)
```powershell
npm test
```
*Executes `vitest run` on all 6 test suites (`src/**/*.test.ts`). Expected result: 92/92 tests passing.*

### 2. Strict TypeScript Typecheck
```powershell
npm run typecheck
```
*Executes `tsc --noEmit`. Expected result: 0 type errors.*

### 3. Strict ESLint Linter Validation on Test Suites
```powershell
npx eslint src/test/
```
*Verifies all test code conforms to strict ESLint rules with 0 errors and 0 warnings.*

### 4. Living Score Calibration Audit
```powershell
npm run score:audit
```
*Audits score distribution across 939 catalog devices, verifying non-collapsed dynamic range.*

### 5. Visual Profile Silhouette Audit
```powershell
npm run visual:audit
```
*Audits visual profile manifest and vector silhouette coverage.*

---

## 5. Progressive Testability Principle

The test infrastructure is designed with **Progressive Testability**:
1. All assertions against modules in completed or baseline phases execute live and assert full mathematical and behavioral invariants.
2. For modules currently in development across milestone worker tasks (e.g., M1, M2, M3, M4), assertions utilize contract-based probing and safe module detection helpers (`safeImport`, `fileExists`).
3. As each milestone is integrated into the codebase, the test suite automatically validates the new implementation artifacts without test modifications or regressions.
