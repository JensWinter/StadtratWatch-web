/**
 * The AWS credentials and targets needed to publish web assets to S3/CloudFront. The bucket is the
 * same one the OParl snapshot uses (`OPARL_S3_BUCKET`); the distribution id is new and only web
 * assets need it, because — unlike the immutable OParl blobs — they are overwritten in place and so
 * must be invalidated on every publish.
 */
export type PushEnv = {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  distributionId: string;
};

/**
 * Reads the AWS env required to publish web assets. Validated only when a `--push` is requested, so
 * an ordinary generator run needs no AWS configuration. A missing variable exits the process
 * (matching the other env helpers), since a push cannot proceed without it.
 */
export function tryGetPushEnv(): PushEnv {
  return {
    bucket: requireEnv('OPARL_S3_BUCKET'),
    region: requireEnv('AWS_REGION'),
    accessKeyId: requireEnv('AWS_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv('AWS_SECRET_ACCESS_KEY'),
    distributionId: requireEnv('AWS_CLOUDFRONT_DISTRIBUTION_ID'),
  };
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    console.error(`Environment variable ${name} must be set when using --push.`);
    Deno.exit(1);
  }
  return value;
}
