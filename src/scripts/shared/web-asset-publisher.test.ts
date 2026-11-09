import { describe, expect, it } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';

import type { PutObjectCommandInput } from '@aws-sdk/client-s3';

import {
  collectWebAssets,
  type LocalAsset,
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

describe('collectWebAssets', () => {
  async function withOutputDirectory(files: Record<string, string>, run: (directory: string) => Promise<void>) {
    const directory = await mkdtemp(path.join(tmpdir(), 'web-assets-'));
    try {
      for (const [relativePath, content] of Object.entries(files)) {
        const filePath = path.join(directory, relativePath);
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, content);
      }
      await run(directory);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }

  it('skips dotfiles and everything inside dot-directories', async () => {
    await withOutputDirectory(
      {
        'paper-votings-0000.json': 'a',
        '.DS_Store': 'finder',
        'images/.DS_Store': 'finder',
        '.cache/leftover.json': 'stale',
        'images/votings/1.png': 'png',
      },
      async (directory) => {
        const assets = await collectWebAssets(directory, TARGET.prefix);

        expect(assets.map((asset) => asset.key)).toEqual([
          `${TARGET.prefix}/images/votings/1.png`,
          `${TARGET.prefix}/paper-votings-0000.json`,
        ]);
      },
    );
  });

  it('lets a publish prune a remote dotfile even when a local one with the same name exists', async () => {
    const remoteDotfile = `${TARGET.prefix}/images/.DS_Store`;
    await withOutputDirectory({ 'paper-votings-0000.json': 'a', 'images/.DS_Store': 'finder' }, async (directory) => {
      const assets = await collectWebAssets(directory, TARGET.prefix);
      const remote: RemoteObject[] = [
        { key: KEY_A, etag: etagOf('a') },
        { key: remoteDotfile, etag: etagOf('finder') },
      ];
      const { operations, recorder } = fakeOperations(remote);

      const plan = await publishWebAssets(assets, TARGET, operations);

      expect(plan.uploads).toEqual([]);
      expect(plan.deletes).toEqual([remoteDotfile]);
      const deletedKeys = new Set(recorder.deleted.flat());
      const { operations: afterPrune } = fakeOperations(remote.filter((object) => !deletedKeys.has(object.key)));
      await verifyWebAssets(assets, TARGET, afterPrune);
    });
  });
});
