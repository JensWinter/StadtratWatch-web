import * as path from '@std/path';
import {
  OPARL_SNAPSHOT_FILENAMES,
  SCRAPER_METADATA_FILENAME,
  shortSnapshotSha,
} from '../shared/oparl/oparl-snapshot.ts';

/** Short SHA per snapshot file present on disk; `null` for a file that is missing. */
export type LocalShas = Map<string, string | null>;

/** The local end of the mirror: the directory the snapshot is materialised into. */
export type SnapshotStore = {
  ensureReady(): Promise<void>;
  readLocalShas(): Promise<LocalShas>;
  writeBlob(filename: string, body: ReadableStream<Uint8Array>): Promise<void>;
  writeScraperMetadata(lastSync: string): Promise<void>;
};

/** Snapshot store backed by a directory on the local filesystem. */
export function createFileSnapshotStore(directory: string): SnapshotStore {
  const pathTo = (filename: string) => path.join(directory, filename);

  return {
    async ensureReady() {
      await Deno.mkdir(directory, { recursive: true });
    },

    async readLocalShas() {
      const shas: LocalShas = new Map();
      for (const filename of OPARL_SNAPSHOT_FILENAMES) {
        shas.set(filename, await readShaIfExists(pathTo(filename)));
      }
      return shas;
    },

    // Streams to a temp file, then atomically renames, so an interrupted download never leaves a
    // corrupt file that a later run would trust as valid.
    async writeBlob(filename, body) {
      const destPath = pathTo(filename);
      const tmpPath = `${destPath}.tmp`;
      const tmpFile = await Deno.open(tmpPath, { write: true, create: true, truncate: true });
      await body.pipeTo(tmpFile.writable);
      await Deno.rename(tmpPath, destPath);
    },

    async writeScraperMetadata(lastSync) {
      await Deno.writeTextFile(pathTo(SCRAPER_METADATA_FILENAME), lastSync);
    },
  };
}

async function readShaIfExists(filePath: string): Promise<string | null> {
  try {
    return await shortSnapshotSha(await Deno.readFile(filePath));
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return null;
    }
    throw error;
  }
}
