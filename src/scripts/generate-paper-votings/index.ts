import { checkArgs, parseArgs, printHelpText } from './cli.ts';
import { PeriodDataFileStore } from './period-data-store.ts';
import { PaperVotingsGenerator } from './paper-votings-generator.ts';
import { PaperVotingsFileWriter } from './paper-votings-writer.ts';

const args = parseArgs(Deno.args);

if (args.help) {
  printHelpText();
  Deno.exit(0);
}

checkArgs(args);

const periodDataStore = new PeriodDataFileStore(args.dataDir);
const paperVotingsWriter = new PaperVotingsFileWriter(args.outputDir);

const generator = new PaperVotingsGenerator(periodDataStore, paperVotingsWriter);
generator.generatePaperVotings();

console.log('Done.');
