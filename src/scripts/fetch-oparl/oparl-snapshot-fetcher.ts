import { ensureDir } from '@std/fs';
import * as path from '@std/path';
import { OPARL_FILENAMES } from '../scrape-oparl/oparl-filenames.ts';
import type { OparlManifest } from '../scrape-oparl/oparl-s3-publisher.ts';

/** Local file the scraper reads to resume an incremental run; restored from `manifest.lastSync`. */
const METADATA_FILENAME = 'scraper-metadata.txt';
const MANIFEST_FILENAME = 'manifest.json';

/** Length of the short SHA recorded in the manifest. Must match the scrape-oparl publisher. */
const SHA_LENGTH = 12;

export type Logger = { log: (msg: string) => void; warn: (msg: string) => void };

export type SyncResult = { downloaded: string[]; upToDate: string[] };

/** Reads a local snapshot file's short SHA, or null when the file is missing. Injectable for tests. */
export type ShaReader = (filename: string) => Promise<string | null>;

/** Writes a downloaded blob's decoded body under its snapshot filename. Injectable for tests. */
export type BlobWriter = (filename: string, body: ReadableStream<Uint8Array>) => Promise<void>;

/** Persists the last-sync timestamp locally. Injectable for tests. */
export type MetadataWriter = (text: string) => Promise<void>;

export type SyncOparlSnapshotOptions = {
  baseUrl: string;
  prefix?: string;
  fetchFn?: typeof fetch;
  log?: Logger;
  readSha: ShaReader;
  writeBlob: BlobWriter;
  writeMetadata: MetadataWriter;
};

/**
 * First 12 hex chars of the SHA-256 of the given bytes. Matches `shortSha` in
 * `scrape-oparl/oparl-s3-publisher.ts` (hash of the uncompressed JSON), so a local file that came
 * from a given blob produces the manifest's recorded sha.
 */
export async function shortSha(data: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, SHA_LENGTH);
}

/**
 * Mirrors the remote OParl snapshot, downloading only the files whose local hash differs from the
 * manifest (or that are missing). Idempotent: if everything matches it does nothing. All filesystem
 * access is injected (`readSha`/`writeBlob`/`writeMetadata`) so this stays pure and testable; the
 * Deno-backed wrapper `fetchOparlSnapshot` supplies the real implementations.
 *
 * Resilience: missing local files are a hard requirement, so a failed manifest fetch throws when any
 * needed file is absent. If the manifest is unreachable but every file already exists locally, it
 * warns and keeps the local copy so offline dev/builds keep working.
 */
export async function syncOparlSnapshot(
  { baseUrl, prefix = 'oparl', fetchFn = fetch, log = console, readSha, writeBlob, writeMetadata }:
    SyncOparlSnapshotOptions,
): Promise<SyncResult> {
  const base = baseUrl.replace(/\/+$/, '');

  const localShas: Record<string, string | null> = {};
  for (const filename of OPARL_FILENAMES) {
    localShas[filename] = await readSha(filename);
  }

  let manifest: OparlManifest;
  try {
    manifest = await fetchManifest(base, prefix, fetchFn);
  } catch (error) {
    const missing = OPARL_FILENAMES.filter((filename) => localShas[filename] === null);
    if (missing.length > 0) {
      throw new Error(
        `Cannot fetch the OParl manifest and these required files are missing locally: ${missing.join(', ')}. ` +
          `Original error: ${errorMessage(error)}`,
      );
    }
    log.warn(`OParl manifest unavailable (${errorMessage(error)}); using the existing local snapshot.`);
    return { downloaded: [], upToDate: [...OPARL_FILENAMES] };
  }

  const files = manifest.files;
  const downloaded: string[] = [];
  const upToDate: string[] = [];
  for (const filename of OPARL_FILENAMES) {
    const entry = files[filename];
    const localSha = localShas[filename];

    if (!entry) {
      if (localSha === null) {
        throw new Error(`Required file ${filename} is absent from the manifest and missing locally.`);
      }
      log.warn(`File ${filename} is absent from the manifest; keeping the local copy.`);
      upToDate.push(filename);
      continue;
    }

    if (localSha === entry.sha) {
      upToDate.push(filename);
      continue;
    }

    log.log(`Fetching ${filename} (${entry.blob})...`);
    await writeBlob(filename, await fetchBlobBody(base, prefix, entry.blob, fetchFn));
    downloaded.push(filename);
  }

  // Restore the last-sync timestamp locally so an incremental scrape on this machine resumes from
  // the last published snapshot. The scraper reads it via ScraperMetadataFileStore (unchanged).
  if (typeof manifest.lastSync === 'string' && manifest.lastSync.length > 0) {
    await writeMetadata(manifest.lastSync);
  }

  if (downloaded.length === 0) {
    log.log(`OParl snapshot up to date (${upToDate.length} files).`);
  } else {
    log.log(`OParl snapshot updated: downloaded ${downloaded.length}, unchanged ${upToDate.length}.`);
  }
  return { downloaded, upToDate };
}

/**
 * Deno-backed entry: ensures the target directory exists, then syncs it using real filesystem I/O.
 * This is the only part that touches disk, mirroring how `publishOparlSnapshot` wraps the pure
 * `uploadOparlSnapshot` in the scrape-oparl publisher.
 */
export function fetchOparlSnapshot(
  { baseUrl, dir, prefix, log }: { baseUrl: string; dir: string; prefix?: string; log?: Logger },
): Promise<SyncResult> {
  return ensureDir(dir).then(() =>
    syncOparlSnapshot({
      baseUrl,
      prefix,
      log,
      readSha: (filename) => shaOfLocalFile(path.join(dir, filename)),
      writeBlob: (filename, body) => writeBlobToDisk(path.join(dir, filename), body),
      writeMetadata: (text) => Deno.writeTextFile(path.join(dir, METADATA_FILENAME), text),
    })
  );
}

/** Short SHA of a local file's bytes, or null if it is missing. */
async function shaOfLocalFile(filePath: string): Promise<string | null> {
  try {
    return await shortSha(await Deno.readFile(filePath));
  } catch {
    return null;
  }
}

/**
 * Streams a blob body to disk, then atomically renames it into place so an interrupted download
 * never leaves a corrupt file that a later run would treat as valid.
 *
 * The blobs are stored with `Content-Encoding: gzip` (set by the scrape-oparl publisher), so the
 * HTTP client decompresses the body transparently — we write the plain JSON it yields and must not
 * gunzip again.
 */
async function writeBlobToDisk(destPath: string, body: ReadableStream<Uint8Array>): Promise<void> {
  const tmpPath = `${destPath}.tmp`;
  const file = await Deno.open(tmpPath, { write: true, create: true, truncate: true });
  await body.pipeTo(file.writable);
  await Deno.rename(tmpPath, destPath);
}

async function fetchManifest(base: string, prefix: string, fetchFn: typeof fetch): Promise<OparlManifest> {
  const url = `${base}/${prefix}/${MANIFEST_FILENAME}`;
  const res = await fetchFn(url);
  if (!res.ok) {
    throw new Error(`manifest request returned ${res.status} ${res.statusText} (${url})`);
  }
  return await res.json() as OparlManifest;
}

async function fetchBlobBody(
  base: string,
  prefix: string,
  blob: string,
  fetchFn: typeof fetch,
): Promise<ReadableStream<Uint8Array>> {
  const url = `${base}/${prefix}/${blob}`;
  const res = await fetchFn(url);
  if (!res.ok || !res.body) {
    throw new Error(`blob request returned ${res.status} ${res.statusText} (${url})`);
  }
  return res.body;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
