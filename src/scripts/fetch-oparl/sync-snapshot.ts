import { createSyncPlan, type SyncPlan } from './sync-plan.ts';
import { type SnapshotSource } from './snapshot-source.ts';
import { type SnapshotStore } from './snapshot-store.ts';

export type SyncLogger = {
  info(message: string): void;
  warn(message: string): void;
};

export type SyncResult = {
  downloaded: string[];
  upToDate: string[];
};

/**
 * Mirrors the remote OParl snapshot into the store, downloading only the files whose hash differs
 * from (or is missing in) the local copy. Idempotent: with everything already in sync it downloads
 * nothing. Wiring only — every decision lives in the plan, every effect in the source or store.
 */
export async function syncOparlSnapshot(
  source: SnapshotSource,
  store: SnapshotStore,
  log: SyncLogger,
): Promise<SyncResult> {
  await store.ensureReady();
  const localShas = await store.readLocalShas();
  const manifestFetch = await source.tryFetchManifest();
  const plan = createSyncPlan(manifestFetch, localShas);

  reportWarnings(plan, log);
  const downloaded = await updateSnapshot(plan, source, store, log);

  reportSummary(downloaded, plan.upToDate, log);
  return { downloaded, upToDate: plan.upToDate };
}

async function updateSnapshot(
  plan: SyncPlan,
  source: SnapshotSource,
  store: SnapshotStore,
  log: SyncLogger,
): Promise<string[]> {
  if (plan.downloads.length === 0 && !plan.lastSync) return [];

  const stagedSnapshot = await store.createStagingSnapshot();
  try {
    const downloaded = await downloadPlannedBlobs(plan, source, stagedSnapshot.store, log);
    await restoreLastSync(plan, stagedSnapshot.store);
    await stagedSnapshot.commit();
    return downloaded;
  } catch (error) {
    await stagedSnapshot.discard();
    throw error;
  }
}

function reportWarnings(plan: SyncPlan, log: SyncLogger): void {
  for (const warning of plan.warnings) {
    log.warn(warning);
  }
}

async function downloadPlannedBlobs(
  plan: SyncPlan,
  source: SnapshotSource,
  store: SnapshotStore,
  log: SyncLogger,
): Promise<string[]> {
  const downloaded: string[] = [];
  for (const { filename, entry } of plan.downloads) {
    log.info(`Fetching ${filename} (${entry.blob})...`);
    const body = await source.fetchBlob(entry.blob);
    await store.writeBlob(filename, body);
    downloaded.push(filename);
  }
  return downloaded;
}

// Restoring the last-sync timestamp lets an incremental scrape on this machine resume from the last
// published snapshot (the scraper reads it back via its metadata store).
async function restoreLastSync(plan: SyncPlan, store: SnapshotStore): Promise<void> {
  if (plan.lastSync) {
    await store.writeScraperMetadata(plan.lastSync);
  }
}

function reportSummary(downloaded: string[], upToDate: string[], log: SyncLogger): void {
  if (downloaded.length === 0) {
    log.info(`OParl snapshot up to date (${upToDate.length} files).`);
  } else {
    log.info(`OParl snapshot updated: downloaded ${downloaded.length}, unchanged ${upToDate.length}.`);
  }
}
