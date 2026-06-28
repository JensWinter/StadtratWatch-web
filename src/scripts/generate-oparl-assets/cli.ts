import { parseArgs as stdCliParseArgs } from '@std/cli/parse-args';

export type GenerateOparlAssetsArgs = {
  help: boolean;
  ratsinfoDir: string;
  outputDir: string;
};

export function parseArgs(args: string[]): GenerateOparlAssetsArgs {
  return stdCliParseArgs(args, {
    boolean: ['help'],
    string: ['ratsinfo-dir', 'output-dir'],
    alias: {
      help: 'h',
      'ratsinfo-dir': ['r', 'ratsinfoDir'],
      'output-dir': ['o', 'outputDir'],
    },
  }) as GenerateOparlAssetsArgs;
}

export function checkArgs(args: GenerateOparlAssetsArgs) {
  const { ratsinfoDir, outputDir } = args;

  if (!ratsinfoDir) {
    console.error('Missing ratsinfo directory. See --help for usage.');
    Deno.exit(1);
  }

  if (!outputDir) {
    console.error('Missing output directory. See --help for usage.');
    Deno.exit(1);
  }
}

export function printHelpText() {
  console.log(`
Usage: deno run index.ts -r <ratsinfo-dir> -o <output-dir>
-h, --help                  Show this help message and exit.
-r, --ratsinfo-dir          The directory containing the raw OParl files (meetings.json, agenda-items.json, consultations.json, papers.json).
-o, --output-dir            The output directory. The council-scoped JSON files will be written here.
  `);
}
