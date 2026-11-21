## General Preparation

### Add session to Registry

For each session add a JSON object to the sessions array in the registry.json file. The date should be in the format YYYY-MM-DD. Example:
```json
{
  "id": "2025-12-04",
  "date": "2025-12-04",
  "title": "Stadtratssitzung",
  "youtubeUrl": "https://www.youtube.com/live/5ioYYuubryA",
  "meetingMinutesUrl": null,
  "approved": false
}
```

Add meeting minutes url if available.

### Add session config file

Create a session subfolder inside electoral period directory (e.g. `data/magdeburg/2025-12-04`).
Inside the subfolder create a file named `config-YYYY-MM-DD.json` with the following content:
```json
{
  "youtubeUrl": "https://...",
  "layout": {
    "namesRowHeight": 41,
    "namesColumns": [
      {
        "left": 125,
        "top": 373,
        "width": 466,
        "testPixelXOffset": 415,
        "testPixelYOffset": 21
      },
      {
        "left": 714,
        "top": 373,
        "width": 466,
        "testPixelXOffset": 415,
        "testPixelYOffset": 21
      },
      {
        "left": 1303,
        "top": 373,
        "width": 466,
        "testPixelXOffset": 415,
        "testPixelYOffset": 21
      },
      {
        "left": 1920,
        "top": 373,
        "width": 343,
        "testPixelXOffset": 330,
        "testPixelYOffset": 21
      }
    ],
    "videoTimestampRectangle": {
      "left": 50,
      "top": 1450,
      "width": 400,
      "height": 48
    },
    "votingSubjectIdRectangle": {
      "left": 0,
      "top": 165,
      "width": 400,
      "height": 60
    },
    "votingSubjectTitleRectangle": {
      "left": 350,
      "top": 186,
      "width": 1803,
      "height": 168
    }
    
  },
  "names": [] // Add names configuration
}
```

### Store config file in S3 bucket

Store the config file in folder of `sessions-configs` inside the `stadtrat-watch` bucket.

## Download Session Video

