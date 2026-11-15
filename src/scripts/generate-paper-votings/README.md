# generate-paper-votings

## Purpose

Reads the period registries, the session scans and `paper-reference-map.json` from `data/` and writes the batched
`paper-votings-{batch}.json` files behind the »Abstimmungen« tab on the paper detail page: for each paper, the votings
it was decided in, with the faction/person breakdown. It runs after
[`generate-oparl-derivatives`](../generate-oparl-derivatives/README.md) and
[`scan-voting-images`](../scan-voting-images/README.md) in the processing order (see
[HOWTO](../../../docs/guides/HOWTO.md)).

## Usage

From the repository root:

```bash
bun src/scripts/generate-paper-votings/index.ts -d data/ -o output/paper-votings/
```

| Flag               | Description                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| `-d, --data-dir`   | Directory with the period registries, session scans and `paper-reference-map.json`. Default: `data/`. |
| `-o, --output-dir` | Directory the `paper-votings-{batch}.json` files are written into.                                    |
| `--push`           | After generating, publish the output directory to S3/CloudFront (see [below](#publish---push)).       |
| `--dry-run`        | Only with `--push`: print the diff without writing to S3 or invalidating CloudFront.                  |
| `-h, --help`       | Show the help text and exit.                                                                          |

A voting belongs to the paper whose Drucksachennummer was scanned with it, looked up in `paper-reference-map.json`.
Whitespace in the number is ignored, in the scan as in OParl (OParl has e.g. `A0249/25 /1`). A voting without a number,
or with a number that is not in OParl, belongs to no paper. The agenda item plays no part; it is only displayed. The
voting page and a faction's motion list link to the paper by the same rule (`astro/src/models/voting-paper.ts`).

Each vote is resolved to its person and faction against the period's `registry.json`, the same breakdown the session
detail page renders. Papers that were never voted on do not appear in the output at all (which is what disables the
tab). A paper voted on in several parliament periods collects the votings of all of them, each joined against its own
registry.

Output is batched by paper id (`batch = paperId / 100`) and stably sorted (session date descending, then voting id
ascending), so a repeated run produces no diff. Batches the run no longer produces are removed from the output
directory. Generating the files does **not** publish them; see [below](#publish---push).

A plain generate run needs no environment variables.

## Docker

Build the image from the repository root:

```bash
docker build -t srw-generate-paper-votings -f docker/generate-paper-votings.Dockerfile .
```

Run it with the data directory mounted read-only and the output directory mounted writable:

```bash
docker run \
  --rm \
  -v $(pwd)/data:/app/data:ro \
  -v $(pwd)/output/paper-votings:/app/generated \
  srw-generate-paper-votings
```

The data and output directories are fixed to the mounted `/app/data` and `/app/generated`. Arguments after the image
name are appended, e.g. `--push`; pass the AWS variables with `-e` as well.

The container runs as user `bun` (UID 1000). On a Linux host, the mounted output directory must be writable by that
user.

## Publish (`--push`)

Adding `--push` publishes the output directory to `web-assets/paper-votings/` after generating. This is the only way to
publish this prefix (see [publishing-web-assets.md](../../../docs/guides/publishing-web-assets.md)). The output
directory is the authoritative picture of the prefix (the run prunes empty batches), so the push uploads new or changed
batches, **prunes** orphaned ones, sets `Cache-Control`, invalidates the touched paths, and then verifies the remote
prefix against the batches it produced, catching a silent upload failure.

```bash
bun --env-file=.env.local src/scripts/generate-paper-votings/index.ts -o output/paper-votings/ --push
```

Use `--push --dry-run` to print the upload/delete/invalidate diff without writing to S3 or invalidating CloudFront.

The push reads these environment variables, validated **only when `--push` is set** (see `.env.sample`):

| Environment variable                          | Description                                                  |
| --------------------------------------------- | ------------------------------------------------------------ |
| `AWS_S3_BUCKET`                               | Target S3 bucket (the existing bucket behind CloudFront).    |
| `AWS_REGION`                                  | Bucket region.                                               |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Credentials with write access to the bucket.                 |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID`              | CloudFront distribution whose touched paths are invalidated. |

**Never commit credentials**; provide them via the environment at runtime.
