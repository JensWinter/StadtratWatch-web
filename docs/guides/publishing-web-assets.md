## Publishing web assets to S3/CloudFront

The web application is built by Netlify from the `main` branch, but the large assets it fetches at
runtime are **not** part of that build. They live in an S3 bucket behind the public CloudFront
distribution (`AWS_CLOUDFRONT_BASE_URL`, e.g. `https://d2zk2bghxwzsug.cloudfront.net`) and are
published separately, by hand.

> **This is a manual, maintainer-only step.** There is no `aws s3 sync` in this repository, no
> deployment workflow (`.github/workflows/ci.yml` is a quality gate only), and no other automation:
> the files are uploaded through the **AWS S3 console**. Publishing is therefore not triggered by a
> push and is decoupled from the website's release — newly generated assets stay invisible in
> production until someone uploads them. See [Known gaps](#known-gaps) for the sharp edges this
> creates.

### What goes where

Each prefix under `web-assets/` is a plain mirror of a local directory. Upload the directory's
contents so the keys land directly under the prefix (no extra nesting).

| Local source | S3 prefix | Produced by |
| --- | --- | --- |
| `data/papers/` (committed) | `web-assets/papers/` | `generate-paper-assets` |
| `output/paper-votings/` (**not** committed) | `web-assets/paper-votings/` | `generate-paper-votings` |
| `output/image-assets/{period}/` (**not** committed) | `web-assets/parliament-periods/{period}/` | `generate-image-assets` |

`generate-image-assets` already writes the `images/votings/{sessionId}/` sub-tree itself, so the
period directory is mirrored as-is. The voting id in the filename is zero-padded to three digits,
giving keys like
`web-assets/parliament-periods/magdeburg-8/images/votings/2024-10-17/2024-10-17-047.png`.

The `oparl/` prefix in the same bucket is the one exception: it is **not** uploaded by hand. It is
published by `scrape-oparl --push`, which is fully scripted and content-addressed. Do not touch it
through the console. See [HOWTO.md](HOWTO.md#publish-the-snapshot-to-s3cloudfront---push).

`web-assets/papers/` is the only prefix whose source is committed to git. `paper-votings` and the
image assets are generated into `output/` (git-ignored), so they exist only on the machine that ran
the generator — regenerate before uploading rather than relying on a stale local copy.

### Publishing `paper-votings`

1. Make sure the inputs are current: the OParl derivates (`data/{period}/voting-paper-map.json`) and
   the session scans (`data/{period}/{date}/session-scan-*.json`) must already reflect the sessions
   you want to appear. See the mandatory processing order in [HOWTO.md](HOWTO.md).
2. Regenerate the assets by running `generate-paper-votings` — the command is in
   [HOWTO.md](HOWTO.md#generate-paper-votings). The run is deterministic and prunes batch files that
   no longer have content, so `output/paper-votings/` is a complete, authoritative picture of what
   the prefix should contain — not an increment.
3. In the S3 console, open the bucket behind the CloudFront distribution (the same bucket as
   `OPARL_S3_BUCKET`) and navigate to `web-assets/paper-votings/`. Create the prefix on first publish.
4. Upload **all** files from `output/paper-votings/`, overwriting existing objects. Keep the default
   upload settings — see [Cache behaviour](#cache-behaviour) for why no metadata is set by hand.
5. Delete any `paper-votings-*.json` objects that the generator no longer produces. The console does
   not do this for you: an upload only adds and overwrites. A leftover batch file serves stale
   votings forever, because the client trusts whatever batch it fetches.
6. Invalidate and verify (below).

Because batch filenames are derived from the paper id (`paper-votings-{batch}.json`, where `batch` is
`paperId / 100` zero-padded to four digits — see `toPaperBatchNo` in
`astro/src/models/paper-batch.ts`), they are **stable across runs** and are overwritten in place.
Adding a paper to an existing batch changes that file's content but not its name.

### Cache behaviour

Existing web assets carry **no `Cache-Control` header at all** — neither the paper JSON batches nor
the voting PNGs. Uploading through the console without setting metadata reproduces exactly that, so
the correct action for `paper-votings` is to **set nothing**. It matches the other web assets, which
is what we want; it is not an endorsement of the setup (see [Known gaps](#known-gaps)).

With no explicit directive, CloudFront applies the distribution's **default TTL** and browsers fall
back to heuristic freshness based on `Last-Modified`.

The practical consequence: **an overwritten batch file needs a CloudFront invalidation.** This is the
opposite of the `oparl/` prefix, where blobs are content-hashed and immutable and therefore never
need one — do not carry that reasoning over to `web-assets/`. After re-uploading, invalidate the
paths you touched:

```text
/web-assets/paper-votings/*
```

Without the invalidation, edge locations keep serving the previous batch until the default TTL
expires, and the tab shows outdated votings (or none) in the meantime.

### Verifying a publish

A missing object under `web-assets/` returns **`403 Forbidden`**, not `404` — the bucket denies
`s3:ListBucket`, so S3 reports `AccessDenied` rather than `NoSuchKey`. Do not read a 403 as a
permissions regression.

**Do not probe an arbitrary batch to check whether a publish worked.** Only batches that contain at
least one voted-on paper exist at all — far fewer than the paper batches (122 vs. 486 at the time of
writing). A 403 therefore has two very different meanings, and you cannot tell them apart from the
status code:

- the batch was never uploaded — a real problem; or
- no paper in that batch has a scanned voting, so the generator correctly produced no such file —
  permanent and expected.

Pick the probe by checking `output/paper-votings/` first: a batch that does not exist locally must
return 403 in production too. `239123` is a good probe, since it has votings in two parliament
periods and therefore also exercises the cross-period path:

```shell
curl -sS -o /dev/null -D - \
  "$AWS_CLOUDFRONT_BASE_URL/web-assets/paper-votings/paper-votings-2391.json"
```

Expected: `HTTP/2 200` with `content-type: application/json`. Then confirm the page itself renders
the tab at `/paper?paperId=239123` (period badges visible, cards link to the voting detail pages).

The client treats every non-OK response the same way — the »Abstimmungen« tab stays disabled and no
error is surfaced. That makes a missed upload **silent**: it looks exactly like a paper that was
never voted on. The page will not tell you the publish failed, so verify against a batch you know
has content.

### Known gaps

These are accepted for now, not endorsed. The fix for all three is the same — script the upload,
modelled on the already-scripted, tested `src/scripts/scrape-oparl/oparl-s3-publisher.ts` — and is
tracked in [#463](https://github.com/JensWinter/StadtratWatch-web/issues/463).

- **The upload is manual.** A console click-path is unversioned, unreviewable, and easy to get
  half-right — forgetting step 5 leaves stale batch files serving old votings indefinitely.
- **No explicit `Cache-Control`.** Freshness depends on the distribution's default TTL and on
  remembering to invalidate by hand. A publisher should set the header explicitly.
- **A missed upload is silent.** The client degrades to a disabled tab, which is indistinguishable
  from a paper that was never voted on, so nothing surfaces the failure.
