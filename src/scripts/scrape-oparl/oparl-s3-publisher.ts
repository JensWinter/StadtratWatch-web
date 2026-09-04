import { type PutObjectCommandInput } from '@aws-sdk/client-s3';
import * as path from '@std/path';
import { type ScrapeOparlPushEnv } from './env.ts';
import {
  MANIFEST_FILENAME,
  OPARL_SNAPSHOT_FILENAMES,
  type OparlManifest,
  type OparlManifestEntry,
  SCRAPER_METADATA_FILENAME,
  shortSnapshotSha,
} from '../shared/oparl/oparl-snapshot.ts';

const BLOB_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const MANIFEST_CACHE_CONTROL = 'public, max-age=60';

/**
 * Sends a single S3 put given its input. Abstracted so tests can inject a fake, and so the (heavy)
 * AWS SDK is only loaded by the real implementation — importing this module stays side-effect free.
 */
export type S3Send = (input: PutObjectCommandInput) => Promise<unknown>;

/** Reads a snapshot file's raw bytes by filename. Injectable so tests need no filesystem access. */
export type FileReader = (filename: string) => Promise<Uint8Array<ArrayBuffer>>;

/** Reads the last-sync timestamp, or null if none exists. Injectable for tests. */
export type MetadataReader = () => Promise<string | null>;

/**
 * Uploads the local OParl snapshot to S3: one gzipped, content-hashed blob per file plus a small
 * `manifest.json` that also carries the last-sync timestamp. All files are read, hashed and gzipped
 * up front, so a missing file fails before any object is uploaded (no partial snapshot). Returns the
 * manifest that was written.
 */
export async function uploadOparlSnapshot(
  directory: string,
  bucket: string,
  prefix: string,
  send: S3Send,
  readFile: FileReader = (filename) => Deno.readFile(path.join(directory, filename)),
  readMetadata: MetadataReader = () => readLastSync(directory),
): Promise<OparlManifest> {
  const blobs = await prepareBlobs(prefix, readFile);
  const lastSync = await readMetadata();

  for (const blob of blobs) {
    await send({
      Bucket: bucket,
      Key: blob.key,
      Body: blob.body,
      ContentType: 'application/json',
      ContentEncoding: 'gzip',
      CacheControl: BLOB_CACHE_CONTROL,
    });
    console.log(`Uploaded ${blob.key} (${blob.bytes} bytes uncompressed, ${blob.body.length} gzipped).`);
  }

  const manifest = buildManifest(blobs, lastSync);
  const manifestKey = `${prefix}/${MANIFEST_FILENAME}`;
  await send({
    Bucket: bucket,
    Key: manifestKey,
    Body: new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
    ContentType: 'application/json',
    CacheControl: MANIFEST_CACHE_CONTROL,
  });
  console.log(
    `Uploaded ${manifestKey} (${OPARL_SNAPSHOT_FILENAMES.length} entries, lastSync ${lastSync ?? 'none'}).`,
  );

  return manifest;
}

/** Reads `<directory>/scraper-metadata.txt`, trimmed; null if absent, empty or unreadable. */
async function readLastSync(directory: string): Promise<string | null> {
  try {
    const text = (await Deno.readTextFile(path.join(directory, SCRAPER_METADATA_FILENAME))).trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

/** Builds an S3 client from env and uploads the snapshot. */
export async function publishOparlSnapshot(directory: string, env: ScrapeOparlPushEnv): Promise<void> {
  const { PutObjectCommand, S3Client } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region: env.region,
    credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey },
  });
  await uploadOparlSnapshot(directory, env.bucket, env.prefix, (input) => client.send(new PutObjectCommand(input)));
}

type PreparedBlob = {
  filename: string;
  blob: string;
  key: string;
  sha: string;
  bytes: number;
  body: Uint8Array;
};

async function prepareBlobs(prefix: string, readFile: FileReader): Promise<PreparedBlob[]> {
  const blobs: PreparedBlob[] = [];

  for (const filename of OPARL_SNAPSHOT_FILENAMES) {
    const data = await readFile(filename);
    const sha = await shortSnapshotSha(data);
    const body = await gzip(data);
    const base = filename.replace(/\.json$/, '');
    const blob = `${base}.${sha}.json.gz`;

    blobs.push({
      filename,
      blob,
      key: `${prefix}/${blob}`,
      sha,
      bytes: data.length,
      body,
    });
  }

  return blobs;
}

function buildManifest(blobs: PreparedBlob[], lastSync: string | null): OparlManifest {
  const files: Record<string, OparlManifestEntry> = {};
  for (const blob of blobs) {
    files[blob.filename] = { blob: blob.blob, sha: blob.sha, bytes: blob.bytes };
  }
  return lastSync ? { lastSync, files } : { files };
}

async function gzip(data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const compressed = new Response(data).body!.pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(compressed).arrayBuffer());
}
