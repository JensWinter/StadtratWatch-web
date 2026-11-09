import { describe, expect, it } from 'bun:test';
import { createHash } from 'node:crypto';

import type { PutObjectCommandInput } from '@aws-sdk/client-s3';

import {
  type LocalAsset,
  MAX_INDIVIDUAL_INVALIDATION_PATHS,
  publishWebAssets,
  type RemoteObject,
  verifyWebAssets,
  WEB_ASSET_CACHE_CONTROL,
  type WebAssetOperations,
  type WebAssetTarget,
} from './web-asset-publisher.ts';

const TARGET: WebAssetTarget = {
  bucket: 'test-bucket',
  prefix: 'web-assets/paper-votings',
  distributionId: 'DIST123',
};

function bytes(text: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(text);
}

/** The ETag S3 reports for a single-part upload: the body's MD5, hex-encoded and quoted. */
function etagOf(text: string): string {
  return `"${createHash('md5').update(bytes(text)).digest('hex')}"`;
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

function newAssets(count: number): LocalAsset[] {
  return Array.from({ length: count }, (_, index) => ({
    key: `${TARGET.prefix}/new-${String(index).padStart(4, '0')}.json`,
    body: bytes(`{"index":${index}}`),
  }));
}

describe('publishWebAssets', () => {
  it('uploads a new asset with explicit cache-control and content-type derived from its extension', async () => {
    const assets: LocalAsset[] = [{ key: KEY_A, body: bytes('{"a":1}') }];
    const { operations, recorder } = fakeOperations([]);

    const plan = await publishWebAssets(assets, TARGET, operations);

    expect(plan.uploads).toEqual([KEY_A]);
    expect(recorder.puts.length).toEqual(1);
    expect(recorder.puts[0].Bucket).toEqual(TARGET.bucket);
    expect(recorder.puts[0].Key).toEqual(KEY_A);
    expect(recorder.puts[0].ContentType).toEqual('application/json');
    expect(recorder.puts[0].CacheControl).toEqual(WEB_ASSET_CACHE_CONTROL);
  });

  it('skips an asset whose remote ETag already matches its content', async () => {
    const body = '{"unchanged":true}';
    const assets = [{ key: KEY_A, body: bytes(body) }];
    const { operations, recorder } = fakeOperations([{ key: KEY_A, etag: etagOf(body) }]);

    const plan = await publishWebAssets(assets, TARGET, operations);

    expect(plan.uploads).toEqual([]);
    expect(plan.unchanged).toEqual([KEY_A]);
    expect(recorder.puts).toEqual([]);
    expect(recorder.invalidated).toEqual([]);
  });

  it('re-uploads an asset whose content changed', async () => {
    const assets = [{ key: KEY_A, body: bytes('new') }];
    const { operations, recorder } = fakeOperations([{ key: KEY_A, etag: etagOf('old') }]);

    const plan = await publishWebAssets(assets, TARGET, operations);

    expect(plan.uploads).toEqual([KEY_A]);
    expect(recorder.puts.length).toEqual(1);
  });

  it('prunes remote orphans that are absent from the authoritative list', async () => {
    const assets = [{ key: KEY_A, body: bytes('keep') }];
    const { operations, recorder } = fakeOperations([
      { key: KEY_A, etag: etagOf('keep') },
      { key: ORPHAN, etag: etagOf('gone') },
    ]);

    const plan = await publishWebAssets(assets, TARGET, operations);

    expect(plan.deletes).toEqual([ORPHAN]);
    expect(recorder.deleted).toEqual([[ORPHAN]]);
  });

  it('invalidates every uploaded and deleted path, and nothing that stayed unchanged', async () => {
    const assets = [
      { key: KEY_A, body: bytes('new') },
      { key: KEY_B, body: bytes('same') },
    ];
    const { operations, recorder } = fakeOperations([
      { key: KEY_A, etag: etagOf('old') },
      { key: KEY_B, etag: etagOf('same') },
      { key: ORPHAN, etag: etagOf('gone') },
    ]);

    const plan = await publishWebAssets(assets, TARGET, operations);

    expect(plan.invalidations).toEqual([`/${KEY_A}`, `/${ORPHAN}`].sort());
    expect(recorder.invalidated).toEqual([{ distributionId: TARGET.distributionId, paths: plan.invalidations }]);
  });

  it('keeps the paths individual while no more files changed than the per-file limit', async () => {
    const assets = newAssets(MAX_INDIVIDUAL_INVALIDATION_PATHS);
    const { operations, recorder } = fakeOperations([]);

    const plan = await publishWebAssets(assets, TARGET, operations);

    expect(plan.invalidations.length).toEqual(MAX_INDIVIDUAL_INVALIDATION_PATHS);
    expect(plan.invalidations).toContain(`/${assets[0].key}`);
    expect(recorder.invalidated).toEqual([{ distributionId: TARGET.distributionId, paths: plan.invalidations }]);
  });

  it('bundles the invalidation into one wildcard for the prefix once uploads plus deletes exceed the limit', async () => {
    const assets = newAssets(MAX_INDIVIDUAL_INVALIDATION_PATHS);
    const { operations, recorder } = fakeOperations([{ key: ORPHAN, etag: etagOf('gone') }]);

    const plan = await publishWebAssets(assets, TARGET, operations);

    expect(plan.invalidations).toEqual(['/web-assets/paper-votings/*']);
    expect(recorder.invalidated).toEqual([
      { distributionId: TARGET.distributionId, paths: ['/web-assets/paper-votings/*'] },
    ]);
  });

  it('reports the bundled wildcard on a dry-run', async () => {
    const assets = newAssets(MAX_INDIVIDUAL_INVALIDATION_PATHS + 1);
    const { operations } = fakeOperations([]);

    const plan = await publishWebAssets(assets, TARGET, operations, { dryRun: true });

    expect(plan.invalidations).toEqual(['/web-assets/paper-votings/*']);
  });

  it('builds the wildcard without a double slash when the prefix has a trailing slash', async () => {
    const target = { ...TARGET, prefix: `${TARGET.prefix}/` };
    const assets = newAssets(MAX_INDIVIDUAL_INVALIDATION_PATHS + 1);
    const { operations } = fakeOperations([]);

    const plan = await publishWebAssets(assets, target, operations);

    expect(plan.invalidations).toEqual(['/web-assets/paper-votings/*']);
  });

  it('performs no mutations on a dry-run but returns the full plan', async () => {
    const assets = [{ key: KEY_A, body: bytes('new') }];
    const { operations, recorder } = fakeOperations([
      { key: KEY_A, etag: etagOf('old') },
      { key: ORPHAN, etag: etagOf('gone') },
    ]);

    const plan = await publishWebAssets(assets, TARGET, operations, { dryRun: true });

    expect(plan.uploads).toEqual([KEY_A]);
    expect(plan.deletes).toEqual([ORPHAN]);
    expect(plan.invalidations).toEqual([`/${KEY_A}`, `/${ORPHAN}`].sort());
    expect(recorder.puts).toEqual([]);
    expect(recorder.deleted).toEqual([]);
    expect(recorder.invalidated).toEqual([]);
  });

  it('does not delete or invalidate when nothing changed', async () => {
    const body = 'same';
    const assets = [{ key: KEY_A, body: bytes(body) }];
    const { operations, recorder } = fakeOperations([{ key: KEY_A, etag: etagOf(body) }]);

    await publishWebAssets(assets, TARGET, operations);

    expect(recorder.puts).toEqual([]);
    expect(recorder.deleted).toEqual([]);
    expect(recorder.invalidated).toEqual([]);
  });
});

describe('verifyWebAssets', () => {
  it('passes when the remote prefix holds exactly the authoritative keys', async () => {
    const assets: LocalAsset[] = [
      { key: KEY_A, body: bytes('a') },
      { key: KEY_B, body: bytes('b') },
    ];
    const { operations } = fakeOperations([
      { key: KEY_A, etag: etagOf('a') },
      { key: KEY_B, etag: etagOf('b') },
    ]);

    await verifyWebAssets(assets, TARGET, operations);
  });

  it('rejects when an authoritative asset is missing from the remote prefix', async () => {
    const assets: LocalAsset[] = [
      { key: KEY_A, body: bytes('a') },
      { key: KEY_B, body: bytes('b') },
    ];
    const { operations } = fakeOperations([{ key: KEY_A, etag: etagOf('a') }]);

    await expect(verifyWebAssets(assets, TARGET, operations)).rejects.toThrow(KEY_B);
  });

  it('rejects when the remote prefix still holds an orphan the run did not produce', async () => {
    const assets: LocalAsset[] = [{ key: KEY_A, body: bytes('a') }];
    const { operations } = fakeOperations([
      { key: KEY_A, etag: etagOf('a') },
      { key: ORPHAN, etag: etagOf('gone') },
    ]);

    await expect(verifyWebAssets(assets, TARGET, operations)).rejects.toThrow(ORPHAN);
  });
});
