import { isOparlManifest, MANIFEST_FILENAME, type OparlManifest } from '../shared/oparl/oparl-snapshot.ts';

/** The one HTTP capability the source needs; narrowed from `fetch` so tests can supply a double. */
export type FetchFn = (url: string) => Promise<Response>;

/** Outcome of a manifest fetch. Network/HTTP failures are values, not exceptions, so the sync
 * planner can fall back to the local snapshot instead of the whole run aborting. */
export type ManifestFetch =
  | { ok: true; manifest: OparlManifest }
  | { ok: false; reason: string };

/** Reads the published snapshot (manifest + blobs) from a remote base URL under a prefix. */
export type SnapshotSource = {
  tryFetchManifest(): Promise<ManifestFetch>;
  fetchBlob(blob: string): Promise<ReadableStream<Uint8Array>>;
};

/**
 * Snapshot source backed by an HTTP(S) origin — in production the public CloudFront distribution.
 * Blobs are stored with `Content-Encoding: gzip`, which the HTTP client decodes transparently, so
 * callers receive plain JSON and must not gunzip again.
 */
export function createHttpSnapshotSource(
  baseUrl: string,
  prefix: string,
  fetchFn: FetchFn = (url) => fetch(url),
): SnapshotSource {
  const base = baseUrl.replace(/\/+$/, '');
  const urlFor = (name: string) => `${base}/${prefix}/${name}`;

  return {
    async tryFetchManifest() {
      const url = urlFor(MANIFEST_FILENAME);
      try {
        const response = await fetchFn(url);
        if (!response.ok) {
          return { ok: false, reason: `manifest request returned ${response.status} ${response.statusText} (${url})` };
        }
        const payload = await response.json();
        if (!isOparlManifest(payload)) {
          return { ok: false, reason: `manifest is malformed: no files map (${url})` };
        }
        return { ok: true, manifest: payload };
      } catch (error) {
        return { ok: false, reason: `${errorMessage(error)} (${url})` };
      }
    },

    async fetchBlob(blob) {
      const url = urlFor(blob);
      const response = await fetchFn(url);
      if (!response.ok || !response.body) {
        throw new Error(`blob request returned ${response.status} ${response.statusText} (${url})`);
      }
      return response.body;
    },
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
