FROM denoland/deno:2.3.3

WORKDIR /app

COPY deno.json /app
COPY deno.lock /app
COPY src /app/src
COPY astro/src/models /app/astro/src/models

RUN deno install --entrypoint src/scripts/generate-oparl-derivatives/index.ts --unstable-sloppy-imports

RUN deno cache src/scripts/generate-oparl-derivatives/index.ts --unstable-sloppy-imports

USER deno

CMD ["run", \
        "-R=/app/oparl,/app/data", \
        "-W=/app/data", \
        "-E=OPARL_COUNCIL_ORGANIZATION_ID", \
        "src/scripts/generate-oparl-derivatives/index.ts", \
        "-o=./oparl", \
        "-d=./data"]
