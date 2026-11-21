
### Start Typesense Server

By starting a docker container:

Bash:
```bash
docker run \
  --rm \
  -d \
  -p 8108:8108 \
  -v $(pwd)/data:/data \
  typesense/typesense:30.2 \
  --data-dir /data \
  --api-key <API KEY> \
  --enable-cors
```

Powershell:
```powershell
docker run `
  --rm `
  -d `
  -p 8108:8108 `
  -v ${pwd}/data:/data `
  typesense/typesense:30.2 `
  --data-dir /data `
  --api-key <API KEY> `
  --enable-cors
```

### Set up the collection

#### Purpose
The `init-schema.ps1` PowerShell script is used to initialize the schema for the collection in a Typesense server. This script sets up the necessary fields and configurations for the collection to store and index papers and speeches.

#### Usage
To run the script, you need to provide the following arguments:
1. `TypesenseServerUrl`: The URL of the Typesense server.
2. `CollectionName`: The name of the collection for storing papers content and speech transcriptions.
3. `ApiKey`: The API key for authenticating with the Typesense server.

#### Example
```powershell
.\init-schema.ps1 "http://localhost:8108" "papers-and-speeches-0001" "abc123"
```

```bash
./init-schema.sh "http://localhost:8108" "papers-and-speeches-0001" "abc123"
```
This command will initialize the specified collection on the Typesense server running at `http://localhost:8108` using the provided API key.

### Rebuild the collection

The frontend searches `papers-and-speeches`, an alias pointing to the current collection. To change the schema without
search downtime, build a new collection next to the old one and switch the alias:

1. Look up the collection the alias points to: `curl "<URL>/aliases/papers-and-speeches" -H "X-TYPESENSE-API-KEY: <API KEY>"`.
   The steps below assume it is `papers-and-speeches-0001`.
   Create the new collection with the next number: `./init-schema.sh "<URL>" "papers-and-speeches-0002" "<API KEY>"`
2. Index everything into it with `index-search` (`TYPESENSE_COLLECTION_NAME=papers-and-speeches-0002`, see
   [its README](../src/scripts/index-search/README.md)).
3. Point the alias to it:
   ```bash
   curl -X PUT "<URL>/aliases/papers-and-speeches" \
     -H "X-TYPESENSE-API-KEY: <API KEY>" \
     -H "Content-Type: application/json" \
     -d '{"collection_name": "papers-and-speeches-0002"}'
   ```
4. Delete the old collection: `curl -X DELETE "<URL>/collections/papers-and-speeches-0001" -H "X-TYPESENSE-API-KEY: <API KEY>"`
