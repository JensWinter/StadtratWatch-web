import { parseArgs as stdCliParseArgs } from '@std/cli/parse-args';

export type FetchOparlArgs = {
  help: boolean;
  dir: string;
};

export function parseArgs(args: string[]): FetchOparlArgs {
  return stdCliParseArgs(args, {
    boolean: ['help'],
    string: ['dir'],
    alias: {
      help: 'h',
      dir: 'd',
    },
    default: {
      dir: 'data/oparl-magdeburg/',
    },
  }) as FetchOparlArgs;
}

export function checkArgs(args: FetchOparlArgs) {
  if (!args.dir) {
    console.error('Missing dir parameter. See --help for usage.');
    Deno.exit(1);
  }
}

export function printHelpText() {
  console.log(`
Usage: deno run index.ts [-d <dir>]

Mirrors the published OParl snapshot into <dir>. It reads the remote manifest, compares each file's
content hash against the local copy and downloads only the blobs that changed or are missing
(idempotent — if everything matches it does nothing). The remote base URL and prefix come from the
environment (AWS_CLOUDFRONT_BASE_URL, OPARL_S3_PREFIX).

-h, --help    Show this help message and exit.
-d, --dir     Directory the snapshot is materialised into. Default: data/oparl-magdeburg/
  `);
}
