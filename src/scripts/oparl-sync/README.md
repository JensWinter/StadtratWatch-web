# oparl-sync

## Purpose

Runs the **OParl-Sync** (see [GLOSSARY](../../../GLOSSARY.md)): one manually started run that brings the papers up to
date with the Ratsinformationssystem. It is the first step of the processing order (see
[HOWTO](../../../docs/guides/HOWTO.md)) and calls the existing scripts in this order:

1. [`fetch-oparl`](../fetch-oparl/README.md), only if there is no local snapshot (no `scraper-metadata.txt` in the
   OParl directory).
2. [`scrape-oparl`](../scrape-oparl/README.md) `-m incremental --push`.
3. [`download-paper-files`](../download-paper-files/README.md) for each year, by default the current and the previous
   year.
4. [`generate-paper-assets`](../generate-paper-assets/README.md) `--push`.
5. [`generate-oparl-derivatives`](../generate-oparl-derivatives/README.md), only after the paper assets are published,
   so the derivates never point at papers whose data is not online yet.

The run has no review pause: OParl data is official, structured data without a recognition step. It stops at the first
failed step with a non-zero exit code; to resume, start the whole run again (every step can be repeated). At the end it
reports whether `paper-index.json` and `paper-reference-map.json` changed. It commits nothing; commit the derivates
yourself.

## Usage

From the repository root:

```bash
bun --env-file=.env.local src/scripts/oparl-sync/index.ts
```

Check first with `--dry-run`: it scrapes, downloads and generates locally and shows the paper-assets diff, but pushes
nothing (neither snapshot nor assets) and writes no derivates.

```bash
bun --env-file=.env.local src/scripts/oparl-sync/index.ts --dry-run
```

| Flag                 | Description                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `--dry-run`          | Publish nothing and write no derivates; show the paper-assets diff.                      |
| `-y, --year`         | Year whose PDFs are downloaded; repeat for several years. Default: current and previous. |
| `-r, --ratsinfo-dir` | OParl snapshot directory. Default: `data/oparl-magdeburg/`.                              |
| `-p, --papers-dir`   | PDF directory, one subdirectory per year. Default: `output/papers/`.                     |
| `-d, --data-dir`     | Data directory with the registries and the derivates. Default: `data/`.                  |
| `-o, --output-dir`   | Paper-assets directory. Default: `output/paper-assets/`.                                 |
| `-h, --help`         | Show the help text and exit.                                                             |

The environment variables are those of the called scripts (see their READMEs and `.env.sample`):
`SCRAPE_OPARL_BODY_URL`, `SCRAPE_OPARL_FETCH_DELAY_MS`, `OPARL_COUNCIL_ORGANIZATION_ID`, `AWS_CLOUDFRONT_BASE_URL`,
`AWS_S3_OPARL_PREFIX` (optional), `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and
`AWS_CLOUDFRONT_DISTRIBUTION_ID`.

## Docker

Build the image from the repository root:

```bash
docker build -t srw-oparl-sync -f docker/oparl-sync.Dockerfile .
```

Run it with `data/`, the PDF directory and the paper-assets directory mounted writable. The variables listed above must
be set in your shell:

```bash
docker run \
  --rm \
  -e SCRAPE_OPARL_BODY_URL \
  -e SCRAPE_OPARL_FETCH_DELAY_MS \
  -e OPARL_COUNCIL_ORGANIZATION_ID \
  -e AWS_CLOUDFRONT_BASE_URL \
  -e AWS_S3_OPARL_PREFIX \
  -e AWS_S3_BUCKET \
  -e AWS_REGION \
  -e AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY \
  -e AWS_CLOUDFRONT_DISTRIBUTION_ID \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/output/papers:/app/papers \
  -v $(pwd)/output/paper-assets:/app/generated \
  srw-oparl-sync
```

The directories are fixed to the mounted `/app/data`, `/app/papers` and `/app/generated`; mount `data/`, not
`data/oparl-magdeburg/`, because `fetch-oparl` swaps the snapshot directory by renaming. Arguments after the image name
go to `oparl-sync`, e.g. `srw-oparl-sync --dry-run` or `srw-oparl-sync -y 2024 -y 2025`.

The container runs as user `bun` (UID 1000). On a Linux host, the mounted directories must be writable by that user.
