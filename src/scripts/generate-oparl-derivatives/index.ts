import { OparlObjectsFileStore } from '../shared/oparl/oparl-objects-store.ts';
import { checkArgs, parseCliArgs, printHelpText } from './cli.ts';
import { DerivativesFileWriter } from './derivatives-writer.ts';
import { OparlDerivativesGenerator } from './oparl-derivatives-generator.ts';

const args = parseCliArgs(Bun.argv.slice(2));

if (args.help) {
  printHelpText();
  process.exit(0);
}

checkArgs(args);

const oparlObjectsStore = new OparlObjectsFileStore(args.oparlDir);
const writer = new DerivativesFileWriter(args.dataDir);

const generator = new OparlDerivativesGenerator(oparlObjectsStore, writer);
await generator.generate();

console.log('Done.');
