## Mandatory processing order

Run the processing pipeline in this order. The script sections below document individual tools, but this sequence is mandatory because later steps depend on files produced by earlier steps.

1. `scrape-oparl` - fetch current OParl data.
2. `generate-paper-assets` - convert scraped OParl data into the internal paper assets.
3. `generate-oparl-assets` - derive the council-scoped OParl slice the web build reads (`data/oparl-council/`).
4. Video processing steps:
   1. `parse-speakers` - combine speaker diarization data for the session.
   2. `scan-voting-images` - extract voting results from session screenshots.
   3. `speech-to-text` - generate speech transcriptions.
5. `generate-image-assets` - create voting visualization image assets from processed session data.
6. `index-search` - rebuild the Typesense search index after all paper, speech, and asset data is available.


### Parse Speakers
This tool parses multiple rttm files (from one session) and generates a single json file containing all speakers data.

#### Using the deno script
```bash
DATE=2025-09-25
deno run \
  -A \
  src/scripts/parse-speakers/index.ts \
  -i sessions-media-files/$DATE \
  -o output/sessions-scan-results/$DATE \
  -s $DATE
```

#### Using a docker container

Build the docker image:
```bash
docker build -t srw-parse-speakers -f docker/parse-speakers.Dockerfile .
```

Run the docker container:
```bash
docker run \
  --rm \
  -v $(pwd)/sessions-media-files/2022-09-01:/app/input:ro \
  -v $(pwd)/output/sessions-scan-results/2022-09-01:/app/output \
  srw-parse-speakers \
  2022-09-01
```


### Scan voting images
This tool scans the voting images and generates a json file containing the voting data.

#### Using the deno script
```bash
PARLIAMENT_PERIOD=magdeburg-8
DATE=2025-09-25
deno run \
  -A \
  src/scripts/scan-voting-images/index.ts \
  -c data/$PARLIAMENT_PERIOD/$DATE/config-$DATE.json \
  -i sessions-media-files/$DATE \
  -o output/sessions-scan-results/$DATE \
  -s $DATE
```

#### Using a docker container

Build the docker image:

```bash
docker build -t srw-scan-voting-images -f docker/scan-voting-images.Dockerfile .
```

Run the docker container:
```bash
docker run \
	--rm \
	-v $(pwd)/data/magdeburg-7/2022-09-01/config-2022-09-01.json:/app/scan-config.json:ro \
	-v $(pwd)/sessions-media-files/2022-09-01:/app/voting-images:ro \
	-v $(pwd)/output/sessions-scan-results/2022-09-01:/app/output \
	srw-scan-voting-images \
	2022-09-01
```


### Speech transcriptions

#### Build the docker image
```bash
docker build -t srw-speech-to-text -f docker/speech-to-text.Dockerfile .
```

#### Run the docker container

OpenAI API key has to be provided by setting the following environment variable:
- `OPENAI_ORGANIZATION_ID`
- `OPENAI_PROJECT_ID`
- `OPENAI_API_KEY`

```shell
docker run \
	--rm \
	-e OPENAI_ORGANIZATION_ID=<OpenAI organization id> \
	-e OPENAI_PROJECT_ID=<OpenAI project id> \
	-e OPENAI_API_KEY=<OpenAI api key> \
	-v $(pwd)/output/sessions-scan-results/2022-09-01:/app/output \
	-v $(pwd)/output/speeches/2022-09-01:/app/speeches:ro \
	srw-speech-to-text \
	2022-09-01
```


### Generate image assets

#### Build the docker image
```bash
docker build -t srw-generate-image-assets -f docker/generate-image-assets.Dockerfile .
```

#### Run the docker container
```bash
docker run \
  --rm \
  -v $(pwd)/data/magdeburg-8:/app/input-dir:ro \
  -v $(pwd)/output/image-assets/magdeburg-8:/app/output-dir \
  srw-generate-image-assets
```


### Download paper files

#### Build the docker image
```bash
docker build -t srw-download-paper-files -f docker/download-paper-files.Dockerfile .
```

