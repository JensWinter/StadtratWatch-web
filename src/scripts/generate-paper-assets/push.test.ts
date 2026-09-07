import { publishAndVerifyPaperAssets } from './push.ts';
import type { LocalAsset, RemoteObject, WebAssetOperations, WebAssetTarget } from '../shared/web-asset-publisher.ts';
import { assertEquals, assertRejects } from '@std/assert';
import { assertSpyCall, assertSpyCalls, spy, stub } from '@std/testing/mock';
import { describe, it } from '@std/testing/bdd';

const TARGET: WebAssetTarget = {
  bucket: 'test-bucket',
  prefix: 'web-assets/papers',
  distributionId: 'DIST123',
};

function papersKey(batchNo: string): string {
  return `${TARGET.prefix}/papers-${batchNo}.json`;
}

function graphsKey(batchNo: string): string {
  return `${TARGET.prefix}/paper-graphs-${batchNo}.json`;
}

function asset(key: string, content: string): LocalAsset {
  return {
    key,
    body: new TextEncoder().encode(content) as Uint8Array<ArrayBuffer>,
  };
}

/**
 * Operations backed by an in-memory inventory: `send` and `deleteKeys` mutate it and `list` reflects
 * those mutations, so the post-publish verify observes the state the publish produced - which is what
 * makes the silent-failure test meaningful. Tests wrap individual methods with `spy` to assert calls,
 * or `stub` one to simulate a failure.
 */
function paperAssetsOperations(remote: RemoteObject[]): WebAssetOperations {
  const inventory = new Map(remote.map((object) => [object.key, object]));
  return {
    list: () => Promise.resolve([...inventory.values()]),
    send: (input) => {
      inventory.set(input.Key!, { key: input.Key!, etag: 'some etag' });
      return Promise.resolve({});
    },
    deleteKeys: (_bucket, keys) => {
      keys.forEach((key) => inventory.delete(key));
      return Promise.resolve({});
    },
    invalidate: () => Promise.resolve({}),
  };
}

describe('publishAndVerifyPaperAssets', () => {
  it('uploads the generated paper and paper-graph batches under the papers prefix and verifies the result', async () => {
    const assets = [asset(papersKey('0020'), '{"batch":20}'), asset(graphsKey('0020'), '{"graphs":20}')];
    const operations = paperAssetsOperations([]);
    using sendSpy = spy(operations, 'send');

    const plan = await publishAndVerifyPaperAssets(assets, TARGET, operations);

    assertEquals(plan.uploads, [graphsKey('0020'), papersKey('0020')]);
    assertSpyCalls(sendSpy, 2);
  });

  it('prunes a remote orphan the run no longer produces', async () => {
    const assets = [asset(papersKey('0020'), '{"batch":20}')];
    const orphan = papersKey('0099');
    const operations = paperAssetsOperations([{ key: orphan, etag: 'some etag' }]);
    using deleteSpy = spy(operations, 'deleteKeys');

    const plan = await publishAndVerifyPaperAssets(assets, TARGET, operations);

    assertEquals(plan.deletes, [orphan]);
    assertSpyCall(deleteSpy, 0, { args: [TARGET.bucket, [orphan]] });
  });

  it('mutates nothing on a dry run', async () => {
    const assets = [asset(papersKey('0020'), '{"batch":20}')];
    const operations = paperAssetsOperations([]);
    using sendSpy = spy(operations, 'send');
    using deleteSpy = spy(operations, 'deleteKeys');
    using invalidateSpy = spy(operations, 'invalidate');

    const plan = await publishAndVerifyPaperAssets(assets, TARGET, operations, { dryRun: true });

    assertEquals(plan.uploads, [papersKey('0020')]);
    assertSpyCalls(sendSpy, 0);
    assertSpyCalls(deleteSpy, 0);
    assertSpyCalls(invalidateSpy, 0);
  });

  it('throws when the remote prefix does not end up matching the produced batches', async () => {
    const assets = [asset(papersKey('0020'), '{"batch":20}')];
    const operations = paperAssetsOperations([]);
    using _silentSend = stub(operations, 'send', () => Promise.resolve({}));

    await assertRejects(
      () => publishAndVerifyPaperAssets(assets, TARGET, operations),
      Error,
      'verification failed',
    );
  });
});
