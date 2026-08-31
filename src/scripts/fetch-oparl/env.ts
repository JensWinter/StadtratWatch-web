export type FetchOparlEnv = {
  baseUrl: string;
  prefix: string;
};

/**
 * Reads the env `fetch-oparl` needs. Only the public CloudFront base URL is required; no AWS
 * credentials are involved, since the snapshot blobs and manifest are served publicly.
 */
export function tryGetFetchOparlEnv(): FetchOparlEnv {
  const baseUrl = Deno.env.get('AWS_CLOUDFRONT_BASE_URL');
  if (!baseUrl) {
    console.error('Environment variable AWS_CLOUDFRONT_BASE_URL must be set.');
    Deno.exit(1);
  }

  const prefix = Deno.env.get('OPARL_S3_PREFIX') ?? 'oparl';

  return { baseUrl, prefix };
}
