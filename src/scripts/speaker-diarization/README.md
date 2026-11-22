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

The script uses the fastest available device (MPS, else CUDA, else CPU) and logs it as `Device:`. In Docker this is always the CPU.

## Run locally without Docker (macOS, GPU)

On a Mac with Apple Silicon, the script runs natively and uses the GPU via PyTorch MPS. This needs Python 3.12 and FFmpeg (`brew install ffmpeg`).

Set up the Python environment once, inside the speaker-diarization directory:

```bash
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

The HuggingFace token needs read access, and its account must have accepted the conditions of [pyannote/speaker-diarization-community-1](https://huggingface.co/pyannote/speaker-diarization-community-1). Run from the repository root:

```bash
DATE=2025-09-25
INDEX=00
HUGGING_FACE_API_TOKEN=<HuggingFace API token>
src/scripts/speaker-diarization/.venv/bin/python src/scripts/speaker-diarization/speaker_diarization.py \
  sessions-media-files/$DATE/$DATE-audio-$INDEX.wav \
  sessions-media-files/$DATE/$DATE-speakers-$INDEX.rttm \
  $HUGGING_FACE_API_TOKEN
```

## CPU (Docker) vs. MPS (native)

Measured on a 10-minute excerpt of a real session:

| Run          | Run time           |
| ------------ | ------------------ |
| CPU (Docker) | _not measured yet_ |
| MPS (native) | _not measured yet_ |

Diarization error rate of the MPS run against the CPU run: _not measured yet_

To repeat the measurement, cut an excerpt (minutes 10 to 20), run both and compare the RTTM files. Run the native command once beforehand, so both runs load the model from the same local cache instead of downloading it. Run from the repository root:

```bash
DATE=2025-09-25
HUGGING_FACE_API_TOKEN=<HuggingFace API token>
ffmpeg -ss 600 -t 600 -i sessions-media-files/$DATE/$DATE-audio-00.wav -c copy -y sessions-media-files/$DATE/$DATE-excerpt.wav
```

```bash
time docker run \
  --rm \
  -v $(pwd)/sessions-media-files/$DATE:/session \
  -v $HOME/.cache/huggingface:/root/.cache/huggingface \
  -w /session \
  srw-speaker-diarization $DATE-excerpt.wav $DATE-excerpt-cpu.rttm \
  $HUGGING_FACE_API_TOKEN
```

```bash
time src/scripts/speaker-diarization/.venv/bin/python src/scripts/speaker-diarization/speaker_diarization.py \
  sessions-media-files/$DATE/$DATE-excerpt.wav \
  sessions-media-files/$DATE/$DATE-excerpt-mps.rttm \
  $HUGGING_FACE_API_TOKEN
```

```bash
src/scripts/speaker-diarization/.venv/bin/python src/scripts/speaker-diarization/compare_rttm.py \
  sessions-media-files/$DATE/$DATE-excerpt-cpu.rttm \
  sessions-media-files/$DATE/$DATE-excerpt-mps.rttm
```

The diarization error rate should be close to 0 %. If it is not, MPS must not be the default device.

## Update dependencies

`requirements.txt` pins every dependency for Linux (Docker) and macOS. Change the version in `requirements.in`, then regenerate the pins with [uv](https://docs.astral.sh/uv/) inside the speaker-diarization directory:

```bash
uv pip compile --universal --python-version 3.12 requirements.in -o requirements.txt
```
