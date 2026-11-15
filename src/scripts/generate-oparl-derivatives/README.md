# generate-oparl-derivatives

## Purpose

Precompiles the raw OParl data in `data/oparl-magdeburg/` into the committed OParl derivates the Astro build reads:

- `data/{period-id}/voting-paper-map.json`, one per parliament period: session date → agenda item number → paper id.
- `data/paper-index.json`, global: all main papers.
- `data/paper-reference-map.json`, global: Drucksachennummer → paper id for every paper that has one.

## Usage

From the repository root:

```bash
OPARL_COUNCIL_ORGANIZATION_ID=https://ratsinfo.magdeburg.de/oparl/bodies/0001/organizations/gr/1 \
  bun src/scripts/generate-oparl-derivatives/index.ts
```

Both flags have defaults that fit a run from the repository root, so the command above needs none. The run scans
`<data-dir>` for `{period-id}/registry.json` and regenerates the derivates of every period in one go. Output is
deterministic and stably sorted, so a repeated run on the same input produces no diff.

| Flag              | Description                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-o, --oparl-dir` | Directory with the raw OParl files (`meetings.json`, `agenda-items.json`, `consultations.json`, `papers.json`). Default: `data/oparl-magdeburg/`. |
| `-d, --data-dir`  | Directory with the parliament period registries. The derivates are written next to them. Default: `data/`.                                        |
| `-h, --help`      | Show the help text and exit.                                                                                                                      |

| Environment variable            | Description                                                                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `OPARL_COUNCIL_ORGANIZATION_ID` | OParl id of the city council (e.g. `https://ratsinfo.magdeburg.de/oparl/bodies/0001/organizations/gr/1`). Only meetings of this organization are matched to registry sessions. |

## Docker

Build the image from the repository root:

```bash
docker build -t srw-generate-oparl-derivatives -f docker/generate-oparl-derivatives.Dockerfile .
```

Run it with the `data/` directory mounted. The raw OParl data is read from `data/oparl-magdeburg/`, and the derivates
are written into `data/`:

```bash
docker run \
  --rm \
  -e OPARL_COUNCIL_ORGANIZATION_ID=https://ratsinfo.magdeburg.de/oparl/bodies/0001/organizations/gr/1 \
  -v $(pwd)/data:/app/data \
  srw-generate-oparl-derivatives
```

The container runs as user `bun` (UID 1000). On a Linux host, the mounted directory must be writable by that user.
