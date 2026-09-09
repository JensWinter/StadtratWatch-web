## Publishing web assets to S3/CloudFront

The web application is built by Netlify from the `main` branch, but the large assets it fetches at runtime are **not** part of that build. They live in an S3 bucket behind the public CloudFront distribution under the `web-assets/` prefix, and each generator publishes its own assets there via a `--push` flag.

### What goes where

Each prefix under `web-assets/` is published by exactly one generator. Every generator writes to a
local `output/` directory (git-ignored) and, with `--push`, mirrors that directory to its prefix.

| Local source | S3 prefix | Published by |
| --- | --- | --- |
| `output/paper-assets/` | `web-assets/papers/` | `generate-paper-assets --push` |
| `output/paper-votings/` | `web-assets/paper-votings/` | `generate-paper-votings --push` |
| `output/image-assets/{period}/` | `web-assets/parliament-periods/{period}/` | `generate-image-assets --push` |

Because the sources are git-ignored, they exist only on the machine that ran the generator, so a push always follows a fresh generate rather than relying on a stale local copy.

`generate-image-assets` writes the `images/votings/{sessionId}/` sub-tree itself, so the period
directory is mirrored as-is. The voting id in the filename is zero-padded to three digits, giving
keys like `web-assets/parliament-periods/magdeburg-8/images/votings/2024-10-17/2024-10-17-047.png`.

The `oparl/` prefix in the same bucket is the one exception: it is published by `scrape-oparl --push`
(content-addressed, immutable blobs plus a manifest — never invalidated). Do not conflate its rules
with `web-assets/`. See [HOWTO.md](HOWTO.md#publish-the-snapshot-to-s3cloudfront---push).

### How a `--push` run works

The three generators share one publisher, so a push behaves identically for every prefix. The
generated `output/` directory is the **authoritative picture** of the prefix — each generator prunes
stale local files as it writes, so what is on disk is exactly what the prefix should contain. Against
that authoritative list the publisher:

1. **Uploads** new or changed objects (change is detected by comparing the local MD5 against the
   remote ETag, so unchanged objects are skipped).
2. **Prunes** remote orphans — objects under the prefix that the generator no longer produces. This
   is what a console upload could never do: an upload only adds and overwrites, so a removed batch
   would otherwise serve stale data forever.
3. Sets an explicit **`Cache-Control: public, max-age=3600`** on every upload. Unlike the immutable
   `oparl/` blobs, these files are overwritten in place under stable names, so a one-hour TTL keeps
   caches warm between the infrequent publishes while bounding how long a stale copy can linger.
4. **Invalidates** the touched CloudFront paths (every upload and delete). The edge turns fresh
   immediately; the TTL from step 3 only governs already-warm browser caches, which an invalidation
   cannot reach.
5. **Verifies** by re-listing the prefix and asserting it holds *exactly* the produced files. A
   silent put or delete failure leaves the bucket disagreeing with the plan, and this read-back
   catches it — the run fails loudly listing any missing upload or unpruned orphan, rather than
   leaving a silent gap.

Because batch filenames are derived from the paper id (`paper-votings-{batch}.json` /
`papers-{batch}.json`, where `batch = paperId / 100`, zero-padded — see `toPaperBatchNo` in
`astro/src/models/paper-batch.ts`), they are **stable across runs** and overwritten in place. Adding
a paper to an existing batch changes that file's content but not its name.

### Configuration

A push reads the AWS configuration from the environment; a plain generate run needs none of it. The
variables are validated **only when `--push` is set** (see `.env.sample`):

| Variable | Purpose |
| --- | --- |
| `AWS_S3_BUCKET` | Target bucket (the same bucket behind CloudFront that the OParl snapshot uses). |
| `AWS_REGION` | Bucket region. |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Credentials with write access. **Never commit these**; provide them via the environment at runtime. |
| `AWS_CLOUDFRONT_DISTRIBUTION_ID` | Distribution to invalidate. Needed only for web assets — unlike the immutable OParl blobs, these are overwritten in place and so must be invalidated on every publish. |

### Previewing with `--dry-run`

Add `--dry-run` alongside `--push` to print the upload / delete / invalidate plan **without** writing
to S3 or invalidating CloudFront. It lists the prefix and computes the diff exactly as a real run
would, so it is the safe way to see what a publish would change before committing to it.

The exact per-generator invocations live in [HOWTO.md](HOWTO.md) under each generator's
*Publish to S3/CloudFront (`--push`)* section.

### Verifying a publish

The publisher verifies itself (step 5 above): a failed publish throws rather than passing silently,
so a green run is already evidence that the prefix matches the produced files. That closes the old
trap where a missed upload was indistinguishable from a paper that was simply never voted on.

To spot-check the live edge afterwards, remember that a missing object under `web-assets/` returns
**`403 Forbidden`**, not `404` — the bucket denies `s3:ListBucket`, so S3 reports `AccessDenied`
rather than `NoSuchKey`. Do not read a 403 as a permissions regression. Probe a key you know the
generator produced (check `output/` first), for example a `paper-votings` batch that has content in
two parliament periods and therefore also exercises the cross-period path:

```shell
curl -sS -o /dev/null -D - \
  "$AWS_CLOUDFRONT_BASE_URL/web-assets/paper-votings/paper-votings-2391.json"
```

Expected: `HTTP/2 200` with `content-type: application/json`. Then confirm the page renders the tab
at `/paper?paperId=239123` (period badges visible, cards link to the voting detail pages).

Do not probe an arbitrary batch to judge a publish: `paper-votings` batches exist only for papers
that were actually voted on (far fewer than the paper batches), so a 403 is ambiguous between »never
uploaded« and »correctly empty«. The post-publish verification is the authoritative check; a manual
curl is only a live-edge spot-check.
