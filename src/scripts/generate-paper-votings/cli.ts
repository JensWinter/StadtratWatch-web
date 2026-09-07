import { parseArgs as stdCliParseArgs } from '@std/cli/parse-args';

export type GeneratePaperVotingsArgs = {
  help: boolean;
  dataDir: string;
  outputDir: string;
  push: boolean;
  dryRun: boolean;
};

export function parseArgs(args: string[]): GeneratePaperVotingsArgs {
  return stdCliParseArgs(args, {
    boolean: ['help', 'push', 'dry-run'],
    string: ['data-dir', 'output-dir'],
    alias: {
      help: 'h',
      'data-dir': ['d', 'dataDir'],
      'output-dir': ['o', 'outputDir'],
      'dry-run': 'dryRun',
    },
    default: {
      'data-dir': 'data/',
    },
  }) as GeneratePaperVotingsArgs;
}

export function checkArgs(args: GeneratePaperVotingsArgs) {
  const { dataDir, outputDir } = args;

  if (!dataDir) {
    console.error('Missing data directory. See --help for usage.');
    Deno.exit(1);
  }

  if (!outputDir) {
    console.error('Missing output directory. See --help for usage.');
    Deno.exit(1);
  }
}

export function printHelpText() {
  console.log(`
Usage: deno run index.ts [-d <data-dir>] -o <output-dir> [--push [--dry-run]]

Scans <data-dir> for {period-id}/registry.json and reverses every period's
voting-paper-map.json against the scanned votings, so that each paper carries the
votings it was decided in - including the faction/person breakdown. Papers without
a scanned voting do not appear in the output.

-h, --help                  Show this help message and exit.
-d, --data-dir              The data directory containing the parliament period
                            registries, voting-paper-maps and session scans.
                            Default: data/
-o, --output-dir            The output directory. Batched json files
                            (paper-votings-{batch}.json) will be written here.
    --push                  After generating, publish the output directory to
                            web-assets/paper-votings/ on S3/CloudFront: upload new
                            or changed batches, prune orphaned ones, set
                            Cache-Control, invalidate the touched paths, and verify
                            the result. Requires OPARL_S3_BUCKET (the target bucket)
                            plus AWS credentials/configuration (AWS_REGION,
                            AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
                            AWS_CLOUDFRONT_DISTRIBUTION_ID). See .env.sample.
    --dry-run               Only meaningful with --push: report the upload/delete/
                            invalidate diff without mutating S3.
  `);
}
