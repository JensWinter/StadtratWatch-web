import * as path from 'node:path';

import { SCRAPER_METADATA_FILENAME } from '../shared/oparl/oparl-snapshot.ts';
import { checkArgs, parseCliArgs, printHelpText } from './cli.ts';
import { type OparlSyncStep, runOparlSync } from './oparl-sync.ts';

const args = parseCliArgs(Bun.argv.slice(2));

if (args.help) {
  printHelpText();
  process.exit(0);
}

checkArgs(args);

const result = await runOparlSync(args, {
  currentYear: new Date().getFullYear(),
  snapshotExists: () => Bun.file(path.join(args.ratsinfoDir, SCRAPER_METADATA_FILENAME)).exists(),
  runStep: runScript,
  readDerivative,
  log: (message) => console.log(message),
});

process.exit(result.exitCode);

async function runScript(step: OparlSyncStep): Promise<number> {
  const scriptPath = path.join(import.meta.dir, '..', step.script, 'index.ts');
  const subprocess = Bun.spawn([process.execPath, scriptPath, ...step.args], {
    stdio: ['inherit', 'inherit', 'inherit'],
  });
  return await subprocess.exited;
}

async function readDerivative(fileName: string): Promise<string | null> {
  const file = Bun.file(path.join(args.dataDir, fileName));
  return (await file.exists()) ? await file.text() : null;
}
