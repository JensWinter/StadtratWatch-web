## Mandatory processing order

Run the processing pipeline in this order. The script sections below document individual tools, but this sequence is mandatory because later steps depend on files produced by earlier steps.

1. [`scrape-oparl`](../../src/scripts/scrape-oparl/README.md) - fetch current OParl data. On a machine without a local snapshot, run
   [`fetch-oparl`](../../src/scripts/fetch-oparl/README.md) first: it mirrors the published snapshot into
   `data/oparl-magdeburg/`, so the incremental scrape resumes from it.
2. [`download-paper-files`](../../src/scripts/download-paper-files/README.md) - download the PDF documents linked to the council meetings of a year.
3. [`generate-paper-assets`](../../src/scripts/generate-paper-assets/README.md) - convert scraped OParl data into the internal paper assets. Needs the downloaded PDFs (step 2) for the file sizes.
4. [`generate-oparl-derivatives`](../../src/scripts/generate-oparl-derivatives/README.md) - precompile the committed OParl derivates (`voting-paper-map.json`, `paper-index.json`, `paper-reference-map.json`) the Astro build consumes.
5. Video processing steps:
   1. [`parse-speakers`](../../src/scripts/parse-speakers/README.md) - combine speaker diarization data for the session.
   2. [`scan-voting-images`](../../src/scripts/scan-voting-images/README.md) - extract voting results from session screenshots.
   3. [`check-paper-references`](../../src/scripts/check-paper-references/README.md) - report votings whose Drucksachennummer
      is not in OParl. Needs the OParl derivates (step 4) and the reviewed scan (step 5.2).
   4. [`speech-to-text`](../../src/scripts/speech-to-text/README.md) - generate speech transcriptions.
   5. [`detect-ai-text`](../../src/scripts/detect-ai-text/README.md) - optional, manual step: after transcripts are corrected and before committing
      session data, run a Pangram-based AI-text check on redaction-selected speeches.
6. [`generate-image-assets`](../../src/scripts/generate-image-assets/README.md) - create voting visualization image assets from processed session data.
7. [`generate-paper-votings`](../../src/scripts/generate-paper-votings/README.md) - reverse the voting-paper-map against the session scans into the per-paper voting assets. Needs both the OParl derivates (step 4) and the scanned votings (step 5.2).
8. [`index-search`](../../src/scripts/index-search/README.md) - rebuild the Typesense search index after all paper, speech, and asset data is available.

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
  -v $(pwd)/output/papers/2026:/input \
  -v $(pwd)/output/papers/2026-extracted:/output \
  srw-tika
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
