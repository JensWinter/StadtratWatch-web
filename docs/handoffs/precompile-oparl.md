# Handoff: Precompile OParl data before the Astro build

**Status:** Planned, not started. No code changed yet.
**Date:** 2026-06-28
**Branch:** `main` (start a feature branch before implementing).

## What this is

Move the council-scoped OParl filtering/slimming out of the Astro build into an
**offline Deno precompile step** that writes small, git-committed JSON, and have
Astro read that instead of the raw ~123 MB OParl snapshot.

## The plan (authoritative — read this first)

The full, agreed implementation plan lives at:

`~/.claude/plans/currently-oparl-data-is-modular-hammock.md`

It contains: Context, the seven resolved design decisions, a 6-part
implementation breakdown (new script, shared model, content collections, page
wiring, build config, docs), and a verification section. **Do not re-derive —
implement it.** Copy that file into the repo (e.g. alongside this handoff) if the
next agent can't read the `~/.claude/plans` path.

## How we got here (decisions already settled — don't reopen)

These were resolved with the user during a grilling session; each was a
deliberate choice, not a default:

1. **Scope:** OParl collections only (not registry/scans/speeches, not analysis).
2. **Output shape:** prepared *entities* (same element types, pre-filtered) — not
   page view-models.
3. **Paper-detail is out of scope:** it already loads enriched bundles at
   *runtime* client-side (`astro/src/pages/paper/index.astro:254,285` fetch from
   CloudFront). Don't touch it.
4. **Topology:** a new sibling Deno script reusing `src/scripts/shared/oparl/`
   repositories; leave `generate-paper-assets` papers-focused.
5. **Location:** derive offline, **commit to git** under a new
   `data/oparl-council/` (mirrors the committed `data/papers/` precedent). Not S3.
6. **Papers:** emit a lightweight metadata-only **papers index**; the build keeps
   the rolling 3-month filter so `/papers` stays fresh per deploy.
7. **Build decoupling:** full — remove the 4 raw collections, drop `fetch-oparl`
   from `prebuild`/`predev`, and remove the `NODE_OPTIONS=…8192` heap override
   after verifying the build no longer needs it.

## Key facts the investigation surfaced (so you don't re-explore)

- The 4 raw collections live in `astro/src/content.config.ts:48-78` (custom
  `fs.readFileSync` loaders over `../data/oparl-magdeburg/*.json`).
- Raw snapshot is gitignored (`.gitignore:56`, `/data/oparl-magdeburg/`), fetched
  from S3/CloudFront by `astro/scripts/fetch-oparl/` via `prebuild`/`predev`
  (`astro/package.json`). See ADR-0005.
- **Only two build-time consumers** of the raw collections:
  - `astro/src/pages/pp/[parliamentPeriodId]/_helpers.ts:7-22` — council-org
    filter (`…/organizations/gr/1`), threaded as plain `OparlMeeting[]` /
    `OparlAgendaItem[]` / `OparlConsultation[]` into
    `faction/[factionId]/_motions.astro` and the voting page. Same set is
    attached to *every* parliament period (not period-split).
  - `astro/src/pages/papers/index.astro:6` + `papers/_helpers.ts`
    (`getRecentMainPapers`) — main papers in a rolling ~3-month window computed at
    build time.
- Nothing else in `astro/` reads `oparl-magdeburg` (verified by grep). So the
  swap is low-risk and downstream templates stay untouched (same entity types).
- Reusable primitives already exist: `src/scripts/shared/oparl/`
  (`oparl-objects-store.ts`, `oparl-meetings-repository.ts` →
  `getMeetingsByOrganization`, etc.), all with BDD tests.
- `generate-paper-assets` (`src/scripts/generate-paper-assets/`) is the structural
  template to mirror for the new script.

## Step-by-step implementation

Work top-to-bottom; each phase ends at a green checkpoint. Commit per phase.

### Phase 0 — Prep
- [ ] Branch off `main` (e.g. `feat/precompile-oparl-assets`).
- [ ] Ensure a raw OParl snapshot is present locally: run `fetch-oparl`
      (`cd astro && npm run fetch-oparl`) — populates `data/oparl-magdeburg/`.
      Confirm the 9 JSON files exist.

### Phase 1 — New Deno precompile script
- [ ] Scaffold `src/scripts/generate-oparl-assets/` mirroring
      `src/scripts/generate-paper-assets/`:
  - `index.ts` — entrypoint (read input dir, write output dir).
  - generator — load `OparlObjectsStore`; via `oparl-meetings-repository`
    `getMeetingsByOrganization(COUNCIL_ORG_ID)`; filter agenda-items +
    consultations to those meeting IDs (same predicate as `_helpers.ts:13-22`);
    build the papers index (main papers = `subordinatedPaper` empty + has date;
    keep only `{ id, date, paperType, reference, name }`).
  - writer — write `data/oparl-council/{meetings,agenda-items,consultations,papers-index}.json`.
  - Define `COUNCIL_ORG_ID =
    'https://ratsinfo.magdeburg.de/oparl/bodies/0001/organizations/gr/1'` as a
    named constant here (moved out of `_helpers.ts`).
- [ ] Add BDD `.test.ts` files (mirror the repository test style). Cover: org
      filter, agenda/consultation linkage, papers-index field selection.