#### Run the docker container
```shell
docker run \
  --rm \
  -e OPARL_COUNCIL_ORGANIZATION_ID=https://ratsinfo.magdeburg.de/oparl/bodies/0001/organizations/gr/1 \
  -v $(pwd)/output/papers/2025:/app/papers \
  -v $(pwd)/output/ratsinfosystem:/app/oparl:ro \
  srw-download-paper-files \
  2025
```


### Generate paper assets
This tool converts OParl data into the internal paper asset format and generates metadata files for all council papers. It processes the scraped OParl data and creates JSON files in the specified output directory that are used by the web application.

#### Build the docker image
```bash
docker build -t srw-generate-paper-assets -f docker/generate-paper-assets.Dockerfile .
```

#### Run the docker container
```shell
docker run \
  --rm \
  -v $(pwd)/output/papers:/app/papers:ro \
  -v $(pwd)/data/papers:/app/generated \
  -v $(pwd)/output/ratsinfosystem:/app/oparl:ro \
  srw-generate-paper-assets
```


### Generate OParl assets

This tool derives the council-scoped OParl slice that the Astro build reads. It
filters meetings, agenda items and consultations to the city council
organization and writes a lightweight index of main papers, so the web build no
longer parses the full ~123 MB raw OParl snapshot. The output goes to
`data/oparl-council/` (`meetings.json`, `agenda-items.json`,
`consultations.json`, `papers-index.json`) and is committed to the repository.

Prerequisite: a current raw OParl snapshot in `data/oparl-magdeburg/`, fetched
with `fetch-oparl` (from the `astro/` directory: `npm run fetch-oparl`).

#### Using the deno script
```bash
deno run \
  --allow-read --allow-write \
  src/scripts/generate-oparl-assets/index.ts \
  -r data/oparl-magdeburg \
  -o data/oparl-council
```

Re-run this whenever the OParl data changes and commit the updated
`data/oparl-council/` files.


### Extract text from paper files

#### Build the tika tool docker image 
```bash
docker build -t srw-tika -f docker\tika-batch-extract.Dockerfile .
```

#### Run the docker container
When running the container, the input and output folders have to be provided as volume mounts. The input folder should contain the pdf files to be processed. The output folder will contain the extracted text files.
```shell 
docker run \
  --rm \
  -v $(pwd)/output/papers/2025:/input \
  -v $(pwd)/output/papers/2025-extracted:/output \
  srw-tika
```


### Index Typesense search data

#### Build the docker image
```bash
docker build -t srw-index-search -f docker/index-search.Dockerfile .
```

#### Run the docker container

Typesense connection information have to be provided by setting the following environment variables:
- `TYPESENSE_SERVER_URL`
- `TYPESENSE_API_KEY`
- `TYPESENSE_COLLECTION_NAME`

```shell
docker run \
	--rm \
	-e TYPESENSE_SERVER_URL=http://host.docker.internal:8108 \
	-e TYPESENSE_COLLECTION_NAME=papers-and-speeches-0001 \
	-e TYPESENSE_API_KEY=abc123 \
  -e OPARL_COUNCIL_ORGANIZATION_ID=https://ratsinfo.magdeburg.de/oparl/bodies/0001/organizations/gr/1 \
	-v $(pwd)/output/papers/all-extracted:/app/papers-content:ro \
	-v $(pwd)/data:/app/parliament-periods:ro \
	-v $(pwd)/output/ratsinfosystem:/app/oparl:ro \
	srw-index-search
```


### Web App

#### Build the docker image
```bash
docker build -t srw-stadtratwatch-web -f docker/stadtrat-watch-web.Dockerfile .
```

#### Run the docker container
```bash
docker run --rm -p 8080:80 srw-stadtratwatch-web
```


### Scrape OParl data

Running the OParl scraper requires to set the following environment variables:
- `SCRAPE_OPARL_FETCH_DELAY_MS` - Delay between requests to the OParl API in milliseconds (e.g. `2000`)
- `SCRAPE_OPARL_BODY_URL` - URL of the OParl body endpoint (e.g. `https://ratsinfo.magdeburg.de/oparl/bodies/0001`)


