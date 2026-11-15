import { parseArgs } from 'node:util';

export type CheckPaperReferencesArgs = {
  help: boolean;
  dataDir: string;
  session?: string;
};

export function parseCliArgs(args: string[]): CheckPaperReferencesArgs {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      'data-dir': { type: 'string', short: 'd', default: 'data/' },
      session: { type: 'string', short: 's' },
    },
  });
  return {
    help: values.help,
    dataDir: values['data-dir'],
    session: values.session,
  };
}

export function checkArgs(args: CheckPaperReferencesArgs) {
  if (!args.dataDir) {
    console.error('Missing data directory. See --help for usage.');
    process.exit(1);
  }

  if (args.session !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(args.session)) {
    console.error('Session must be a date in the format YYYY-MM-DD. See --help for usage.');
    process.exit(1);
  }
}

export function printHelpText() {
  console.log(`
Usage: bun index.ts [-d <data-dir>] [-s <session>]

Reports every voting whose Drucksachennummer is not in <data-dir>/paper-reference-map.json.
Whitespace in the number is ignored, votings without a number are skipped.
Exits with code 1 if it reports anything, 2 if the session has no scan.

-h, --help                  Show this help message and exit.
-d, --data-dir              The data directory with paper-reference-map.json and
                            the parliament period directories. Default: data/
-s, --session               Check only this session (YYYY-MM-DD). Default: all sessions.
  `);
}
