/**
 * The published-snapshot contract shared by both ends of the OParl mirror: `scrape-oparl --push`
 * writes it to S3, `fetch-oparl` reads it back. Keeping the object-type↔filename mapping, the
 * manifest shape and the hashing in one module guarantees the scraper, the publisher and the
 * fetcher can never drift apart.
 */

export enum OparlObjectType {
  Organization,
  Person,
  Meeting,
  Paper,
  Membership,
  Location,
  AgendaItem,
  Consultation,
  File,
}

/**
 * The single source of truth for which OParl object types exist and the file each is stored under.
 * The scraper writes per type, and the snapshot file list below is derived from it, so a new type
 * only ever has to be added here.
 */
export const OPARL_FILENAME_BY_TYPE: Record<OparlObjectType, string> = {
  [OparlObjectType.Organization]: 'organizations.json',
  [OparlObjectType.Person]: 'persons.json',
  [OparlObjectType.Meeting]: 'meetings.json',
  [OparlObjectType.Paper]: 'papers.json',
  [OparlObjectType.Membership]: 'memberships.json',
  [OparlObjectType.Location]: 'locations.json',
  [OparlObjectType.AgendaItem]: 'agenda-items.json',
  [OparlObjectType.Consultation]: 'consultations.json',
  [OparlObjectType.File]: 'files.json',
};

/** Every OParl file carried in a snapshot, in object-type order. */
export const OPARL_SNAPSHOT_FILENAMES: readonly string[] = Object.values(OPARL_FILENAME_BY_TYPE);

/** Manifest object key, relative to the snapshot prefix. */
export const MANIFEST_FILENAME = 'manifest.json';

/** Local file carrying the last-sync timestamp; published inside the manifest, not as a blob. */
export const SCRAPER_METADATA_FILENAME = 'scraper-metadata.txt';

/** Default S3/CloudFront key prefix the snapshot lives under. */
export const DEFAULT_SNAPSHOT_PREFIX = 'oparl';

/** Hex length of the short SHA recorded per manifest entry. */
export const SNAPSHOT_SHA_LENGTH = 12;

export type OparlManifestEntry = {
  /** Object key (relative to the prefix), e.g. `meetings.<sha>.json.gz`. */
  blob: string;
  /** Short SHA-256 of the uncompressed JSON. */
  sha: string;
  /** Uncompressed byte size. */
  bytes: number;
};

export type OparlManifest = {
  /**
   * ISO timestamp of the last successful scrape, taken from the local `scraper-metadata.txt`.
   * Absent when no such file exists at push time. `fetch-oparl` restores it locally so an
   * incremental scrape on another machine resumes from the last published snapshot.
   */
  lastSync?: string;
  /** One entry per snapshot file, keyed by filename. */
  files: Record<string, OparlManifestEntry>;
};

/** Narrows an untrusted (network) value to a manifest shape the rest of the pipeline can rely on. */
export function isOparlManifest(value: unknown): value is OparlManifest {
  return typeof value === 'object' && value !== null &&
    typeof (value as OparlManifest).files === 'object' && (value as OparlManifest).files !== null;
}

/**
 * First {@link SNAPSHOT_SHA_LENGTH} hex chars of the SHA-256 of the uncompressed bytes. Both the
 * publisher (hashing what it uploads) and the fetcher (hashing what it has on disk) call this, so a
 * local file that came from a given blob reproduces the manifest's recorded sha.
 */
export async function shortSnapshotSha(data: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, SNAPSHOT_SHA_LENGTH);
}
