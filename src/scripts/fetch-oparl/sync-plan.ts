import {
  OPARL_SNAPSHOT_FILENAMES,
  type OparlManifest,
  type OparlManifestEntry,
} from '../shared/oparl/oparl-snapshot.ts';
import { type ManifestFetch } from './snapshot-source.ts';
import { type LocalShas } from './snapshot-store.ts';

export type BlobDownload = { filename: string; entry: OparlManifestEntry };

export type SyncPlan = {
  /** Files whose remote hash differs from (or is missing) the local copy. */
  downloads: BlobDownload[];
  /** Files already matching the manifest (or kept as-is when absent from it). */
  upToDate: string[];
  /** Non-fatal conditions worth surfacing (e.g. manifest unreachable, extra local file kept). */
  warnings: string[];
  /** Last-sync timestamp to restore locally, when the manifest carries one. */
  lastSync?: string;
};

/** A local file the run depends on is unavailable and cannot be recovered from the remote. */
export class SnapshotPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotPlanError';
  }
}

/**
 * Decides, purely from the manifest fetch result and the local hashes, what the sync must do.
 * Throws {@link SnapshotPlanError} for the unrecoverable cases; everything else is expressed as
 * downloads, up-to-date files and warnings.
 */
export function createSyncPlan(manifestFetch: ManifestFetch, localShas: LocalShas): SyncPlan {
  return manifestFetch.ok
    ? planFromManifest(manifestFetch.manifest, localShas)
    : planWithoutManifest(manifestFetch.reason, localShas);
}

function planFromManifest(manifest: OparlManifest, localShas: LocalShas): SyncPlan {
  const downloads: BlobDownload[] = [];
  const upToDate: string[] = [];
  const warnings: string[] = [];

  for (const filename of OPARL_SNAPSHOT_FILENAMES) {
    const entry = manifest.files[filename];
    const localSha = localShas.get(filename) ?? null;

    if (!entry) {
      if (localSha === null) {
        throw new SnapshotPlanError(`Required file ${filename} is absent from the manifest and missing locally.`);
      }
      warnings.push(`File ${filename} is absent from the manifest; keeping the local copy.`);
      upToDate.push(filename);
      continue;
    }

    if (localSha === entry.sha) {
      upToDate.push(filename);
      continue;
    }

    downloads.push({ filename, entry });
  }

  return { downloads, upToDate, warnings, lastSync: nonEmptyLastSync(manifest) };
}

// The manifest is the only way to recover a missing file, so its absence is fatal when anything is
// missing. When every file already exists locally we keep working (offline dev/builds), only warning.
function planWithoutManifest(reason: string, localShas: LocalShas): SyncPlan {
  const missing = OPARL_SNAPSHOT_FILENAMES.filter((filename) => localShas.get(filename) == null);
  if (missing.length > 0) {
    throw new SnapshotPlanError(
      `Cannot fetch the OParl manifest and these required files are missing locally: ${missing.join(', ')}. ` +
        `Reason: ${reason}`,
    );
  }

  return {
    downloads: [],
    upToDate: [...OPARL_SNAPSHOT_FILENAMES],
    warnings: [`OParl manifest unavailable (${reason}); using the existing local snapshot.`],
  };
}

function nonEmptyLastSync(manifest: OparlManifest): string | undefined {
  return typeof manifest.lastSync === 'string' && manifest.lastSync.length > 0 ? manifest.lastSync : undefined;
}
