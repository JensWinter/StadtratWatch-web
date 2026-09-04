FROM denoland/deno:2.3.3

WORKDIR /app

COPY deno.json /app
COPY deno.lock /app
COPY src /app/src
COPY astro/src/models /app/astro/src/models

RUN deno install --entrypoint src/scripts/fetch-oparl/index.ts --unstable-sloppy-imports


USER deno

CMD ["run", \
        "--allow-net", \
        "-R=/app/data", \
        "-W=/app/data", \
        "-E=AWS_CLOUDFRONT_BASE_URL,OPARL_S3_PREFIX", \
        "src/scripts/fetch-oparl/index.ts", \
        "-d=./data/oparl-magdeburg"]
