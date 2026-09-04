import { assertEquals } from '@std/assert';
import { afterEach, beforeEach, describe, it } from '@std/testing/bdd';
import * as path from '@std/path';
import { SCRAPER_METADATA_FILENAME, shortSnapshotSha } from '../shared/oparl/oparl-snapshot.ts';
import { createFileSnapshotStore } from './snapshot-store.ts';

// The store is the one filesystem-backed component, so its test needs read+write. CI runs a bare
// `deno test` (no permissions) and simply skips this suite; run `deno test -A` locally to exercise it.
const hasFilesystemAccess = (await Deno.permissions.query({ name: 'write' })).state === 'granted' &&
  (await Deno.permissions.query({ name: 'read' })).state === 'granted';

function bodyOf(text: string): ReadableStream<Uint8Array> {
  return new Response(text).body!;
}

describe('createFileSnapshotStore', { ignore: !hasFilesystemAccess }, () => {
  let dir: string;

  beforeEach(async () => {
    dir = await Deno.makeTempDir({ prefix: 'fetch-oparl-store-' });
  });

  afterEach(async () => {
    await Deno.remove(dir, { recursive: true });
  });

  it('creates the target directory on ensureReady', async () => {
    const nested = path.join(dir, 'a', 'b');
    await createFileSnapshotStore(nested).ensureReady();

    assertEquals((await Deno.stat(nested)).isDirectory, true);
  });

  it('reports null for a missing file and the short sha for a present one', async () => {
    const content = '[{"id":1}]';
    await Deno.writeTextFile(path.join(dir, 'papers.json'), content);

    const shas = await createFileSnapshotStore(dir).readLocalShas();

    assertEquals(shas.get('papers.json'), await shortSnapshotSha(new TextEncoder().encode(content)));
    assertEquals(shas.get('meetings.json'), null);
  });

  it('writes a blob body to its file and leaves no temp file behind', async () => {
    const store = createFileSnapshotStore(dir);
    await store.ensureReady();

    await store.writeBlob('meetings.json', bodyOf('[{"meeting":1}]'));

    assertEquals(await Deno.readTextFile(path.join(dir, 'meetings.json')), '[{"meeting":1}]');
    assertEquals(await exists(path.join(dir, 'meetings.json.tmp')), false);
  });

  it('writes the scraper metadata file', async () => {
    const store = createFileSnapshotStore(dir);
    await store.ensureReady();

    await store.writeScraperMetadata('2026-06-28T12:34:56.000Z');

    assertEquals(await Deno.readTextFile(path.join(dir, SCRAPER_METADATA_FILENAME)), '2026-06-28T12:34:56.000Z');
  });

  it('promotes a complete staged snapshot without changing the current snapshot first', async () => {
    await Deno.writeTextFile(path.join(dir, 'meetings.json'), '[{"generation":"old"}]');
    const store = createFileSnapshotStore(dir);
    const stagedSnapshot = await store.createStagingSnapshot();

    await stagedSnapshot.store.writeBlob('meetings.json', bodyOf('[{"generation":"new"}]'));

    assertEquals(await Deno.readTextFile(path.join(dir, 'meetings.json')), '[{"generation":"old"}]');

    await stagedSnapshot.commit();

    assertEquals(await Deno.readTextFile(path.join(dir, 'meetings.json')), '[{"generation":"new"}]');
  });
});

async function exists(filePath: string): Promise<boolean> {
  try {
    await Deno.stat(filePath);
    return true;
  } catch {
    return false;
  }
}
