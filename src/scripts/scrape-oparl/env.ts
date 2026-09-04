import { DEFAULT_SNAPSHOT_PREFIX } from '../shared/oparl/oparl-snapshot.ts';

export type ScrapeOparlEnv = {
  bodyUrl: string;
  fetchDelayMs: string;
};

export function tryGetScrapeOparlEnv(): ScrapeOparlEnv {
  const bodyUrl = Deno.env.get('SCRAPE_OPARL_BODY_URL');
  if (!bodyUrl) {
    console.error('Environment variable SCRAPE_OPARL_BODY_URL must be set.');
    Deno.exit(1);
  }

  const fetchDelayMs = Deno.env.get('SCRAPE_OPARL_FETCH_DELAY_MS');
  if (!fetchDelayMs) {
    console.error('Environment variable SCRAPE_OPARL_FETCH_DELAY_MS must be set.');
    Deno.exit(1);
  }

  return { bodyUrl, fetchDelayMs };
}

export type ScrapeOparlPushEnv = {
  bucket: string;
  prefix: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
};

/**
 * Reads the AWS env required for `--push`. Validated only when pushing, so a normal scrape needs
 * no AWS configuration. Missing required vars exit the process (matching `tryGetScrapeOparlEnv`).
 */
export function tryGetScrapeOparlPushEnv(): ScrapeOparlPushEnv {
  const bucket = requireEnv('OPARL_S3_BUCKET');
  const prefix = Deno.env.get('OPARL_S3_PREFIX') ?? DEFAULT_SNAPSHOT_PREFIX;
  const region = requireEnv('AWS_REGION');
  const accessKeyId = requireEnv('AWS_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('AWS_SECRET_ACCESS_KEY');

  return { bucket, prefix, region, accessKeyId, secretAccessKey };
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    console.error(`Environment variable ${name} must be set when using --push.`);
    Deno.exit(1);
  }
  return value;
}
