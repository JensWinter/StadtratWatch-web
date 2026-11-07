# AGENTS.md

This file provides guidance to AI Agents when working with code in this repository.

## Project Overview

StadtratWatch is a civic participation platform for tracking city council sessions in Magdeburg, Germany. It processes videos, transcribes speeches, tracks voting patterns, and provides comprehensive analysis tools for democratic participation. The project consists of a static frontend (Astro) and data processing pipelines (Deno).

## Repository Structure

This is a **monorepo** with two main runtime environments:

- **astro/** - Web application (Node.js/npm)
- **src/** - Data processing scripts (Deno)

The two parts share TypeScript models through Deno workspaces (defined in deno.json).

## Common Commands

### Astro Web Application (from `astro/` directory)

```bash
cd astro

# Development
npm run dev             # Start dev server
npm run build           # Build for production
npm run preview         # Preview production build

# Code quality
npm run format          # Format code with Prettier
npm run format:check    # Check formatting
npm test                # Run Vitest tests
```

### Deno Scripts

For detailed instructions on running data processing scripts (OParl scraping, paper assets, video processing, search indexing, etc.), see **docs/guides/HOWTO.md**.

For code quality:
```bash
bun run format          # Format code (all of src/, see Bun Scripts)
deno lint               # Lint code
deno test --permit-no-files  # Run tests
deno check src/         # Type-check code
```

### Bun Scripts

The scripts in `src/` are moving from Deno to Bun one by one (see ADR-0007). Folders already on Bun are listed in `tsconfig.json` `include`; `deno lint` still covers them, `deno check`/`deno test` skip them. Exception: `src/scripts/shared/` runs on both runtimes until the last script that uses it is on Bun, so `deno check` still covers its code and only its tests are skipped. `bun run format` covers all of `src/`, whatever the runtime.

```bash
bun install             # Install dependencies
bun run format          # Format src/ (bun fmt; format:check to check only)
bun run typecheck       # Type-check migrated folders (bun check)
bun run test            # Run tests of migrated folders (never pass paths)
```

## Architecture

**Architecture documentation (arc42):** A structured architecture description following the [arc42](https://arc42.org) template lives in `docs/arc42/` (in German). Start at `docs/arc42/index.adoc`. Consult and keep it up to date when making architectural changes.

### Data Flow

1. **OParl Ingestion** → scrape-oparl fetches parliamentary data from the city council's OParl API
2. **Paper Assets** → generate-paper-assets converts OParl data to batched JSON format, download-paper-files fetches PDFs
3. **OParl Derivates** → generate-oparl-derivatives precompiles the raw OParl data into two small, committed build inputs (`data/paper-index.json`, `data/{period}/voting-paper-map.json`). The **web build reads only these derivates, never the raw `data/oparl-magdeburg/`**. Raw OParl is a maintainer-only input for regenerating the derivates (populated via `fetch-oparl`).
4. **Video Processing** → scan-voting-images extracts voting results via OCR, parse-speakers identifies speakers, speech-to-text transcribes using OpenAI
5. **Asset Generation** → generate-image-assets creates voting visualization PNGs
6. **Search Indexing** → index-search imports into Typesense for full-text search
7. **Web Rendering** → Astro builds static pages using data/ directory (committed derivates + session data)

### Data Storage

Processed data lives in `data/`: one directory per parliament period with its `registry.json` and one subdirectory per session (`YYYY-MM-DD`). The full layout, including what is committed and what lives in S3, is in `docs/arc42/05-bausteinsicht/01-ebene-1-gesamtsystem.adoc` (section "Aufbau der Datenablage").

### Key Models

Models are **shared between Astro and the scripts in `src/`** via Deno and Bun workspaces. The canonical definitions live in `astro/src/models/` and are re-exported to the scripts through the `@srw-astro/models` workspace package in `src/deps/astro/`:

- `astro/src/models/oparl.ts` - OParl types (OparlBody, OparlMeeting, OparlPaper, OparlFile, etc.)
- `astro/src/models/registry.ts` - Parliament period registry (sessions, persons, factions, parties)
- `astro/src/models/session-scan.ts` - Voting data (SessionScanItem, votes array)
- `astro/src/models/session-speech.ts` - Speech transcriptions
- `astro/src/models/SessionInput.ts` - Combined session data
- `astro/src/models/Session.ts` - Shared voting enums and derived vote type

The **registry.json** file is the **source of truth** for parliament period metadata (persons, factions, parties, sessions). Each parliament period has its own registry.json in `data/{period-id}/registry.json`.

### Data Analysis

Analysis algorithms in `astro/src/data-analysis/`:

- **VotingMatrix.ts** - Calculates similarity between council members based on voting patterns
- **ParticipationRate.ts** - Tracks attendance in voting sessions
- **AbstentionRate.ts** - Calculates abstention frequency
- **VotingSuccess.ts** - Measures how often votes align with outcome
- **SpeakingTime.ts** - Aggregates speaking time per person
- **UniformityScore.ts** - Measures faction cohesion in voting
- **PersonsForces.ts** - Force-directed graph positioning for voting similarity
- **MotionsSuccess.ts** - Tracks success rate of party motions

These functions take data from session files and registry.json, compute metrics, and return results for visualization.

### User-Facing Pages

Key pages in `astro/src/pages/`:

- `/` - Home page
- `/paper/` - Paper detail view with PDF viewer and consultations timeline
- `/pp/{parliamentPeriodId}/` - Parliament period overview
- `/pp/{parliamentPeriodId}/sessions/` - Sessions list
- `/pp/{parliamentPeriodId}/session/{sessionId}/` - Session details with votings, speeches, and speaking times
- `/pp/{parliamentPeriodId}/persons/` - Council members list and graph
- `/pp/{parliamentPeriodId}/person/{personId}/` - Person profile with statistics and voting matrix
- `/pp/{parliamentPeriodId}/factions/` - Factions overview
- `/pp/{parliamentPeriodId}/faction/{factionId}/` - Faction details with councilors, motions, and statistics
- `/pp/{parliamentPeriodId}/parties/` - Parties overview
- `/pp/{parliamentPeriodId}/party/{partyId}/` - Party details
- `/search/` - Full-text search across papers and speeches

### API Routes

Public REST API v1 in `astro/src/pages/api/v1/`:

- `GET /api/v1/parliament-periods.json` - List all periods
- `GET /api/v1/parliament-periods/{id}.json` - Get period details
- `GET /api/v1/parliament-periods/{id}/speeches/{sessionId}.json` - Session speeches
- `GET /api/v1/parliament-periods/{id}/votings/{sessionId}.json` - Session votings

All API responses include metadata and are licensed under CC0 1.0. See `astro/src/pages/api/v1/README.md` for full API documentation.

### Frontend Tech Stack

- **Astro 7** - Static site generator with server-side rendering
- **Alpine.js** - Lightweight interactivity
- **Tailwind CSS 4 + DaisyUI** - Styling
- **Chart.js + D3.js** - Data visualization
- **Typesense** - Search engine (client-side search)

Environment variables are configured in `astro/astro.config.mjs` using Astro's env schema. Required vars: `DEFAULT_PARLIAMENT_PERIOD`, `AWS_CLOUDFRONT_BASE_URL`, Typesense connection details.

### Docker Containers

Each data processing script has a corresponding Dockerfile in `docker/` for containerized execution. See docs/guides/HOWTO.md for build and run instructions.

## Development Workflow

### Working with Parliament Data

1. To add a new parliament period, create `data/{period-id}/registry.json` with sessions, persons, factions, parties
2. For new sessions, create `data/{period-id}/{session-date}/` directory
3. Run the processing scripts in the order in docs/guides/HOWTO.md ("Mandatory processing order")
4. The Astro build automatically picks up data from `data/` directory

### Testing Changes

- Enable the versioned pre-commit hook once per clone: `git config core.hooksPath .githooks`
- Astro: Use `npm test` in astro/ directory (Vitest)
- Deno scripts: Use `@std/testing` and run with `deno test`
- Bun scripts: Use `bun:test` and run with `bun run test`
- Manual testing: Run `npm run dev` in astro/ to see changes live

### Continuous Integration

The project uses GitHub Actions for automated quality checks (`.github/workflows/ci.yml`) on push/PR to main branch:
- Deno Checks
- Bun Checks
- Astro Checks

All checks must pass before merging PRs.

### OParl Integration

OParl is a standard API for German parliamentary information systems. The scraper (`src/scripts/scrape-oparl/`) fetches:
- Body (parliament organization)
- Meetings (sessions)
- Papers (proposals, applications)
- Files (PDF documents)
- AgendaItems
- Consultations
- Organizations

OParl objects are stored in `data/oparl-magdeburg/` and referenced by URL (object IDs). The scraper supports two modes:
- **full** - Fetches all data from a specified date
- **incremental** - Fetches only new/updated data

**OParl Repository Pattern**: The project uses a repository pattern for accessing OParl data located in `src/scripts/shared/oparl/`:
- `oparl-meetings-repository.ts` - Query meetings by ID or date range
- `oparl-papers-repository.ts` - Query papers with methods like `getAllPapers()`, `getFilesByPaper()`
- `oparl-files-repository.ts` - Access file metadata
- `oparl-agenda-items-repository.ts` - Extended agenda item model with consultation info
- `oparl-organizations-repository.ts` - Access organization data
- `oparl-objects-store.ts` - In-memory storage layer

All repositories have comprehensive test coverage using BDD-style tests (`.test.ts` files).

### Video Processing Pipeline

Videos are hosted on YouTube. Processing extracts:
1. **Voting screenshots** → OCR with Tesseract to detect votes (yes/no/abstain/no_show)
2. **Speaker diarization** → RTTM files identify who speaks when
3. **Speech transcription** → OpenAI Whisper API generates text

Results are stored per session in JSON files (session-scan-*.json, session-speeches-*.json).

### Search Implementation

Typesense collections:
- **papers** - All council papers with full-text PDF content
- **speeches** - Transcribed speeches

Index is rebuilt with index-search script (see src/scripts/index-search/README.md). Frontend uses Typesense JS client for instant search. Client configuration is in `astro/astro.config.mjs`.

## Code Conventions

- **Shared models**: Define canonical model changes in `astro/src/models/`. A new model file also needs a one-line re-export in `src/deps/astro/` and an entry in the `exports` map of both `src/deps/astro/package.json` and `src/deps/astro/deno.json`
- **`src/` formatting**: `bun fmt`, single quotes, 120 char line width (see `bunfig.toml`)
- **Astro formatting**: Uses Prettier with .prettierrc
- **File naming**: Use kebab-case for directories and TypeScript files. Existing camelCase and PascalCase files keep their names
- **Session IDs**: Always use ISO date format YYYY-MM-DD
- **Code Style**:
  - **Always** write self-documenting code with clear, descriptive names
  - **Always** refactor unclear code rather than adding explanatory comments
  - **Always** extract complex logic into well-named functions
  - **Never** add comments explaining what code does. Exception: Comments explaining why (business rules, external constraints) are fine. Comments explaining *what* means the code needs refactoring.
  - **Never** use cryptic abbreviations or unclear variable names

## Boundaries

- **Always** give commits and PR descriptions human attribution only: no AI co-author trailers, no "Generated with" footers
- **Never** commit secrets or `.env` files
- **Never** force push to main

## Important Notes

- The project is specific to Magdeburg city council but could be adapted for other German municipalities using OParl
- Voting data comes from manual OCR scanning, so accuracy depends on screenshot quality
- Corrections to approved session data go in their own PR whose title names the error; never mix them into a PR that adds new sessions
- Speech transcriptions require OpenAI API key (configured via environment variables, see `src/scripts/speech-to-text/README.md`)
- Some parties may have an "EXTREMIST_CLASSIFICATION" field in registry due to constitutional protection office classifications

## Agent skills

### Issue tracker

Issues live in GitHub Issues (JensWinter/StadtratWatch-web), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` at the repo root + ADRs in `docs/arc42/09-architekturentscheidungen/`. See `docs/agents/domain.md`.
