FROM denoland/deno:2.3.3

WORKDIR /app

COPY deno.json /app
COPY deno.lock /app
COPY src /app/src
COPY astro/src/models /app/astro/src/models

RUN deno install --entrypoint src/scripts/generate-paper-votings/index.ts --unstable-sloppy-imports


USER deno

CMD ["run", \
        "-R=/app/data", \
        "-W=/app/generated", \
        "src/scripts/generate-paper-votings/index.ts", \
        "-d=./data", \
        "-o=./generated"]
