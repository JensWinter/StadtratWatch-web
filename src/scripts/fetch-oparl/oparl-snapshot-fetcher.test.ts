import { assertEquals, assertRejects } from '@std/assert';
import { assertSpyCalls, spy } from '@std/testing/mock';
import { describe, it } from '@std/testing/bdd';
import { OPARL_FILENAMES } from '../scrape-oparl/oparl-filenames.ts';
import {
  type BlobWriter,
  type MetadataWriter,
  type ShaReader,
  shortSha,
  syncOparlSnapshot,
} from './oparl-snapshot-fetcher.ts';

const BASE_URL = 'https://cdn.example.test';
const PREFIX = 'oparl';
const MANIFEST_FILENAME = 'manifest.json';

type Remote = { manifest: unknown; blobs: Record<string, Uint8Array<ArrayBuffer>>; shas: Record<string, string> };

/**
 * Builds an in-memory "remote": a manifest, blob bodies keyed by blob filename, and each file's sha.
 * Bodies are the plain JSON, matching what the HTTP client yields after transparently decoding
 * `Content-Encoding: gzip` (the fetch side never gunzips itself).
 */
async function makeRemote(files: Record<string, string>, { lastSync }: { lastSync?: string } = {}): Promise<Remote> {
  const fileEntries: Record<string, { blob: string; sha: string; bytes: number }> = {};
  const blobs: Record<string, Uint8Array<ArrayBuffer>> = {};
  const shas: Record<string, string> = {};
  for (const [filename, content] of Object.entries(files)) {
    const data = new TextEncoder().encode(content);
    const sha = await shortSha(data);
    const blob = `${filename.replace(/\.json$/, '')}.${sha}.json.gz`;
    fileEntries[filename] = { blob, sha, bytes: data.length };
    blobs[blob] = data;
    shas[filename] = sha;
  }
  const manifest = lastSync ? { lastSync, files: fileEntries } : { files: fileEntries };
  return { manifest, blobs, shas };
}

/** A fetch double serving the given remote; `failManifest` simulates the manifest being unreachable. */
function makeFetch(remote: Remote, { failManifest = false }: { failManifest?: boolean } = {}): typeof fetch {
  return ((input: string | URL | Request): Promise<Response> => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.endsWith(`/${MANIFEST_FILENAME}`)) {
      if (failManifest) return Promise.resolve(new Response(null, { status: 503, statusText: 'Service Unavailable' }));
      return Promise.resolve(new Response(JSON.stringify(remote.manifest)));
    }
    const blobName = url.split('/').pop()!;
    const data = remote.blobs[blobName];
    if (!data) return Promise.resolve(new Response(null, { status: 404, statusText: 'Not Found' }));
    return Promise.resolve(new Response(data));
  }) as typeof fetch;
}

/** Content for all needed files, so a full remote is easy to assemble. */
function fullContent(overrides: Record<string, string> = {}): Record<string, string> {
  const content: Record<string, string> = {};
  for (const filename of OPARL_FILENAMES) {
    content[filename] = JSON.stringify([{ file: filename }]);
  }
  return { ...content, ...overrides };
}

/**
 * In-memory snapshot store: `readSha` yields the given local shas (null = missing); `writeBlob`
 * records decoded bodies; `writeMetadata` records the last-sync timestamp. No filesystem is touched,
 * so the test needs no permissions (matching the pre-commit `deno test` run).
 */
function makeStore(localShas: Record<string, string | null>) {
  const written: Record<string, string> = {};
  let metadata: string | null = null;
  const readSha: ShaReader = (filename) => Promise.resolve(localShas[filename] ?? null);
  const writeBlob: BlobWriter = async (filename, body) => {
    written[filename] = await new Response(body).text();
  };
  const writeMetadata: MetadataWriter = (text) => {
    metadata = text;
    return Promise.resolve();
  };
  return {
    readSha,
    writeBlob,
    writeMetadata,
    written,
    get metadata() {
      return metadata;
    },
  };
}

function silentLog() {
  return { log: spy(), warn: spy() };
}

/** Local shas that all match the remote, for the "nothing to do" baseline. */
function matchingShas(remote: Remote): Record<string, string> {
  return { ...remote.shas };
}

