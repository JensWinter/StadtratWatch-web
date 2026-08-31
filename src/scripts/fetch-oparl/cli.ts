import { parseArgs as stdCliParseArgs } from '@std/cli/parse-args';

export type FetchOparlArgs = {
  help: boolean;
  ratsinfosystemDir: string;
};

export function parseArgs(args: string[]): FetchOparlArgs {
  return stdCliParseArgs(args, {
    boolean: ['help'],
    string: ['ratsinfosystemDir'],
    alias: {
      help: 'h',
      'ratsinfosystem-dir': ['r', 'ratsinfosystemDir'],
    },
  }) as FetchOparlArgs;
}

export function checkArgs(args: FetchOparlArgs) {
  if (!args.ratsinfosystemDir) {
    console.error('Missing ratsinfosystem-dir parameter. See --help for usage.');
    Deno.exit(1);
  }
}

export function printHelpText() {
  console.log(`
Usage: deno run index.ts
-h, --help                  Show this help message and exit.
-r, --ratsinfosystem-dir    Specify the directory the OParl snapshot is synced into.
  `);
}
