import { publishAndVerifyImageAssets } from './push.ts';
import type { LocalAsset, RemoteObject, WebAssetOperations, WebAssetTarget } from '../shared/web-asset-publisher.ts';
import { assertEquals, assertRejects } from '@std/assert';
import { assertSpyCall, assertSpyCalls, spy, stub } from '@std/testing/mock';
import { describe, it } from '@std/testing/bdd';

const TARGET: WebAssetTarget = {
  bucket: 'test-bucket',
  prefix: `web-assets/parliament-periods/magdeburg-8`,
  distributionId: 'DIST123',
};

function keyOf(sessionId: string, votingId: string): string {
  return `${TARGET.prefix}/images/votings/${sessionId}/${sessionId}-${votingId}.png`;
}

function image(sessionId: string, votingId: string, content: string): LocalAsset {
  return {
    key: keyOf(sessionId, votingId),
    body: new TextEncoder().encode(content) as Uint8Array<ArrayBuffer>,
  };
}

/**
 * Operations backed by an in-memory inventory: `send` and `deleteKeys` mutate it and `list` reflects
 * those mutations, so the post-publish verify observes the state the publish produced - which is what
 * makes the silent-failure test meaningful. Tests wrap individual methods with `spy` to assert calls,
 * or `stub` one to simulate a failure.
 */
function imageAssetsOperations(remote: RemoteObject[]): WebAssetOperations {
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

describe('publishAndVerifyImageAssets', () => {
  it('uploads the generated images under the period prefix, preserving the nested votings tree', async () => {
    const assets = [image('2024-01-01', '000', 'first'), image('2024-01-01', '001', 'second')];
    const operations = imageAssetsOperations([]);
    using sendSpy = spy(operations, 'send');

    const plan = await publishAndVerifyImageAssets(assets, TARGET, operations);

    assertEquals(plan.uploads, [keyOf('2024-01-01', '000'), keyOf('2024-01-01', '001')]);
    assertSpyCalls(sendSpy, 2);
    assertEquals(sendSpy.calls.map((call) => call.args[0].Key), [
      keyOf('2024-01-01', '000'),
      keyOf('2024-01-01', '001'),
    ]);
  });

  it('prunes a remote orphan the run no longer produces', async () => {
    const assets = [image('2024-01-01', '000', 'first')];
    const orphan = keyOf('2024-01-01', '009');
    const operations = imageAssetsOperations([{ key: orphan, etag: 'some etag' }]);
    using deleteSpy = spy(operations, 'deleteKeys');

    const plan = await publishAndVerifyImageAssets(assets, TARGET, operations);

    assertEquals(plan.deletes, [orphan]);
    assertSpyCall(deleteSpy, 0, { args: [TARGET.bucket, [orphan]] });
  });

  it('mutates nothing on a dry run', async () => {
    const assets = [image('2024-01-01', '000', 'first')];
    const operations = imageAssetsOperations([]);
    using sendSpy = spy(operations, 'send');
    using deleteSpy = spy(operations, 'deleteKeys');
    using invalidateSpy = spy(operations, 'invalidate');

    const plan = await publishAndVerifyImageAssets(assets, TARGET, operations, { dryRun: true });

    assertEquals(plan.uploads, [keyOf('2024-01-01', '000')]);
    assertSpyCalls(sendSpy, 0);
    assertSpyCalls(deleteSpy, 0);
    assertSpyCalls(invalidateSpy, 0);
  });

  it('throws when the remote prefix does not end up matching the produced images', async () => {
    const assets = [image('2024-01-01', '000', 'first')];
    const operations = imageAssetsOperations([]);
    using _silentSend = stub(operations, 'send', () => Promise.resolve({}));

    await assertRejects(
      () => publishAndVerifyImageAssets(assets, TARGET, operations),
      Error,
      'verification failed',
    );
  });
});
