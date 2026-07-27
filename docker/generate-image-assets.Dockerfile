FROM denoland/deno:2.3.3

ARG MS_CORE_FONTS_VERSION=3.8
ARG SKIA_CANVAS_VERSION=0.5.8

RUN apt update && apt upgrade -y && \
    apt install -y wget cabextract xfonts-utils fontconfig && \
    wget http://ftp.br.debian.org/debian/pool/contrib/m/msttcorefonts/ttf-mscorefonts-installer_${MS_CORE_FONTS_VERSION}_all.deb && \
    dpkg -i ttf-mscorefonts-installer_${MS_CORE_FONTS_VERSION}_all.deb && \
    wget https://github.com/DjDeveloperr/skia_canvas/releases/download/${SKIA_CANVAS_VERSION}/libnative_canvas.so && \
    fc-cache -f -v

WORKDIR /app

COPY deno.json /app
COPY deno.lock /app
COPY src /app/src
COPY astro/src/models /app/astro/src/models

RUN deno install --entrypoint src/scripts/generate-image-assets/index.ts --unstable-sloppy-imports

RUN deno cache src/scripts/generate-image-assets/index.ts --unstable-sloppy-imports

ENV DENO_SKIA_PATH=/libnative_canvas.so

CMD ["run", \
      "-E=DENO_SKIA_LOCAL,DENO_SKIA_PATH,CANVAS_DISABLE_SYSTEM_FONTS", \
      "--allow-ffi", \
      "-R=/app/input-dir,/app/output-dir", \
      "-W=/app/output-dir", \
      "src/scripts/generate-image-assets/index.ts", \
      "-i=./input-dir", \
      "-o=./output-dir"]
