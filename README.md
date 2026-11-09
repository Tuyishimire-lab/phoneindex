# PhoneIndex

PhoneIndex is a smartphone comparison and editorial prototype built around four domain-specific editor personas, a deterministic Living Score engine, structured device specifications, and attached evidence records.

The current application runs in **deterministic local analysis mode**. Its verdicts are generated from catalog fields and versioned scoring rules; they are not produced by a remote language model. OpenRouter support is planned behind a provider interface, but no API key is required for the current feature set.

## Current architecture

- **Application:** Next.js 16.4.3 App Router, React 19, TypeScript, and Tailwind CSS 4.
- **Catalog:** Curated TypeScript records plus a generated JSON archive, deduplicated into a unified in-memory catalog.
- **Analysis:** Deterministic scoring, comparison, and debate engines.
- **Persistence:** UI edits and editorial actions are session-only. The Prisma PostgreSQL schema documents the intended persistent model but is not connected yet.
- **Evidence:** Catalog evidence records may be curated, generated, or user-entered. The current application must not be treated as a live verification service.
- **Scoring:** Generated catalog records use the versioned `living-score-v2` rubric. Curated records remain labeled separately until they are migrated to the same reviewed methodology.
- **Administration:** Catalog mutation tools require a signed HTTP-only admin session. Automated ingestion remains disabled until a sourced normalization pipeline is connected.

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

To enable the admin workspace, copy `.env.example` to `.env.local` and replace both values with strong secrets. The admin key must be at least 12 characters and the signing secret at least 32 characters.

## Quality commands

```bash
npm run lint
npm run typecheck
npm test
npm run check
npm run build
npm run score:audit
```

`npm run check` runs linting, TypeScript validation, and the unit test suite. The production build additionally regenerates the Tailwind output before running `next build`.

## Intelligence and provenance

Deterministic debate responses include runtime metadata describing their provider, scoring-model version, origin, and verification status. Remote model availability will only be shown when an OpenRouter provider actually handles a request.

## Planned work

The next architectural steps are to split the large client application into feature modules, serve catalog summaries separately from device details, connect persistent storage, and add the OpenRouter provider with validated structured output and deterministic fallback.
