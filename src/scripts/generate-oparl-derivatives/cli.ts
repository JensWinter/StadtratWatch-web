import { parseArgs as stdCliParseArgs } from '@std/cli/parse-args';

export type GenerateOparlDerivativesArgs = {
  help: boolean;
  oparlDir: string;
  dataDir: string;
};

export function parseArgs(args: string[]): GenerateOparlDerivativesArgs {
  return stdCliParseArgs(args, {
    boolean: ['help'],
    string: ['oparl-dir', 'data-dir'],
    alias: {
      help: 'h',
      'oparl-dir': ['o', 'oparlDir'],
      'data-dir': ['d', 'dataDir'],
    },
    default: {
      'oparl-dir': 'data/oparl-magdeburg/',
      'data-dir': 'data/',
    },
  }) as GenerateOparlDerivativesArgs;
}

export function checkArgs(args: GenerateOparlDerivativesArgs) {
  const { oparlDir, dataDir } = args;

  if (!oparlDir) {
    console.error('Missing OParl directory. See --help for usage.');
    Deno.exit(1);
  }

  if (!dataDir) {
    console.error('Missing data directory. See --help for usage.');
    Deno.exit(1);
  }
}

export function printHelpText() {
  console.log(`
Usage: deno run index.ts [-o <oparl-dir>] [-d <data-dir>]

Scans <data-dir> for {period-id}/registry.json and regenerates, in a single run,
every period's voting-paper-map.json plus the global paper-index.json from the
raw OParl data in <oparl-dir>.

-h, --help                  Show this help message and exit.
-o, --oparl-dir             The directory containing the raw OParl files
                            (meetings.json, agenda-items.json, consultations.json,
                            papers.json). Default: data/oparl-magdeburg/
-d, --data-dir              The data directory containing the parliament period
                            registries. Derivates are written next to them.
                            Default: data/
  `);
}
