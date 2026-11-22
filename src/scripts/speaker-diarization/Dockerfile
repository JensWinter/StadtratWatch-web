FROM python:3.12

# pyannote.audio decodes audio through torchcodec, which needs ffmpeg
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENTRYPOINT [ "python", "/usr/src/app/speaker_diarization.py" ]
