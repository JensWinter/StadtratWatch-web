import { checkArgs, parseCliArgs, printHelpText } from './cli.ts';
import { CheckInputFileStore } from './data-store.ts';
import { PaperReferenceChecker, type UnknownPaperReference } from './paper-reference-checker.ts';

const args = parseCliArgs(Bun.argv.slice(2));

if (args.help) {
  printHelpText();
  process.exit(0);
}

checkArgs(args);

const checker = new PaperReferenceChecker(new CheckInputFileStore(args.dataDir));
const unknownReferences = await checkOrExit(checker, args.session);

if (unknownReferences.length === 0) {
  console.log('Every Drucksachennummer is in paper-reference-map.json.');
  process.exit(0);
}

for (const unknownReference of unknownReferences) {
  console.log(formatUnknownReference(unknownReference));
}
console.log(`\n${unknownReferences.length} votings have a Drucksachennummer that is not in paper-reference-map.json.`);
process.exit(1);

async function checkOrExit(
  paperReferenceChecker: PaperReferenceChecker,
  session?: string,
): Promise<UnknownPaperReference[]> {
  try {
    return await paperReferenceChecker.check(session);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(2);
  }
}

function formatUnknownReference({ sessionDate, agendaItem, motionId }: UnknownPaperReference): string {
  return `${sessionDate}  TOP ${agendaItem}  ${JSON.stringify(motionId)}`;
}
