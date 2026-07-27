FROM denoland/deno:2.3.3

WORKDIR /app

COPY deno.json /app
COPY deno.lock /app
COPY src /app/src
COPY astro/src/models /app/astro/src/models

RUN deno install --entrypoint src/scripts/download-paper-files/index.ts

RUN deno cache src/scripts/download-paper-files/index.ts

ENTRYPOINT ["deno", "run", \
        "-R=/app/oparl,/app/papers", \
        "-W=/app/papers", \
        "-E=OPARL_COUNCIL_ORGANIZATION_ID", \
        "--allow-net", \
        "src/scripts/download-paper-files/index.ts", \
        "-r=./oparl", \
        "-p=./papers", \
        "-y"]
CMD ["2025"]
