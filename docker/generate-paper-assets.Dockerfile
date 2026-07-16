FROM denoland/deno:2.3.3

WORKDIR /app

COPY deno.json /app
COPY deno.lock /app
COPY src /app/src

RUN deno install --entrypoint src/scripts/generate-paper-assets/index.ts --unstable-sloppy-imports

RUN deno cache src/scripts/generate-paper-assets/index.ts --unstable-sloppy-imports

CMD ["run", \
        "-R=/app/oparl,/app/papers,/app/data", \
        "-W=/app/generated", \
        "-E=OPARL_COUNCIL_ORGANIZATION_ID", \
        "src/scripts/generate-paper-assets/index.ts", \
        "-r=./oparl", \
        "-p=./papers", \
        "-d=./data", \
        "-o=./generated"]
