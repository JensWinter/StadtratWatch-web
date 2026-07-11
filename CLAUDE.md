# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
deno fmt                # Format code
deno lint               # Lint code
deno test               # Run tests
deno check src/         # Type-check code
```

## Architecture

**Architecture documentation (arc42):** A structured architecture description following the [arc42](https://arc42.org) template lives in `docs/arc42/` (in German). Start at `docs/arc42/index.adoc`. Consult and keep it up to date when making architectural changes.

### Data Flow

1. **OParl Ingestion** → scrape-oparl fetches parliamentary data from the city council's OParl API
2. **Paper Assets** → generate-paper-assets converts OParl data to batched JSON format, download-paper-files fetches PDFs
3. **Video Processing** → scan-voting-images extracts voting results via OCR, parse-speakers identifies speakers, speech-to-text transcribes using OpenAI
4. **Asset Generation** → generate-image-assets creates voting visualization PNGs
5. **Search Indexing** → index-search imports into Typesense for full-text search
6. **Web Rendering** → Astro builds static pages using data/ directory

### Data Storage

All processed data lives in `data/` directory with this structure:

```text
data/
├── magdeburg-7/              # Parliament period 7 (2019-2024)
│   ├── registry.json         # Persons, factions, parties, sessions list
│   └── YYYY-MM-DD/          # Per-session data
│       ├── config-*.json
│       ├── session-scan-*.json      # Voting results
│       ├── session-speakers-*.json  # Speaker segments
│       └── session-speeches-*.json  # Transcriptions
├── magdeburg-8/              # Parliament period 8 (2024-)
├── oparl-magdeburg/          # Raw OParl API data
└── papers/                   # Paper metadata in batched JSON files
```

### Key Models

Models are **shared between Astro and Deno** via Deno workspaces. The canonical definitions live in `astro/src/models/` and are re-exported to Deno through the `@srw-astro/models` workspace package in `src/deps/astro/`:

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

- **Astro 5** - Static site generator with server-side rendering
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
3. Run processing scripts in order (see docs/guides/HOWTO.md): scrape-oparl → generate-paper-assets → video processing → generate-image-assets → index-search
4. The Astro build automatically picks up data from `data/` directory

### Testing Changes

- Astro: Use `npm test` in astro/ directory (Vitest)
- Deno scripts: Use `@std/testing` and run with `deno test`
- Manual testing: Run `npm run dev` in astro/ to see changes live

### Continuous Integration

The project uses GitHub Actions for automated quality checks (`.github/workflows/ci.yml`) on push/PR to main branch:
- Deno Checks
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

Results are stored per session in JSON files (session-scan-*.json, session-speakers-*.json, session-speeches-*.json).

### Search Implementation

Typesense collections:
- **papers** - All council papers with full-text PDF content
- **speeches** - Transcribed speeches

Index is rebuilt with index-search script (see docs/guides/HOWTO.md). Frontend uses Typesense JS client for instant search. Client configuration is in `astro/astro.config.mjs`.

## Code Conventions

- **Shared models**: Define canonical model changes in `astro/src/models/`
- **Deno formatting**: Uses single quotes, 120 char line width (see deno.json)
- **Astro formatting**: Uses Prettier with .prettierrc
- **File naming**: Use kebab-case for directories, camelCase for TypeScript
- **Session IDs**: Always use ISO date format YYYY-MM-DD

## Important Notes

- The project is specific to Magdeburg city council but could be adapted for other German municipalities using OParl
- Voting data comes from manual OCR scanning, so accuracy depends on screenshot quality
- Speech transcriptions require OpenAI API key (configured via environment variables in Deno scripts)
- Some parties may have an "EXTREMIST_CLASSIFICATION" field in registry due to constitutional protection office classifications
- Session data is **immutable** once approved - don't modify historical data without good reason
- When working with shared models between Astro and Deno, make changes in both locations to maintain consistency
- Be sure to typecheck when you’re done making a series of code changes

## Agent skills

### Issue tracker

Issues live in GitHub Issues (JensWinter/StadtratWatch-web), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