describe('shortSha', () => {
  it('is the first 12 hex chars of the sha-256 of the bytes', async () => {
    const data = new TextEncoder().encode('[{"id":1}]');
    const digest = await crypto.subtle.digest('SHA-256', data);
    const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    assertEquals(await shortSha(data), hex.slice(0, 12));
  });
});

describe('syncOparlSnapshot', () => {
  it('downloads nothing when every local file already matches the manifest', async () => {
    const remote = await makeRemote(fullContent());
    const store = makeStore(matchingShas(remote));
    const fetchFn = spy(makeFetch(remote));

    const result = await syncOparlSnapshot({ baseUrl: BASE_URL, prefix: PREFIX, fetchFn, log: silentLog(), ...store });

    assertEquals(result.downloaded, []);
    assertEquals(result.upToDate.length, OPARL_FILENAMES.length);
    // Only the manifest is fetched; no blob requests.
    assertSpyCalls(fetchFn, 1);
  });

  it('downloads a file whose hash changed', async () => {
    const remote = await makeRemote(fullContent({ 'papers.json': JSON.stringify([{ updated: true }]) }));
    const localShas = matchingShas(remote);
    localShas['papers.json'] = 'stale00000000';
    const store = makeStore(localShas);

    const result = await syncOparlSnapshot({
      baseUrl: BASE_URL,
      prefix: PREFIX,
      fetchFn: makeFetch(remote),
      log: silentLog(),
      ...store,
    });

    assertEquals(result.downloaded, ['papers.json']);
    assertEquals(store.written['papers.json'], JSON.stringify([{ updated: true }]));
  });

  it('downloads a file that is missing locally', async () => {
    const remote = await makeRemote(fullContent());
    const localShas: Record<string, string | null> = matchingShas(remote);
    localShas['files.json'] = null;
    const store = makeStore(localShas);

    const result = await syncOparlSnapshot({
      baseUrl: BASE_URL,
      prefix: PREFIX,
      fetchFn: makeFetch(remote),
      log: silentLog(),
      ...store,
    });

    assertEquals(result.downloaded, ['files.json']);
    assertEquals(store.written['files.json'], JSON.stringify([{ file: 'files.json' }]));
  });

  it('warns and keeps local files when the manifest is unreachable but all files exist', async () => {
    const remote = await makeRemote(fullContent());
    const store = makeStore(matchingShas(remote));
    const log = silentLog();

    const result = await syncOparlSnapshot({
      baseUrl: BASE_URL,
      prefix: PREFIX,
      fetchFn: makeFetch(remote, { failManifest: true }),
      log,
      ...store,
    });

    assertEquals(result.downloaded, []);
    assertSpyCalls(log.warn, 1);
  });

  it('restores the last-sync timestamp from the manifest', async () => {
    const lastSync = '2026-06-28T12:34:56.000Z';
    const remote = await makeRemote(fullContent(), { lastSync });
    const store = makeStore(matchingShas(remote));

    await syncOparlSnapshot({
      baseUrl: BASE_URL,
      prefix: PREFIX,
      fetchFn: makeFetch(remote),
      log: silentLog(),
      ...store,
    });

    assertEquals(store.metadata, lastSync);
  });

  it('does not write the last-sync timestamp when the manifest has none', async () => {
    const remote = await makeRemote(fullContent());
    const store = makeStore(matchingShas(remote));

    await syncOparlSnapshot({
      baseUrl: BASE_URL,
      prefix: PREFIX,
      fetchFn: makeFetch(remote),
      log: silentLog(),
      ...store,
    });

    assertEquals(store.metadata, null);
  });

  it('throws when the manifest is unreachable and a required file is missing', async () => {
    const remote = await makeRemote(fullContent());
    const localShas: Record<string, string | null> = matchingShas(remote);
    localShas['organizations.json'] = null;
    const store = makeStore(localShas);

    await assertRejects(
      () =>
        syncOparlSnapshot({
          baseUrl: BASE_URL,
          prefix: PREFIX,
          fetchFn: makeFetch(remote, { failManifest: true }),
          log: silentLog(),
          ...store,
        }),
      Error,
      'missing locally: organizations.json',
    );
  });
});