Download the session recording from Youtube using [yt-dlp](https://github.com/yt-dlp/yt-dlp).
Store the video file in the sessions-media-files sub-directory named after the session date.

```bash
DATE=2025-11-06
yt-dlp -f "18" -o "${DATE}-video.%(ext)s" "https://www.youtube.com/live/652iF34xYU8"
```

## Generate audio file from video file

This is a preparation step to generate the audio file from the video file. The audio file is used as input for the speaker diarization process.

### Generate wav file

```bash
DATE=2025-11-06
docker run \
  --rm \
  -v $(pwd)/sessions-media-files/$DATE:/session \
  -w /session jrottenberg/ffmpeg:4.4-scratch \
  -stats \
  -i ${DATE}-video.mp4 \
  -ac 1 -ar 16000 -y \
  ${DATE}-audio.wav
```

### Generate mp3 file

```bash
DATE=2025-11-06
docker run \
  --rm \
  -v $(pwd)/sessions-media-files/$DATE:/session \
  -w /session \
  jrottenberg/ffmpeg:4.4-scratch \
  -stats \
  -i $DATE-video.mp4 \
  -ac 1 -ar 16000 -b:a 256k -y \
  $DATE-audio.mp3
```

## Split audio file into smaller segments

In case the audio file is too large (>5 hrs), it is recommended to split the audio file into smaller segments.

### Splitting wav file

```bash
DATE=2025-11-06
docker run \
  --rm \
  -v $(pwd)/sessions-media-files/$DATE:/session \
  -w /session \
  jrottenberg/ffmpeg:4.4-scratch \
  -stats \
  -i $DATE-audio.wav \
  -f segment -segment_time 14400 -c copy \
  $DATE-audio-%02d.wav
```

### Splitting mp3 file

```bash
DATE=2025-11-06
docker run \
  --rm \
  -v $(pwd)/sessions-media-files/$DATE:/session \
  -w /session \
  jrottenberg/ffmpeg:4.4-scratch \
  -stats \
  -i $DATE-audio.mp3 \
  -f segment -segment_time 14400 -c copy -ac 1 -ar 16000 -b:a 256k \
  $DATE-audio-%02d.mp3
```

## Generate RTTM file

The following command generates the RTTM file from the audio file. The RTTM file contains the speaker diarization information.
Depending on the size (length) of the audio file, the process can take several hours.

```bash
DATE=2025-11-06
INDEX=00
HUGGING_FACE_API_TOKEN=<HuggingFace API token>
docker run \
  --rm \
  -v $(pwd)/sessions-media-files/$DATE:/session \
  -w /session \
  srw-speaker-diarization $DATE-audio-$INDEX.wav $DATE-speakers-$INDEX.rttm \
  $HUGGING_FACE_API_TOKEN
```

On a Mac, running it natively without Docker uses the GPU; see [speaker-diarization](../../src/scripts/speaker-diarization/README.md#run-locally-without-docker-macos).

## Parse Speakers

This tool parses multiple rttm files (from one session) and generates a single json file containing all speakers data.
See [parse-speakers](../../src/scripts/parse-speakers/README.md) for usage.

## Store speaker files in S3 bucket

Store the RTTM files and the parsed speaker files in folder `sessions-speakers` inside the `stadtrat-watch` bucket.

Also store the parsed speaker files in folder `sessions-speakers-redacted` inside the `stadtrat-watch` bucket.

## Identify speaker names

Identify the speaker names using the parsed speaker files and the session video. This is a manual process that requires watching the video and listening to the audio.

Store the identified speaker names in the S3 bucket in the folder `sessions-speakers-redacted`. Overwrite the existing file.

## Create speeches

Create speeches using the speaker files.

Store the speeches in the S3 bucket in the folder `sessions-speeches`.

## Review speeches

The extracted speeches have to be reviewed manually:

- Mark speeches of chairmans
- Mark speeches of "Ortsbürgermeister"
- Mark speeches on behalf of commissions
- Remove "white noise" speeches

Store the reviewed speeches in the S3 bucket in the folder `sessions-speeches-redacted`.

## Extract Speeches as Audio Files

Extract the speeches as separate audio files using the speeches data file.

```bash
SESSION=2025-12-04
docker run \
    --rm \
    -v $(pwd)/output/sessions-scan-results/$SESSION/session-speeches-$SESSION.json:/session-speeches.json:ro \
    -v $(pwd)/sessions-media-files/$SESSION/$SESSION-audio.mp3:/session-audio.mp3:ro \
    -v $(pwd)/output/speeches/$SESSION:/output \
    srw-extract-speeches
```

## Transcribe Speeches

This tool transcribes the speeches of one session with OpenAI.
See [speech-to-text](../../src/scripts/speech-to-text/README.md) for usage.

## Review Transcriptions

Review the transcriptions and correct mistakes. Save the corrected transcriptions in the S3 bucket in the folder `sessions-speeches-with-transcriptions`.

## Detect AI Text

Optional, editorial step: run selected speeches through Pangram to check whether their corrected transcripts may be
AI-generated or AI-assisted.
See [detect-ai-text](../../src/scripts/detect-ai-text/README.md) for usage.

## Collect and Process Votings

### Screenshot Voting Images

Manually take screenshots of the video and save them in a subfolder inside `sessions-media-files`. Name the files using this format: `YYYY-MM-DD-XXX.png`. Where `XXX` is the screenshot number. Numbering has to be ordered chronologically.

The screenshot images have to contain the voting results. The images have to be taken full screen. They all have to be sized identically.

### Store voting images in S3 bucket

Store the images in a subfolder of `sessions-raw` folder inside the `stadtrat-watch` bucket. Name the folder using this format: `YYYY-MM-DD`. Where `YYYY-MM-DD` is the date of the session.

### Scan voting images

Process the voting images using the `scan-voting-images` script.
See [scan-voting-images](../../src/scripts/scan-voting-images/README.md) for usage.

### Store scan results in S3 bucket

Store the scan results in a subfolder of `sessions-scan-results` AND `sessions-scan-results-redacted` folder inside the `stadtrat-watch` bucket.

### Review scan results

Review the scanned votings and correct any mistakes. Save the corrected votings in the S3 bucket in the folder `sessions-scan-results-redacted`.

Also save the corrected scanned votings file in `data/$PARLIAMENT_PERIOD/$DATE/session-scan-YYYY-MM-DD.json`.

## Generate Image Assets

### Generate Voting Images

Create the voting images using the `generate-image-assets` script.
See [generate-image-assets](../../src/scripts/generate-image-assets/README.md) for usage.

### Store image assets in S3 bucket

