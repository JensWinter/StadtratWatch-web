import { parseArgs as stdCliParseArgs } from '@std/cli/parse-args';

export type GeneratePaperVotingsArgs = {
  help: boolean;
  dataDir: string;
  outputDir: string;
};

export function parseArgs(args: string[]): GeneratePaperVotingsArgs {
  return stdCliParseArgs(args, {
    boolean: ['help'],
    string: ['data-dir', 'output-dir'],
    alias: {
      help: 'h',
      'data-dir': ['d', 'dataDir'],
      'output-dir': ['o', 'outputDir'],
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
Usage: deno run index.ts [-d <data-dir>] -o <output-dir>

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
  `);
}
