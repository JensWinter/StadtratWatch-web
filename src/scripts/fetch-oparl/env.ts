import { DEFAULT_SNAPSHOT_PREFIX } from '../shared/oparl/oparl-snapshot.ts';

export type FetchOparlEnv = {
  baseUrl: string;
  prefix: string;
};

/**
 * Reads the remote-snapshot location. `fetch-oparl` only touches the public distribution, so no AWS
 * credentials are involved — unlike `scrape-oparl --push`.
 */
export function getFetchOparlEnvOrExit(): FetchOparlEnv {
  const baseUrl = Deno.env.get('AWS_CLOUDFRONT_BASE_URL');
  if (!baseUrl) {
    console.error('Environment variable AWS_CLOUDFRONT_BASE_URL must be set.');
    Deno.exit(1);
  }

  const prefix = Deno.env.get('OPARL_S3_PREFIX') ?? DEFAULT_SNAPSHOT_PREFIX;

  return { baseUrl, prefix };
}
