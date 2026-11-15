import { parseArgs } from 'node:util';

export type GenerateOparlDerivativesArgs = {
  help: boolean;
  oparlDir: string;
  dataDir: string;
};

export function parseCliArgs(args: string[]): GenerateOparlDerivativesArgs {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      'oparl-dir': { type: 'string', short: 'o', default: 'data/oparl-magdeburg/' },
      'data-dir': { type: 'string', short: 'd', default: 'data/' },
    },
  });
  return {
    help: values.help,
    oparlDir: values['oparl-dir'],
    dataDir: values['data-dir'],
  };
}

export function checkArgs(args: GenerateOparlDerivativesArgs) {
  const { oparlDir, dataDir } = args;

  if (!oparlDir) {
    console.error('Missing OParl directory. See --help for usage.');
    process.exit(1);
  }

  if (!dataDir) {
    console.error('Missing data directory. See --help for usage.');
    process.exit(1);
  }
}

export function printHelpText() {
  console.log(`
Usage: bun index.ts [-o <oparl-dir>] [-d <data-dir>]

Scans <data-dir> for {period-id}/registry.json and regenerates, in a single run,
every period's voting-paper-map.json plus the global paper-index.json and
paper-reference-map.json from the raw OParl data in <oparl-dir>.

-h, --help                  Show this help message and exit.
-o, --oparl-dir             The directory containing the raw OParl files
                            (meetings.json, agenda-items.json, consultations.json,
                            papers.json). Default: data/oparl-magdeburg/
-d, --data-dir              The data directory containing the parliament period
                            registries. Derivates are written next to them.
                            Default: data/
  `);
}
