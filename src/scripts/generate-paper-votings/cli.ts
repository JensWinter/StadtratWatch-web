import { parseArgs } from 'node:util';

export type GeneratePaperVotingsArgs = {
  help: boolean;
  dataDir: string;
  outputDir?: string;
  push: boolean;
  dryRun: boolean;
};

export function parseCliArgs(args: string[]): GeneratePaperVotingsArgs {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      'data-dir': { type: 'string', short: 'd', default: 'data/' },
      'output-dir': { type: 'string', short: 'o' },
      push: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
    },
  });
  return {
    help: values.help,
    dataDir: values['data-dir'],
    outputDir: values['output-dir'],
    push: values.push,
    dryRun: values['dry-run'],
  };
}

export function checkArgs(args: GeneratePaperVotingsArgs): asserts args is Required<GeneratePaperVotingsArgs> {
  const { dataDir, outputDir } = args;

  if (!dataDir) {
    console.error('Missing data directory. See --help for usage.');
    process.exit(1);
  }

  if (!outputDir) {
    console.error('Missing output directory. See --help for usage.');
    process.exit(1);
  }
}

export function printHelpText() {
  console.log(`
Usage: bun index.ts [-d <data-dir>] -o <output-dir> [--push [--dry-run]]

Scans <data-dir> for {period-id}/registry.json and assigns every scanned voting to
the paper of its Drucksachennummer (paper-reference-map.json), so that each paper
carries the votings it was decided in - including the faction/person breakdown.
Papers without a scanned voting do not appear in the output.

-h, --help                  Show this help message and exit.
-d, --data-dir              The data directory containing the parliament period
                            registries, session scans and paper-reference-map.json.
                            Default: data/
-o, --output-dir            The output directory. Batched json files
                            (paper-votings-{batch}.json) will be written here.
    --push                  After generating, publish the output directory to
                            web-assets/paper-votings/ on S3/CloudFront: upload new
                            or changed batches, prune orphaned ones, set
                            Cache-Control, invalidate the touched paths, and verify
                            the result. Requires AWS_S3_BUCKET (the target bucket)
                            plus AWS credentials/configuration (AWS_REGION,
                            AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
                            AWS_CLOUDFRONT_DISTRIBUTION_ID). See .env.sample.
    --dry-run               Only meaningful with --push: report the upload/delete/
                            invalidate diff without mutating S3.
  `);
}