#### Scrape all data (full)
This command scrapes all data from the OParl API and stores it in the `data/oparl-magdeburg` folder. It may take several hours to complete.
A date has to be specified (format: YYYY-MM-DD) to limit the amount of data to be scraped. Only objects that where created or modified since that date will be fetched.

```bash
deno run \
  --allow-net \
  --allow-read \
  --allow-write \
  src/scripts/scrape-oparl/index.ts \
  -m full \
  -d 2019-01-01 \
  -r data/oparl-magdeburg
```

#### Scrape only new and updated data (incremental)
This command scrapes only new and updated data from the OParl API and stores it in the `data/oparl-magdeburg` folder. It may take several minutes to complete.

Provide an optional `-d` parameter to limit the amount of data to be scraped. Only objects that where created or modified since that date will be fetched. If no date is provided, the tool will try to read the last modified date from a file named `scraper-metadata.txt` in the output folder. If the file does not exist, it will stop with an error message.

```bash
deno run \
  --allow-net \
  --allow-read \
  --allow-write \
  src/scripts/scrape-oparl/index.ts \
  -m incremental \
  -r data/oparl-magdeburg
```

#### Publish the snapshot to S3/CloudFront (`--push`)

Pass `-p` / `--push` to upload the scraped snapshot to S3 after writing it locally. This is the
**only authenticated** OParl step and is meant for the maintainer; without the flag `scrape-oparl`
just writes local files (the default). When pushing, each of the snapshot files is gzipped and
uploaded as a content-hashed, immutable blob (`oparl/<file>.<sha>.json.gz`), followed by a short-TTL
`oparl/manifest.json`. Because blob names are content-addressed, no CloudFront invalidation is ever
needed. The manifest also carries a `lastSync` timestamp (read from the local `scraper-metadata.txt`)
so other machines can resume incremental scrapes via `fetch-oparl`.

The push reads these additional environment variables, validated **only when `--push` is set**:
- `OPARL_S3_BUCKET` - target S3 bucket (the existing bucket behind CloudFront).
- `OPARL_S3_PREFIX` - key prefix (default `oparl`).
- `AWS_REGION` - bucket region.
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - credentials with write access to the bucket.
  **Never commit credentials**; provide them via the environment at runtime.

```bash
deno run \
  --allow-net \
  --allow-read \
  --allow-write \
  --allow-env \
  src/scripts/scrape-oparl/index.ts \
  -m incremental \
  -r data/oparl-magdeburg \
  --push
```


### Fetch OParl snapshot

The processing scripts and the web build do not scrape OParl themselves — they read the local
`data/oparl-magdeburg/` directory, which is populated by `fetch-oparl`. This step runs
automatically before the web build and dev server (the `prebuild` / `predev` hooks in
`astro/package.json` call `npm run fetch-oparl`), so CI, Netlify and local dev all obtain the data
without extra steps. You can also run it on its own:

```bash
cd astro
npm run fetch-oparl
```

`fetch-oparl` reads `oparl/manifest.json` from CloudFront, compares each file's content hash against
the local copy and downloads only the blobs that changed or are missing (it is idempotent — if
everything matches it does nothing). It needs only the public base URL; no AWS credentials are
involved:
- `AWS_CLOUDFRONT_BASE_URL` - base URL of the public CloudFront distribution (already required by
  the Astro build; see `astro/astro.config.mjs`).

Resilience: missing local files are a hard requirement, so the run fails if a needed file is absent
and the manifest cannot be fetched. If the manifest is unreachable but every file already exists
locally, it warns and keeps the local copy, so offline dev and builds keep working after the first
fetch. The manifest's `lastSync` timestamp is written back to `data/oparl-magdeburg/scraper-metadata.txt`,
so an incremental `scrape-oparl` on a fresh clone resumes from the last published snapshot.
