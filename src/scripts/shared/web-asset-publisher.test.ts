import {
  type LocalAsset,
  publishWebAssets,
  type RemoteObject,
  verifyWebAssets,
  WEB_ASSET_CACHE_CONTROL,
  type WebAssetOperations,
  type WebAssetTarget,
} from './web-asset-publisher.ts';
import type { PutObjectCommandInput } from '@aws-sdk/client-s3';
import { crypto } from '@std/crypto';
import { encodeHex } from '@std/encoding/hex';
import { assertEquals, assertRejects } from '@std/assert';
import { describe, it } from '@std/testing/bdd';

const TARGET: WebAssetTarget = {
  bucket: 'test-bucket',
  prefix: 'web-assets/paper-votings',
  distributionId: 'DIST123',
};

function bytes(text: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(text);
}

/** The ETag S3 reports for a single-part upload: the body's MD5, hex-encoded and quoted. */
async function etagOf(text: string): Promise<string> {
  return `"${encodeHex(await crypto.subtle.digest('MD5', bytes(text)))}"`;
}

type Recorder = {
  puts: PutObjectCommandInput[];
  deleted: string[][];
  invalidated: { distributionId: string; paths: string[] }[];
};

/** Fake operations that record every mutation and touch no AWS, seeded with a remote inventory. */
function fakeOperations(remote: RemoteObject[]): { operations: WebAssetOperations; recorder: Recorder } {
  const recorder: Recorder = { puts: [], deleted: [], invalidated: [] };
  const operations: WebAssetOperations = {
    list: () => Promise.resolve(remote),
    send: (input) => {
      recorder.puts.push(input);
      return Promise.resolve({});
    },
    deleteKeys: (_bucket, keys) => {
      recorder.deleted.push(keys);
      return Promise.resolve({});
    },
    invalidate: (distributionId, paths) => {
      recorder.invalidated.push({ distributionId, paths });
      return Promise.resolve({});
    },
  };
  return { operations, recorder };
}

const KEY_A = `${TARGET.prefix}/paper-votings-0000.json`;
const KEY_B = `${TARGET.prefix}/paper-votings-0001.json`;
const ORPHAN = `${TARGET.prefix}/paper-votings-0009.json`;

