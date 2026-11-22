import { parseArgs } from 'node:util';

export type OparlSyncArgs = {
  help: boolean;
  dryRun: boolean;
  years: number[] | undefined;
  ratsinfoDir: string;
  papersDir: string;
  dataDir: string;
  outputDir: string;
};

export function parseCliArgs(args: string[]): OparlSyncArgs {
  const { values } = parseArgs({
    args,
    options: {
      help: { type: 'boolean', short: 'h', default: false },
      'dry-run': { type: 'boolean', default: false },
      year: { type: 'string', short: 'y', multiple: true },
      'ratsinfo-dir': { type: 'string', short: 'r', default: 'data/oparl-magdeburg/' },
      'papers-dir': { type: 'string', short: 'p', default: 'output/papers/' },
      'data-dir': { type: 'string', short: 'd', default: 'data/' },
      'output-dir': { type: 'string', short: 'o', default: 'output/paper-assets/' },
    },
  });
  return {
    help: values.help,
    dryRun: values['dry-run'],
    years: values.year?.map((year) => (/^\d{4}$/.test(year) ? Number(year) : Number.NaN)),
    ratsinfoDir: values['ratsinfo-dir'],
    papersDir: values['papers-dir'],
    dataDir: values['data-dir'],
    outputDir: values['output-dir'],
  };
}

export function checkArgs(args: OparlSyncArgs) {
  if (args.years?.some((year) => !Number.isInteger(year))) {
    console.error('Each --year must be a four-digit year. See --help for usage.');
    process.exit(1);
  }
}

export function printHelpText() {
  console.log(`
Usage: bun index.ts [--dry-run] [-y <year> ...] [-r <ratsinfo-dir>] [-p <papers-dir>] [-d <data-dir>] [-o <output-dir>]

Runs the OParl-Sync: fetch-oparl (only without a local snapshot), scrape-oparl --push,
download-paper-files per year, generate-paper-assets --push and, only after that, generate-oparl-derivatives.
Stops at the first failed step; to resume, run it again. Reports whether paper-index.json and
paper-reference-map.json changed. Commits nothing.

-h, --help                  Show this help message and exit.
    --dry-run               Scrape, download and generate locally and show the paper-assets diff, but push
                            nothing and write no derivates.
-y, --year                  Year whose PDFs are downloaded. Repeat for several years.
                            Default: the current and the previous year.
-r, --ratsinfo-dir          The OParl snapshot directory. Default: data/oparl-magdeburg/
-p, --papers-dir            The PDF directory, one subdirectory per year. Default: output/papers/
-d, --data-dir              The data directory with the registries and derivates. Default: data/
-o, --output-dir            The paper-assets directory. Default: output/paper-assets/
  `);
}
