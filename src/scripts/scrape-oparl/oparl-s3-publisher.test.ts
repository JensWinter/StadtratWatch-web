import { type FileReader, type MetadataReader, uploadOparlSnapshot } from './oparl-s3-publisher.ts';
import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { assertEquals, assertMatch, assertRejects } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { OPARL_SNAPSHOT_FILENAMES } from '../shared/oparl/oparl-snapshot.ts';

const BUCKET = 'test-bucket';
const PREFIX = 'oparl';
const DIR = '/ignored'; // unused: the reader is injected, so no filesystem is touched

/** Metadata reader yielding a fixed timestamp, so tests need no filesystem access. */
function fakeMetadata(lastSync: string | null): MetadataReader {
  return () => Promise.resolve(lastSync);
}

type PutInput = PutObjectCommandInput;

/** Records every put and returns a no-op success, so no real S3 client is touched. */
function recordingSend(calls: PutInput[]) {
  return (input: PutInput): Promise<unknown> => {
    calls.push(input);
    return Promise.resolve({});
  };
}

/** In-memory reader: content for each file is `{"name":"<file>"}`, or rejects for `missing`. */
function fakeReader(missing: Set<string> = new Set()): FileReader {
  return (filename) => {
    if (missing.has(filename)) {
      return Promise.reject(new Deno.errors.NotFound(filename));
    }
    return Promise.resolve(contentFor(filename));
  };
}

function contentFor(filename: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(JSON.stringify({ name: filename }));
}

async function shortSha(data: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 12);
}

async function gunzip(data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new Response(data).body!.pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

describe('uploadOparlSnapshot', () => {
  it('uploads one blob per file plus the manifest', async () => {
    const calls: PutInput[] = [];

    await uploadOparlSnapshot(DIR, BUCKET, PREFIX, recordingSend(calls), fakeReader(), fakeMetadata(null));

    assertEquals(calls.length, OPARL_SNAPSHOT_FILENAMES.length + 1);
    assertEquals(calls.every((input) => input.Bucket === BUCKET), true);
  });

  it('sets immutable cache headers and gzip encoding on blobs', async () => {
    const calls: PutInput[] = [];

    await uploadOparlSnapshot(DIR, BUCKET, PREFIX, recordingSend(calls), fakeReader(), fakeMetadata(null));

    const blobPuts = calls.filter((input) => input.Key !== `${PREFIX}/manifest.json`);
    assertEquals(blobPuts.length, OPARL_SNAPSHOT_FILENAMES.length);
    for (const input of blobPuts) {
      assertEquals(input.ContentEncoding, 'gzip');
      assertEquals(input.ContentType, 'application/json');
      assertEquals(input.CacheControl, 'public, max-age=31536000, immutable');
      assertMatch(input.Key!, new RegExp(`^${PREFIX}/[a-z-]+\\.[0-9a-f]{12}\\.json\\.gz$`));
    }
  });

  it('writes a short-lived manifest referencing every blob with its hash and size', async () => {
    const calls: PutInput[] = [];

    const manifest = await uploadOparlSnapshot(
      DIR,
      BUCKET,
      PREFIX,
      recordingSend(calls),
      fakeReader(),
      fakeMetadata(null),
    );

    const manifestPut = calls.find((input) => input.Key === `${PREFIX}/manifest.json`);
    if (!manifestPut) throw new Error('manifest was not uploaded');
    assertEquals(manifestPut.CacheControl, 'public, max-age=60');
    assertEquals(manifestPut.ContentEncoding, undefined);

    const uploaded = JSON.parse(new TextDecoder().decode(manifestPut.Body as Uint8Array));
    assertEquals(uploaded, manifest);
    assertEquals(Object.keys(manifest.files).sort(), [...OPARL_SNAPSHOT_FILENAMES].sort());

    for (const filename of OPARL_SNAPSHOT_FILENAMES) {
      const entry = manifest.files[filename];
      const raw = contentFor(filename);
      assertEquals(entry.bytes, raw.length);
      assertEquals(entry.sha, await shortSha(raw));
      assertEquals(entry.blob, `${filename.replace(/\.json$/, '')}.${entry.sha}.json.gz`);
    }
  });

  it('records lastSync from the metadata reader, and omits it when none exists', async () => {
    const withTimestamp: PutInput[] = [];
    const stamp = '2026-06-28T12:34:56.000Z';
    const withManifest = await uploadOparlSnapshot(
      DIR,
      BUCKET,
      PREFIX,
      recordingSend(withTimestamp),
      fakeReader(),
      fakeMetadata(stamp),
    );
    assertEquals(withManifest.lastSync, stamp);

    const withoutTimestamp: PutInput[] = [];
    const withoutManifest = await uploadOparlSnapshot(
      DIR,
      BUCKET,
      PREFIX,
      recordingSend(withoutTimestamp),
      fakeReader(),
      fakeMetadata(null),
    );
    assertEquals('lastSync' in withoutManifest, false);
  });

  it('uploads gzipped bodies that decompress to the original file', async () => {
    const calls: PutInput[] = [];

    await uploadOparlSnapshot(DIR, BUCKET, PREFIX, recordingSend(calls), fakeReader(), fakeMetadata(null));

    const meetingsPut = calls.find((input) => input.Key?.startsWith(`${PREFIX}/meetings.`));
    if (!meetingsPut) throw new Error('meetings blob was not uploaded');

    const decompressed = new TextDecoder().decode(await gunzip(meetingsPut.Body as Uint8Array<ArrayBuffer>));
    assertEquals(decompressed, JSON.stringify({ name: 'meetings.json' }));
  });

  it('throws without uploading anything when a file is missing', async () => {
    const calls: PutInput[] = [];

    await assertRejects(() =>
      uploadOparlSnapshot(
        DIR,
        BUCKET,
        PREFIX,
        recordingSend(calls),
        fakeReader(new Set(['papers.json'])),
        fakeMetadata(null),
      )
    );

    assertEquals(calls.length, 0);
  });
});
