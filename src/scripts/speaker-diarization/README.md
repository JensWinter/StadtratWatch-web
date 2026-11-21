# Speaker diarization

## Generate audio file from video file

This is a preparation step to generate the audio file from the video file. The audio file is used as input for the speaker diarization process.

```bash
DATE=2025-09-29
docker run \
  --rm \
  -v $(pwd)/sessions-media-files/$DATE:/session \
  -w /session jrottenberg/ffmpeg:4.4-scratch \
  -stats \
  -i ${DATE}-video.mp4 \
  -ac 1 -ar 16000 -y \
  ${DATE}-audio.wav
```

Alternative: Generate an mp3 file:

```bash
DATE=2025-09-25
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

## Split wav file into smaller segments

In case the audio file is too large (>5 hrs), it is recommended to split the audio file into smaller segments.

```bash
DATE=2025-09-25
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

## Alternative: Combine both steps

The following command combines the two steps into one command. The audio file is generated from the video file and split into smaller segments.

```bash
DATE=2025-09-25
docker run \
  --rm \
  -v $(pwd)/sessions-media-files/$DATE:/session \
  -w /session \
  jrottenberg/ffmpeg:4.4-scratch \
  -stats \
  -i $DATE-video.mp4 \
  -ac 1 -ar 16000 -f segment -segment_time 14400 \
  $DATE-audio-%02d.wav
```

or as mp3 file

```bash
DATE=2025-09-25
docker run \
  --rm \
  -v $(pwd)/sessions-media-files/$DATE:/session \
  -w /session \
  jrottenberg/ffmpeg:4.4-scratch \
  -stats \
  -i $DATE-video.mp4 \
  -ac 1 -ar 16000 -b:a 256k -f segment -segment_time 14400 \
  $DATE-audio-%02d.mp3
```

## Build docker image for speaker diarization

Run the following command inside the speaker-diarization directory to build the docker image.

```
docker build -t srw-speaker-diarization .
```

## Generate RTTM file

The following command generates the RTTM file from the audio file. The RTTM file contains the speaker diarization information.
Depending on the size (length) of the audio file, the process can take several hours.

```bash
DATE=2025-09-25
INDEX=00
HUGGING_FACE_API_TOKEN=<HuggingFace API token>
docker run \
  --rm \
  -v $(pwd)/sessions-media-files/$DATE:/session \
  -w /session \
  srw-speaker-diarization $DATE-audio-$INDEX.wav $DATE-speakers-$INDEX.rttm \
  $HUGGING_FACE_API_TOKEN
```

The log shows the device in use (`Device: cpu` in Docker) and how long the diarization itself took.

## Run locally without Docker (macOS)

Docker on macOS cannot use the Apple GPU. Run natively, the script picks the fastest device by itself (MPS, else CUDA,
else CPU).

Set up the Python environment once (Python 3.12), inside the speaker-diarization directory:

```bash
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

The HuggingFace token needs access to the gated models
[pyannote/speaker-diarization-3.1](https://huggingface.co/pyannote/speaker-diarization-3.1) and
[pyannote/segmentation-3.0](https://huggingface.co/pyannote/segmentation-3.0) (accept their terms on HuggingFace once).

Run it from the repository root:

```bash
DATE=2025-09-25
INDEX=00
HUGGING_FACE_API_TOKEN=<HuggingFace API token>
src/scripts/speaker-diarization/.venv/bin/python src/scripts/speaker-diarization/speaker_diarization.py \
  sessions-media-files/$DATE/$DATE-audio-$INDEX.wav \
  sessions-media-files/$DATE/$DATE-speakers-$INDEX.rttm \
  $HUGGING_FACE_API_TOKEN
```

## Compare CPU and MPS

Cut a 10-minute excerpt of a session, diarize it once in Docker (CPU) and once natively (MPS), then compare both RTTM
files. Note the `Diarization took` lines of both runs.

```bash
DATE=2025-09-25
HUGGING_FACE_API_TOKEN=<HuggingFace API token>
docker run \
  --rm \
  -v $(pwd)/sessions-media-files/$DATE:/session \
  -w /session \
  jrottenberg/ffmpeg:4.4-scratch \
  -ss 01:00:00 -t 600 -i $DATE-audio-00.wav -c copy -y \
  $DATE-excerpt.wav
docker run \
  --rm \
  -v $(pwd)/sessions-media-files/$DATE:/session \
  -w /session \
  srw-speaker-diarization $DATE-excerpt.wav $DATE-excerpt-cpu.rttm \
  $HUGGING_FACE_API_TOKEN
src/scripts/speaker-diarization/.venv/bin/python src/scripts/speaker-diarization/speaker_diarization.py \
  sessions-media-files/$DATE/$DATE-excerpt.wav \
  sessions-media-files/$DATE/$DATE-excerpt-mps.rttm \
  $HUGGING_FACE_API_TOKEN
src/scripts/speaker-diarization/.venv/bin/python src/scripts/speaker-diarization/compare_rttm.py \
  sessions-media-files/$DATE/$DATE-excerpt-cpu.rttm \
  sessions-media-files/$DATE/$DATE-excerpt-mps.rttm
```

`compare_rttm.py` reports the diarization error rate of the MPS run against the CPU run, ignoring boundary shifts of up
to 0.25 s and differently numbered speakers. Both runs count as matching at a DER below 1 %.

| Device       | Diarization of 10 minutes |
| ------------ | ------------------------- |
| CPU (Docker) | _not measured yet_        |
| MPS (native) | _not measured yet_        |

## Update dependencies

`requirements.txt` pins every dependency to an exact version. Change the direct dependencies in `requirements.in`, then
regenerate the lock file with [uv](https://docs.astral.sh/uv/):

```bash
uv pip compile requirements.in --universal --python-version 3.12 -o requirements.txt
```

`pyannote.audio` stays on 3.x, `torchaudio` on 2.8 and `huggingface_hub` on 0.x: pyannote 4 renames `use_auth_token` to
`token`, torchaudio 2.9 removes `torchaudio.info` and huggingface_hub 1.0 drops `use_auth_token`, all of which pyannote 3
relies on.
