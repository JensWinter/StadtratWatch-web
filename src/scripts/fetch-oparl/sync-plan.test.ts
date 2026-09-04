import { assertEquals, assertThrows } from '@std/assert';
import { describe, it } from '@std/testing/bdd';
import { OPARL_SNAPSHOT_FILENAMES, type OparlManifest } from '../shared/oparl/oparl-snapshot.ts';
import { type ManifestFetch } from './snapshot-source.ts';
import { type LocalShas } from './snapshot-store.ts';
import { createSyncPlan, SnapshotPlanError } from './sync-plan.ts';

function manifestFor(shaByFile: Record<string, string>, lastSync?: string): OparlManifest {
  const files: OparlManifest['files'] = {};
  for (const [filename, sha] of Object.entries(shaByFile)) {
    files[filename] = { blob: `${filename.replace(/\.json$/, '')}.${sha}.json.gz`, sha, bytes: 1 };
  }
  return lastSync ? { lastSync, files } : { files };
}

function allFilesWithSha(sha: string): Record<string, string> {
  return Object.fromEntries(OPARL_SNAPSHOT_FILENAMES.map((filename) => [filename, sha]));
}

function localShasAllMatching(sha: string): LocalShas {
  return new Map(OPARL_SNAPSHOT_FILENAMES.map((filename) => [filename, sha]));
}

function ok(manifest: OparlManifest): ManifestFetch {
  return { ok: true, manifest };
}

function unavailable(reason = 'boom'): ManifestFetch {
  return { ok: false, reason };
}

describe('createSyncPlan', () => {
  it('downloads nothing when every local hash matches the manifest', () => {
    const plan = createSyncPlan(ok(manifestFor(allFilesWithSha('aaa'))), localShasAllMatching('aaa'));

    assertEquals(plan.downloads, []);
    assertEquals(plan.upToDate.length, OPARL_SNAPSHOT_FILENAMES.length);
    assertEquals(plan.warnings, []);
  });

  it('plans a download for a file whose hash changed', () => {
    const localShas = localShasAllMatching('aaa');
    const plan = createSyncPlan(ok(manifestFor({ ...allFilesWithSha('aaa'), 'papers.json': 'bbb' })), localShas);

    assertEquals(plan.downloads.map((download) => download.filename), ['papers.json']);
    assertEquals(plan.downloads[0].entry.sha, 'bbb');
  });

  it('plans a download for a file missing locally', () => {
    const localShas = localShasAllMatching('aaa');
    localShas.set('files.json', null);

    const plan = createSyncPlan(ok(manifestFor(allFilesWithSha('aaa'))), localShas);

    assertEquals(plan.downloads.map((download) => download.filename), ['files.json']);
  });

  it('carries the manifest lastSync into the plan', () => {
    const plan = createSyncPlan(
      ok(manifestFor(allFilesWithSha('aaa'), '2026-06-28T12:34:56.000Z')),
      localShasAllMatching('aaa'),
    );

    assertEquals(plan.lastSync, '2026-06-28T12:34:56.000Z');
  });

  it('omits lastSync when the manifest has none', () => {
    const plan = createSyncPlan(ok(manifestFor(allFilesWithSha('aaa'))), localShasAllMatching('aaa'));

    assertEquals(plan.lastSync, undefined);
  });

  it('keeps a local file that is absent from the manifest, with a warning', () => {
    const manifest = manifestFor(allFilesWithSha('aaa'));
    delete manifest.files['locations.json'];

    const plan = createSyncPlan(ok(manifest), localShasAllMatching('aaa'));

    assertEquals(plan.downloads, []);
    assertEquals(plan.upToDate.includes('locations.json'), true);
    assertEquals(plan.warnings.length, 1);
  });

  it('throws when a file is absent from the manifest and missing locally', () => {
    const manifest = manifestFor(allFilesWithSha('aaa'));
    delete manifest.files['locations.json'];
    const localShas = localShasAllMatching('aaa');
    localShas.set('locations.json', null);

    assertThrows(() => createSyncPlan(ok(manifest), localShas), SnapshotPlanError);
  });

  it('keeps the local snapshot when the manifest is unavailable but all files exist', () => {
    const plan = createSyncPlan(unavailable('503'), localShasAllMatching('aaa'));

    assertEquals(plan.downloads, []);
    assertEquals(plan.upToDate.length, OPARL_SNAPSHOT_FILENAMES.length);
    assertEquals(plan.warnings.length, 1);
  });

  it('throws when the manifest is unavailable and a required file is missing', () => {
    const localShas = localShasAllMatching('aaa');
    localShas.set('organizations.json', null);

    assertThrows(
      () => createSyncPlan(unavailable('503'), localShas),
      SnapshotPlanError,
      'organizations.json',
    );
  });
});
