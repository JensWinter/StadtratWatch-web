FROM denoland/deno:2.3.3

WORKDIR /app

COPY deno.json /app
COPY deno.lock /app
COPY src /app/src
COPY astro/src/models /app/astro/src/models

RUN deno install --entrypoint src/scripts/index-search/index.ts

RUN deno cache src/scripts/index-search/index.ts

CMD ["run", \
        "-R=/app/oparl,/app/papers-content", \
        "-E=TYPESENSE_SERVER_URL,TYPESENSE_COLLECTION_NAME,TYPESENSE_API_KEY,OPARL_COUNCIL_ORGANIZATION_ID", \
        "--allow-net", \
        "src/scripts/index-search/index.ts", \
        "-r=./oparl", \
        "-c=./papers-content", \
        "-p=./parliament-periods"]
