import { tryGetPushEnv } from '../shared/push-env.ts';
import {
  collectWebAssets,
  createAwsOperations,
  type LocalAsset,
  publishWebAssets,
  verifyWebAssets,
  type WebAssetOperations,
  type WebAssetPlan,
  type WebAssetTarget,
} from '../shared/web-asset-publisher.ts';

/** The stable S3 prefix the »Abstimmungen« batches live under, shared with the web build's reads. */
const PAPER_VOTINGS_PREFIX = 'web-assets/paper-votings';

/**
 * Publishes an authoritative batch set to `web-assets/paper-votings/` and confirms the result. The
 * assets are the generator's complete picture of the prefix (it prunes stale batches as it writes),
 * so the publisher uploads new or changed batches, prunes orphans against them, and invalidates the
 * touched paths. A real publish then verifies the remote prefix against that same list, catching a
 * silent put or delete failure the plan alone would not reveal. A dry run reports the diff and skips
 * both mutation and verification. Assets and operations are passed in, so this is unit-testable
 * without touching S3 or the filesystem.
 */
export async function publishAndVerifyPaperVotings(
  assets: LocalAsset[],
  target: WebAssetTarget,
  operations: WebAssetOperations,
  options: { dryRun?: boolean } = {},
): Promise<WebAssetPlan> {
  const plan = await publishWebAssets(assets, target, operations, options);
  logPlan(plan, options.dryRun ?? false);

  if (options.dryRun) {
    return plan;
  }

  await verifyWebAssets(assets, target, operations);
  console.log(`Verified ${assets.length} objects under ${target.bucket}/${target.prefix}.`);
  return plan;
}

/**
 * Reads the generated output directory into the authoritative asset list and publishes it against
 * the real AWS-backed operations, taking credentials and the CloudFront distribution from the
 * environment. This is the only piece that touches the filesystem and AWS; the publish orchestration
 * it delegates to is exercised directly in tests.
 */
export async function pushPaperVotingsFromEnv(
  outputDir: string,
  options: { dryRun?: boolean } = {},
): Promise<WebAssetPlan> {
  const env = tryGetPushEnv();
  const target: WebAssetTarget = {
    bucket: env.bucket,
    prefix: PAPER_VOTINGS_PREFIX,
    distributionId: env.distributionId,
  };
  const operations = await createAwsOperations(env);
  const assets = await collectWebAssets(outputDir, target.prefix);
  return publishAndVerifyPaperVotings(assets, target, operations, options);
}

function logPlan(plan: WebAssetPlan, dryRun: boolean): void {
  const heading = dryRun ? 'Dry run - would publish paper votings:' : 'Published paper votings:';
  console.log(heading);
  console.log(`  uploads:       ${plan.uploads.length}`);
  console.log(`  deletes:       ${plan.deletes.length}`);
  console.log(`  unchanged:     ${plan.unchanged.length}`);
  console.log(`  invalidations: ${plan.invalidations.length}`);
  logKeys('upload', plan.uploads);
  logKeys('delete', plan.deletes);
}

function logKeys(action: string, keys: string[]): void {
  for (const key of keys) {
    console.log(`  ${action}: ${key}`);
  }
}
