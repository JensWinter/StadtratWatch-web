# generate-image-assets

## Purpose

Reads a parliament period's `registry.json` and the reviewed `session-scan-{date}.json` of each session, and renders one
PNG per voting (1200×630): subject, motion, result and the votes per faction. A majority requirement other than the
simple majority is named in a line under the result.

## Usage

From the repository root:

```bash
bun src/scripts/generate-image-assets/index.ts \
  -i data/magdeburg-8 \
  -o output/image-assets/magdeburg-8
```

| Flag               | Description                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------- |
| `-i, --input-dir`  | Directory of one parliament period, with its `registry.json` and one subdirectory per session.  |
| `-o, --output-dir` | Directory the images are written into, as `images/votings/{sessionId}/{sessionId}-{nnn}.png`.   |
| `--push`           | After generating, publish the output directory to S3/CloudFront (see [below](#publish---push)). |
| `--dry-run`        | Only with `--push`: print the diff without writing to S3 or invalidating CloudFront.            |
| `-h, --help`       | Show the help text and exit.                                                                    |

`{nnn}` is the voting id, zero-padded to three digits. Generating the images does **not** publish them; see
[below](#publish---push).

### Verdana is required

The images are set in Verdana, and the subject is wrapped by measuring the text in that font. Another font has different
glyph widths and changes how about 5% of the subjects wrap, so the script stops with an error before rendering anything
if Verdana is not installed.

- **macOS** has Verdana built in.
- **Linux** needs the Microsoft core fonts, e.g. Debian's `ttf-mscorefonts-installer` (msttcorefonts). The Docker image
  installs them.

The font files are not in the repository: the Microsoft core fonts licence only allows passing them on in their original
installer packaging.

## Docker

Build the image from the repository root:

```bash
docker build -t srw-generate-image-assets -f docker/generate-image-assets.Dockerfile .
```

Run it with the period directory mounted read-only and the output directory mounted writable:

```bash
docker run \
  --rm \
  -v $(pwd)/data/magdeburg-8:/app/input-dir:ro \
  -v $(pwd)/output/image-assets/magdeburg-8:/app/output-dir \
  srw-generate-image-assets
```

The input and output directories are fixed to the mounted `/app/input-dir` and `/app/output-dir`. Arguments after the
image name are appended, e.g. `--push`; pass the AWS variables with `-e` as well.

The container runs as user `bun` (UID 1000). On a Linux host, the mounted output directory must be writable by that
user.

## Publish (`--push`)

Adding `--push` publishes the output directory to `web-assets/parliament-periods/{period}/` after generating. This is
the only way to publish this prefix (see [publishing-web-assets.md](../../../docs/guides/publishing-web-assets.md)). The
period is read from the registry's `id`, and the `images/votings/{sessionId}/` sub-tree is mirrored as-is under the
period prefix. The output directory is the authoritative picture of the period prefix, so the push uploads new or
changed images, **prunes** orphaned ones, sets `Cache-Control`, invalidates the touched paths, and then verifies the
remote prefix against the images it produced, catching a silent upload failure.

```bash
bun --env-file=.env.local src/scripts/generate-image-assets/index.ts \
  -i data/magdeburg-8 \
  -o output/image-assets/magdeburg-8 \
  --push
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
