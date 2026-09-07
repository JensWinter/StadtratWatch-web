import { type PutObjectCommandInput } from '@aws-sdk/client-s3';
import { crypto } from '@std/crypto';
import { encodeHex } from '@std/encoding/hex';
import { walk } from '@std/fs';
import * as path from '@std/path';
import { type PushEnv } from './push-env.ts';

/**
 * Cache-Control for published web assets. Unlike the content-addressed OParl blobs (immutable, one
 * year), these batches are overwritten in place under stable filenames, so they cannot be cached
 * forever. A one-hour TTL keeps edge and browser caches warm between the infrequent maintainer
 * publishes while bounding how long a stale copy can linger. Every publish also invalidates the
 * paths it touched, so the edge turns fresh immediately; this TTL only governs already-warm browser
 * caches, which the invalidation cannot reach.
 */
export const WEB_ASSET_CACHE_CONTROL = 'public, max-age=3600';

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  '.json': 'application/json',
  '.png': 'image/png',
};
const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

/** A locally produced asset, addressed by the full S3 key it should occupy (prefix included). */
export type LocalAsset = {
  key: string;
  body: Uint8Array<ArrayBuffer>;
};

/** An object already present in the bucket under the prefix, as returned by a list. */
export type RemoteObject = {
  key: string;
  /** S3 ETag; used to skip re-uploading unchanged assets. Quotes and weak markers are tolerated. */
  etag: string;
};

/**
 * Sends a single S3 put. Abstracted so tests can inject a fake and so the heavy AWS SDK is only
 * loaded by the real implementation — importing this module stays side-effect free.
 */
export type S3Send = (input: PutObjectCommandInput) => Promise<unknown>;

/** Lists every object under `prefix` with its ETag. Injectable so tests need no AWS. */
export type S3List = (bucket: string, prefix: string) => Promise<RemoteObject[]>;

/** Deletes the given keys. Injectable so tests need no AWS. */
export type S3DeleteKeys = (bucket: string, keys: string[]) => Promise<unknown>;

/** Invalidates the given CloudFront paths. Injectable so tests need no AWS. */
export type CloudFrontInvalidate = (distributionId: string, paths: string[]) => Promise<unknown>;

/** The four side-effecting operations a publish needs, bundled so callers can inject fakes. */
export type WebAssetOperations = {
  send: S3Send;
  list: S3List;
  deleteKeys: S3DeleteKeys;
  invalidate: CloudFrontInvalidate;
};

/** Where a set of assets is published: which bucket, under which prefix, behind which distribution. */
export type WebAssetTarget = {
  bucket: string;
  prefix: string;
  distributionId: string;
};

/**
 * What a publish would do (or did), in terms of full S3 keys and CloudFront paths. Returned by both
 * dry-run and real publishes so callers can log or verify exactly what changed.
 */
export type WebAssetPlan = {
  uploads: string[];
  deletes: string[];
  invalidations: string[];
  unchanged: string[];
};

/**
 * Computes what to upload, delete and invalidate for an authoritative asset set against the current
 * remote inventory. An asset is uploaded when it is new or its content differs from the remote ETag;
 * a remote object is deleted when it is absent from the set (an orphan). The touched paths — every
 * upload and delete — are the ones to invalidate, because those are the only keys whose cached
 * bytes changed.
 */
export async function diffWebAssets(assets: LocalAsset[], remote: RemoteObject[]): Promise<WebAssetPlan> {
  const remoteEtagByKey = new Map(remote.map((object) => [object.key, normalizeEtag(object.etag)]));
  const localKeys = new Set(assets.map((asset) => asset.key));

  const uploads: string[] = [];
  const unchanged: string[] = [];
  for (const asset of assets) {
    const remoteEtag = remoteEtagByKey.get(asset.key);
    if (remoteEtag !== undefined && remoteEtag === await md5Hex(asset.body)) {
      unchanged.push(asset.key);
    } else {
      uploads.push(asset.key);
    }
  }

  const deletes = remote.map((object) => object.key).filter((key) => !localKeys.has(key));
  const invalidations = [...uploads, ...deletes].map(toInvalidationPath);

  return {
    uploads: uploads.toSorted((a, b) => a.localeCompare(b)),
    deletes: deletes.toSorted((a, b) => a.localeCompare(b)),
    invalidations: invalidations.toSorted((a, b) => a.localeCompare(b)),
    unchanged: unchanged.toSorted((a, b) => a.localeCompare(b)),
  };
}

/**
 * Publishes an authoritative asset set to one prefix: uploads new or changed objects with an
 * explicit Cache-Control, prunes remote orphans, and invalidates the touched CloudFront paths. With
 * `dryRun`, it lists and computes the plan but performs no mutation. Returns the plan either way.
 */