describe('publishWebAssets', () => {
  it('uploads a new asset with explicit cache-control and content-type derived from its extension', async () => {
    const assets: LocalAsset[] = [{ key: KEY_A, body: bytes('{"a":1}') }];
    const { operations, recorder } = fakeOperations([]);

    const plan = await publishWebAssets(assets, TARGET, operations);

    assertEquals(plan.uploads, [KEY_A]);
    assertEquals(recorder.puts.length, 1);
    assertEquals(recorder.puts[0].Bucket, TARGET.bucket);
    assertEquals(recorder.puts[0].Key, KEY_A);
    assertEquals(recorder.puts[0].ContentType, 'application/json');
    assertEquals(recorder.puts[0].CacheControl, WEB_ASSET_CACHE_CONTROL);
  });

  it('skips an asset whose remote ETag already matches its content', async () => {
    const body = '{"unchanged":true}';
    const assets = [{ key: KEY_A, body: bytes(body) }];
    const { operations, recorder } = fakeOperations([{ key: KEY_A, etag: await etagOf(body) }]);

    const plan = await publishWebAssets(assets, TARGET, operations);

    assertEquals(plan.uploads, []);
    assertEquals(plan.unchanged, [KEY_A]);
    assertEquals(recorder.puts, []);
    assertEquals(recorder.invalidated, []);
  });

  it('re-uploads an asset whose content changed', async () => {
    const assets = [{ key: KEY_A, body: bytes('new') }];
    const { operations, recorder } = fakeOperations([{ key: KEY_A, etag: await etagOf('old') }]);

    const plan = await publishWebAssets(assets, TARGET, operations);

    assertEquals(plan.uploads, [KEY_A]);
    assertEquals(recorder.puts.length, 1);
  });

  it('prunes remote orphans that are absent from the authoritative list', async () => {
    const assets = [{ key: KEY_A, body: bytes('keep') }];
    const { operations, recorder } = fakeOperations([
      { key: KEY_A, etag: await etagOf('keep') },
      { key: ORPHAN, etag: await etagOf('gone') },
    ]);

    const plan = await publishWebAssets(assets, TARGET, operations);

    assertEquals(plan.deletes, [ORPHAN]);
    assertEquals(recorder.deleted, [[ORPHAN]]);
  });

  it('invalidates every uploaded and deleted path, and nothing that stayed unchanged', async () => {
    const assets = [
      { key: KEY_A, body: bytes('new') },
      { key: KEY_B, body: bytes('same') },
    ];
    const { operations, recorder } = fakeOperations([
      { key: KEY_A, etag: await etagOf('old') },
      { key: KEY_B, etag: await etagOf('same') },
      { key: ORPHAN, etag: await etagOf('gone') },
    ]);

    const plan = await publishWebAssets(assets, TARGET, operations);

    assertEquals(plan.invalidations, [`/${KEY_A}`, `/${ORPHAN}`].sort());
    assertEquals(recorder.invalidated, [{ distributionId: TARGET.distributionId, paths: plan.invalidations }]);
  });

  it('performs no mutations on a dry-run but returns the full plan', async () => {
    const assets = [{ key: KEY_A, body: bytes('new') }];
    const { operations, recorder } = fakeOperations([
      { key: KEY_A, etag: await etagOf('old') },
      { key: ORPHAN, etag: await etagOf('gone') },
    ]);

    const plan = await publishWebAssets(assets, TARGET, operations, { dryRun: true });

    assertEquals(plan.uploads, [KEY_A]);
    assertEquals(plan.deletes, [ORPHAN]);
    assertEquals(plan.invalidations, [`/${KEY_A}`, `/${ORPHAN}`].sort());
    assertEquals(recorder.puts, []);
    assertEquals(recorder.deleted, []);
    assertEquals(recorder.invalidated, []);
  });

  it('does not delete or invalidate when nothing changed', async () => {
    const body = 'same';
    const assets = [{ key: KEY_A, body: bytes(body) }];
    const { operations, recorder } = fakeOperations([{ key: KEY_A, etag: await etagOf(body) }]);

    await publishWebAssets(assets, TARGET, operations);

    assertEquals(recorder.puts, []);
    assertEquals(recorder.deleted, []);
    assertEquals(recorder.invalidated, []);
  });
});

describe('verifyWebAssets', () => {
  it('passes when the remote prefix holds exactly the authoritative keys', async () => {
    const assets: LocalAsset[] = [
      { key: KEY_A, body: bytes('a') },
      { key: KEY_B, body: bytes('b') },
    ];
    const { operations } = fakeOperations([
      { key: KEY_A, etag: await etagOf('a') },
      { key: KEY_B, etag: await etagOf('b') },
    ]);

    await verifyWebAssets(assets, TARGET, operations);
  });

  it('rejects when an authoritative asset is missing from the remote prefix', async () => {
    const assets: LocalAsset[] = [
      { key: KEY_A, body: bytes('a') },
      { key: KEY_B, body: bytes('b') },
    ];
    const { operations } = fakeOperations([{ key: KEY_A, etag: await etagOf('a') }]);

    await assertRejects(() => verifyWebAssets(assets, TARGET, operations), Error, KEY_B);
  });

  it('rejects when the remote prefix still holds an orphan the run did not produce', async () => {
    const assets: LocalAsset[] = [{ key: KEY_A, body: bytes('a') }];
    const { operations } = fakeOperations([
      { key: KEY_A, etag: await etagOf('a') },
      { key: ORPHAN, etag: await etagOf('gone') },
    ]);

    await assertRejects(() => verifyWebAssets(assets, TARGET, operations), Error, ORPHAN);
  });
});
