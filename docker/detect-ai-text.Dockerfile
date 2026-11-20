FROM oven/bun:1.4.5-debian

WORKDIR /app

COPY package.json bun.lock bunfig.toml /app/
COPY src/deps/astro/package.json /app/src/deps/astro/package.json

RUN bun install --frozen-lockfile --production

COPY src /app/src
COPY astro/src/models /app/astro/src/models

USER bun

ENTRYPOINT ["bun", "src/scripts/detect-ai-text/index.ts", "-f", "/app/session-speeches.json", "-t"]
