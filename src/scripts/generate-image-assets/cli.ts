import * as fs from '@std/fs';
import * as path from '@std/path';
import { parseArgs as stdCliParseArgs } from '@std/cli/parse-args';

export type GenerateDataAssetsArgs = {
  help: boolean;
  inputDir: string;
  outputDir: string;
  push: boolean;
  dryRun: boolean;
};

export function parseArgs(args: string[]): GenerateDataAssetsArgs {
  return stdCliParseArgs(args, {
    boolean: ['help', 'push', 'dry-run'],
    string: ['input-dir', 'output-dir'],
    alias: {
      help: 'h',
      'input-dir': ['i', 'inputDir'],
      'output-dir': ['o', 'outputDir'],
      'dry-run': 'dryRun',
    },
  }) as GenerateDataAssetsArgs;
}

export function checkArgs(args: GenerateDataAssetsArgs) {
  const { inputDir, outputDir } = args;

  if (!inputDir) {
    console.error('Missing input directory. See --help for usage.');
    Deno.exit(1);
  }

  if (!outputDir) {
    console.error('Missing output directory. See --help for usage.');
    Deno.exit(1);
  }

  const registryFilename = path.join(inputDir, 'registry.json');
  if (!fs.existsSync(registryFilename)) {
    console.error(`Registry file "${registryFilename}" does not exist.`);
    Deno.exit(1);
  }
}

export function printHelpText() {
  console.log(`
Usage: deno run index.ts -i <input-dir> -o <output-dir> [--push [--dry-run]]
-h, --help                  Show this help message and exit.
-i, --input-dir             The input directory.
-o, --output-dir            The output directory.
    --push                  After generating, publish the output directory to
                            web-assets/parliament-periods/{period}/ on
                            S3/CloudFront: upload new or changed images, prune
                            orphaned ones, set Cache-Control, invalidate the
                            touched paths, and verify the result. Requires
                            AWS_S3_BUCKET (the target bucket) plus AWS
                            credentials/configuration (AWS_REGION,
                            AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
                            AWS_CLOUDFRONT_DISTRIBUTION_ID). See .env.sample.
    --dry-run               Only meaningful with --push: report the upload/delete/
                            invalidate diff without mutating S3.
  `);
}
