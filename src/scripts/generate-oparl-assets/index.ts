import { checkArgs, parseArgs, printHelpText } from './cli.ts';
import { OparlObjectsFileStore } from '../shared/oparl/oparl-objects-store.ts';
import { OparlCouncilAssetsGenerator } from './oparl-council-assets-generator.ts';
import { OparlCouncilAssetsFileWriter } from './oparl-council-assets-writer.ts';

const args = parseArgs(Deno.args);

if (args.help) {
  printHelpText();
  Deno.exit(0);
}

checkArgs(args);

const oparlObjectsStore = new OparlObjectsFileStore(args.ratsinfoDir);
const writer = new OparlCouncilAssetsFileWriter(args.outputDir);

const generator = new OparlCouncilAssetsGenerator(oparlObjectsStore, writer);
generator.generate();

console.log('Done.');