- [ ] Register a `deno task` for it if the others have one (check `deno.json`).
- [ ] **Checkpoint:** `deno fmt && deno lint && deno check src/ && deno test`.

### Phase 2 — Shared model
- [ ] Add `PaperIndexItem` in `astro/src/models/oparl-prepared.ts` (canonical),
      re-exported to Deno through `@srw-astro/models` (`src/deps/astro/`), like
      the other shared models. Use it in the script's writer typing.

### Phase 3 — Generate + commit prepared data
- [ ] Run `generate-oparl-assets` against the snapshot.
- [ ] **Parity check:** the emitted meeting/agenda/consultation counts must equal
      what `_helpers.ts:7-22` produces from the same snapshot (quick throwaway
      script or a test asserting counts). Fix the port if they differ.
- [ ] Commit `data/oparl-council/*.json`. Verify the dir is **not** under the
      gitignored `/data/oparl-magdeburg/` and is actually tracked
      (`git status` shows it staged).

### Phase 4 — Astro content collections + page wiring
- [ ] `astro/src/content.config.ts`: repoint `oparlMeetings` / `oparlAgendaItems`
      / `oparlConsultations` loaders to `../data/oparl-council/*.json` (same
      element types). Replace `oparlPapers` with a `papersIndex` collection typed
      `PaperIndexItem`.
- [ ] `astro/src/pages/pp/[parliamentPeriodId]/_helpers.ts`: delete the filter
      block (`:7-22`); just `getCollection` the now-prepared collections and
      `.map(d => d.data)`. Leave all downstream prop-threading unchanged.
- [ ] `astro/src/pages/papers/index.astro`: `getCollection('papersIndex')`.
- [ ] `astro/src/pages/papers/_helpers.ts` (`getRecentMainPapers`) + `_models.ts`
      (`RecentPaper`): operate on `PaperIndexItem[]`; **keep** the rolling
      3-month window logic.
- [ ] **Checkpoint:** `cd astro && npx astro check` (types) passes.

### Phase 5 — Build config
- [ ] `astro/package.json`: remove the `prebuild` and `predev` `fetch-oparl`
      hooks (keep the `fetch-oparl` script — now a precompile prerequisite).
- [ ] Remove `NODE_OPTIONS='--max-old-space-size=8192'` from `build` (do this
      after Phase 6 confirms it's unnecessary if you want to be cautious).

### Phase 6 — Verify the decoupled build
- [ ] Temporarily rename `data/oparl-magdeburg/` away.
- [ ] `cd astro && npm run build` — must succeed with no `fetch-oparl` and no heap
      override; note peak memory vs before.
- [ ] Spot-check rendered output against `main`: a parliament-period page,
      `faction/[factionId]` motions, a voting detail page, and `/papers`.
- [ ] `npm test` (Vitest) + `npm run format:check`.
- [ ] Restore `data/oparl-magdeburg/`.

### Phase 7 — Documentation (CLAUDE.md requires arc42 stays in sync)
- [ ] New ADR in `docs/arc42/09-architekturentscheidungen/` (companion to
      ADR-0005): precompiled, git-committed council OParl slice + build decoupling.
- [ ] Update `§05` (new `generate-oparl-assets` pipeline stage), `§06` (build no
      longer fetches/parses raw OParl), `§08` (prepared OParl committed like
      `data/papers`).
- [ ] Update `docs/guides/HOWTO.md` with the new script and run order
      (after `scrape-oparl`, alongside `generate-paper-assets`).

### Phase 8 — Wrap up
- [ ] Open PR; ensure CI (Deno Checks + Astro Checks) is green.

## Verification (from the plan)

- Deno: `deno test`, `deno fmt`, `deno lint`, `deno check src/`.
- **Parity check:** new script's meeting/agenda/consultation counts must match
  what the old `_helpers.ts` filter produced from the same snapshot.
- Astro build with `data/oparl-magdeburg/` removed/renamed — must succeed without
  `fetch-oparl` and without the 8 GB override, using less memory.
- Spot-check rendered pages vs `main`: a parliament-period page, faction motions,
  a voting detail page, `/papers`.
- `npm test` (Vitest) for the papers helper change; `npm run format:check`.

## Watch out for

- `data/oparl-council/` must NOT land under the gitignored
  `/data/oparl-magdeburg/` — it's a new committed dir.
- Don't freeze the papers list: emit the *index*, keep the date-window filter in
  the page (else `/papers` goes stale between regenerations).
- `fetch-oparl` script stays (now a prerequisite of the precompile step); only its
  `prebuild`/`predev` hooks are removed.
- Process discipline: when OParl changes, a maintainer must run
  `fetch-oparl` → `generate-oparl-assets` → commit (same as `data/papers` today).

## Suggested skills for the next session

- **`grill-with-docs`** — before/while coding, to land the new ADR and arc42
  updates (§05/§06/§08) cleanly, since this is an architectural change CLAUDE.md
  requires documenting.
- **`code-review`** — after implementation, to review the diff for correctness and
  the parity of the council-filter port.
- **`verify`** / **`run`** — to drive the Astro build and confirm pages render and
  memory usage drops without the raw snapshot.
- **`git-commit`** — for the staged commits (script, generated data, wiring, docs).