export async function publishWebAssets(
  assets: LocalAsset[],
  target: WebAssetTarget,
  operations: WebAssetOperations,
  options: { dryRun?: boolean } = {},
): Promise<WebAssetPlan> {
  const remote = await operations.list(target.bucket, target.prefix);
  const plan = await diffWebAssets(assets, remote);

  if (options.dryRun) {
    return plan;
  }

  const assetByKey = new Map(assets.map((asset) => [asset.key, asset]));
  for (const key of plan.uploads) {
    const asset = assetByKey.get(key)!;
    await operations.send({
      Bucket: target.bucket,
      Key: key,
      Body: asset.body,
      ContentType: contentTypeFor(key),
      CacheControl: WEB_ASSET_CACHE_CONTROL,
    });
  }

  if (plan.deletes.length > 0) {
    await operations.deleteKeys(target.bucket, plan.deletes);
  }

  if (plan.invalidations.length > 0) {
    await operations.invalidate(target.distributionId, plan.invalidations);
  }

  return plan;
}

/**
 * Reads every file under `directory` into an authoritative asset list, keyed as
 * `<prefix>/<path-relative-to-directory>` with forward slashes. The result is the complete picture
 * the prefix should contain, so pruning orphans against it is safe.
 */
export async function collectWebAssets(directory: string, prefix: string): Promise<LocalAsset[]> {
  const base = trimTrailingSlash(prefix);
  const assets: LocalAsset[] = [];
  for await (const entry of walk(directory, { includeDirs: false })) {
    const relativeKey = path.relative(directory, entry.path).split(path.SEPARATOR).join('/');
    const key = base ? `${base}/${relativeKey}` : relativeKey;
    assets.push({ key, body: await Deno.readFile(entry.path) });
  }
  return assets.sort((first, second) => first.key.localeCompare(second.key));
}

/**
 * Builds the real AWS-backed operations, importing the SDKs lazily so this module stays side-effect
 * free and unit tests can inject fakes without ever loading them.
 */
export async function createAwsOperations(env: PushEnv): Promise<WebAssetOperations> {
  const { DeleteObjectsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } = await import(
    '@aws-sdk/client-s3'
  );
  const { CloudFrontClient, CreateInvalidationCommand } = await import('@aws-sdk/client-cloudfront');

  const credentials = { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey };
  const s3 = new S3Client({ region: env.region, credentials });
  const cloudFront = new CloudFrontClient({ region: env.region, credentials });

  return {
    send: (input) => s3.send(new PutObjectCommand(input)),
    list: async (bucket, prefix) => {
      const objects: RemoteObject[] = [];
      let continuationToken: string | undefined;
      do {
        const page = await s3.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: trimTrailingSlash(prefix) || undefined,
            ContinuationToken: continuationToken,
          }),
        );
        for (const object of page.Contents ?? []) {
          if (object.Key && object.ETag) {
            objects.push({ key: object.Key, etag: object.ETag });
          }
        }
        continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (continuationToken);
      return objects;
    },
    deleteKeys: async (bucket, keys) => {
      for (const batch of chunk(keys, S3_DELETE_BATCH_LIMIT)) {
        const response = await s3.send(
          new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: batch.map((key) => ({ Key: key })) } }),
        );
        if (response.Errors?.length) {
          const details = response.Errors.map((error) =>
            [error.Key ?? '<unknown key>', error.Code, error.Message].filter(Boolean).join(': ')
          ).join('; ');
          throw new Error(`Failed to delete S3 objects from ${bucket}: ${details}`);
        }
      }
    },
    invalidate: (distributionId, paths) =>
      cloudFront.send(
        new CreateInvalidationCommand({
          DistributionId: distributionId,
          InvalidationBatch: {
            CallerReference: `web-assets-${Date.now()}`,
            Paths: { Quantity: paths.length, Items: paths },
          },
        }),
      ),
  };
}

/** S3 `DeleteObjects` accepts at most 1000 keys per request. */
const S3_DELETE_BATCH_LIMIT = 1000;

function contentTypeFor(key: string): string {
  return CONTENT_TYPE_BY_EXTENSION[path.extname(key).toLowerCase()] ?? DEFAULT_CONTENT_TYPE;
}

/** Strips the weak marker and surrounding quotes S3 wraps ETags in, and lower-cases the hex. */
function normalizeEtag(etag: string): string {
  return etag.replace(/^W\//, '').replaceAll('"', '').toLowerCase();
}

async function md5Hex(body: Uint8Array<ArrayBuffer>): Promise<string> {
  return encodeHex(await crypto.subtle.digest('MD5', body));
}

function toInvalidationPath(key: string): string {
  return `/${key}`;
}

/**
 * Drops a trailing slash from a prefix so the keys `collectWebAssets` builds and the keys `list`
 * returns line up regardless of how the caller spells the prefix. A mismatch here would make every
 * remote object look like an orphan and delete the lot.
 */
function trimTrailingSlash(prefix: string): string {
  return prefix.replace(/\/+$/, '');
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    batches.push(items.slice(start, start + size));
  }
  return batches;
}
