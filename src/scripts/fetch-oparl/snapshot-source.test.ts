import { assertEquals, assertRejects, assertStringIncludes } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { type OparlManifest } from '../shared/oparl/oparl-snapshot.ts';
import { createHttpSnapshotSource, type FetchFn } from './snapshot-source.ts';

const BASE_URL = 'https://cdn.example.test/';
const PREFIX = 'oparl';

const MANIFEST: OparlManifest = { files: { 'papers.json': { blob: 'papers.abc.json.gz', sha: 'abc', bytes: 3 } } };

function recordingFetch(handler: (url: string) => Response): FetchFn & { urls: string[] } {
  const urls: string[] = [];
  const fetchFn = (url: string) => {
    urls.push(url);
    return Promise.resolve(handler(url));
  };
  return Object.assign(fetchFn, { urls });
}

describe('createHttpSnapshotSource', () => {
  it('requests the manifest under the prefix and normalises the trailing slash', async () => {
    const fetchFn = recordingFetch(() => new Response(JSON.stringify(MANIFEST)));
    const source = createHttpSnapshotSource(BASE_URL, PREFIX, fetchFn);

    const result = await source.tryFetchManifest();

    assertEquals(fetchFn.urls, ['https://cdn.example.test/oparl/manifest.json']);
    assertEquals(result, { ok: true, manifest: MANIFEST });
  });

  it('reports an unreachable manifest as a value, not an exception', async () => {
    const fetchFn = recordingFetch(() => new Response(null, { status: 503, statusText: 'Service Unavailable' }));
    const source = createHttpSnapshotSource(BASE_URL, PREFIX, fetchFn);

    const result = await source.tryFetchManifest();

    assertEquals(result.ok, false);
    if (!result.ok) assertStringIncludes(result.reason, '503');
  });

  it('reports a malformed 200 manifest as a value, not an exception', async () => {
    const fetchFn = recordingFetch(() => new Response(JSON.stringify({ notFiles: true })));
    const source = createHttpSnapshotSource(BASE_URL, PREFIX, fetchFn);

    const result = await source.tryFetchManifest();

    assertEquals(result.ok, false);
    if (!result.ok) assertStringIncludes(result.reason, 'malformed');
  });

  it('reports a thrown fetch as a value', async () => {
    const source = createHttpSnapshotSource(BASE_URL, PREFIX, () => Promise.reject(new Error('network down')));

    const result = await source.tryFetchManifest();

    assertEquals(result.ok, false);
    if (!result.ok) assertStringIncludes(result.reason, 'network down');
  });

  it('streams a blob body from the prefixed URL', async () => {
    const fetchFn = recordingFetch(() => new Response('payload'));
    const source = createHttpSnapshotSource(BASE_URL, PREFIX, fetchFn);

    const body = await source.fetchBlob('papers.abc.json.gz');

    assertEquals(fetchFn.urls, ['https://cdn.example.test/oparl/papers.abc.json.gz']);
    assertEquals(await new Response(body).text(), 'payload');
  });

  it('throws when a blob request fails', async () => {
    const source = createHttpSnapshotSource(
      BASE_URL,
      PREFIX,
      () => Promise.resolve(new Response(null, { status: 404, statusText: 'Not Found' })),
    );

    await assertRejects(() => source.fetchBlob('missing.json.gz'), Error, '404');
  });
});
