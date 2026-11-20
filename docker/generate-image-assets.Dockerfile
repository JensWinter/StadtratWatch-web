FROM oven/bun:1.4.5-debian

ARG MS_CORE_FONTS_VERSION=3.8

RUN apt update && apt upgrade -y && \
    apt install -y wget cabextract xfonts-utils fontconfig && \
    wget http://ftp.br.debian.org/debian/pool/contrib/m/msttcorefonts/ttf-mscorefonts-installer_${MS_CORE_FONTS_VERSION}_all.deb && \
    dpkg -i ttf-mscorefonts-installer_${MS_CORE_FONTS_VERSION}_all.deb && \
    rm ttf-mscorefonts-installer_${MS_CORE_FONTS_VERSION}_all.deb && \
    fc-cache -f -v

WORKDIR /app

COPY package.json bun.lock bunfig.toml /app/
COPY src/deps/astro/package.json /app/src/deps/astro/package.json

RUN bun install --frozen-lockfile --production

COPY src /app/src
COPY astro/src/models /app/astro/src/models

USER bun

ENTRYPOINT ["bun", "src/scripts/generate-image-assets/index.ts", "-i", "/app/input-dir", "-o", "/app/output-dir"]
