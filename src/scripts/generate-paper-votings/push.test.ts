import { publishAndVerifyPaperVotings } from './push.ts';
import type { LocalAsset, RemoteObject, WebAssetOperations, WebAssetTarget } from '../shared/web-asset-publisher.ts';
import { assertEquals, assertRejects } from '@std/assert';
import { assertSpyCall, assertSpyCalls, spy, stub } from '@std/testing/mock';
import { describe, it } from '@std/testing/bdd';

const TARGET: WebAssetTarget = {
  bucket: 'test-bucket',
  prefix: 'web-assets/paper-votings',
  distributionId: 'DIST123',
};

function keyOf(batchNo: string): string {
  return `${TARGET.prefix}/paper-votings-${batchNo}.json`;
}

function batch(batchNo: string, content: string): LocalAsset {
  return {
    key: keyOf(batchNo),
    body: new TextEncoder().encode(content) as Uint8Array<ArrayBuffer>,
  };
}

/**
 * Operations backed by an in-memory inventory: `send` and `deleteKeys` mutate it and `list` reflects
 * those mutations, so the post-publish verify observes the state the publish produced - which is what
 * makes the silent-failure test meaningful. Tests wrap individual methods with `spy` to assert calls,
 * or `stub` one to simulate a failure.
 */
function paperVotingsOperations(remote: RemoteObject[]): WebAssetOperations {
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

describe('publishAndVerifyPaperVotings', () => {
  it('uploads the generated batches under the paper-votings prefix and verifies the result', async () => {
    const assets = [batch('0000', '{"batch":0}'), batch('0001', '{"batch":1}')];
    const operations = paperVotingsOperations([]);
    using sendSpy = spy(operations, 'send');

    const plan = await publishAndVerifyPaperVotings(assets, TARGET, operations);

    assertEquals(plan.uploads, [keyOf('0000'), keyOf('0001')]);
    assertSpyCalls(sendSpy, 2);
    assertEquals(sendSpy.calls.map((call) => call.args[0].Key), [keyOf('0000'), keyOf('0001')]);
  });

  it('prunes a remote orphan the run no longer produces', async () => {
    const assets = [batch('0000', '{"batch":0}')];
    const orphan = keyOf('0009');
    const operations = paperVotingsOperations([{ key: orphan, etag: 'some etag' }]);
    using deleteSpy = spy(operations, 'deleteKeys');

    const plan = await publishAndVerifyPaperVotings(assets, TARGET, operations);

    assertEquals(plan.deletes, [orphan]);
    assertSpyCall(deleteSpy, 0, { args: [TARGET.bucket, [orphan]] });
  });

  it('mutates nothing on a dry run', async () => {
    const assets = [batch('0000', '{"batch":0}')];
    const operations = paperVotingsOperations([]);
    using sendSpy = spy(operations, 'send');
    using deleteSpy = spy(operations, 'deleteKeys');
    using invalidateSpy = spy(operations, 'invalidate');

    const plan = await publishAndVerifyPaperVotings(assets, TARGET, operations, { dryRun: true });

    assertEquals(plan.uploads, [keyOf('0000')]);
    assertSpyCalls(sendSpy, 0);
    assertSpyCalls(deleteSpy, 0);
    assertSpyCalls(invalidateSpy, 0);
  });

  it('throws when the remote prefix does not end up matching the produced batches', async () => {
    const assets = [batch('0000', '{"batch":0}')];
    const operations = paperVotingsOperations([]);
    using _silentSend = stub(operations, 'send', () => Promise.resolve({}));

    await assertRejects(
      () => publishAndVerifyPaperVotings(assets, TARGET, operations),
      Error,
      'verification failed',
    );
  });
});
