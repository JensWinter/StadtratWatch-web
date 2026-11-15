# generate-oparl-derivatives

## Purpose

Precompiles the raw OParl papers in `data/oparl-magdeburg/papers.json` into the committed OParl derivates the Astro
build reads:

- `data/paper-index.json`, global: all main papers.
- `data/paper-reference-map.json`, global: Drucksachennummer → paper id for every paper that has one.

## Usage

From the repository root:

```bash
bun src/scripts/generate-oparl-derivatives/index.ts
```

Both flags have defaults that fit a run from the repository root, so the command above needs none. Output is
deterministic and stably sorted, so a repeated run on the same input produces no diff.

| Flag              | Description                                                                        |
| ----------------- | ---------------------------------------------------------------------------------- |
| `-o, --oparl-dir` | Directory with the raw OParl file `papers.json`. Default: `data/oparl-magdeburg/`. |
| `-d, --data-dir`  | Directory the derivates are written into. Default: `data/`.                        |
| `-h, --help`      | Show the help text and exit.                                                       |

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
  -v $(pwd)/data:/app/data \
  srw-generate-oparl-derivatives
```

The container runs as user `bun` (UID 1000). On a Linux host, the mounted directory must be writable by that user.
