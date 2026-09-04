import { checkArgs, parseArgs, printHelpText } from './cli.ts';
import { getFetchOparlEnvOrExit } from './env.ts';
import { createHttpSnapshotSource } from './snapshot-source.ts';
import { createFileSnapshotStore } from './snapshot-store.ts';
import { syncOparlSnapshot } from './sync-snapshot.ts';

const args = parseArgs(Deno.args);

if (args.help) {
  printHelpText();
  Deno.exit(0);
}

checkArgs(args);

const env = getFetchOparlEnvOrExit();
const source = createHttpSnapshotSource(env.baseUrl, env.prefix);
const store = createFileSnapshotStore(args.dir);
const log = { info: (message: string) => console.log(message), warn: (message: string) => console.warn(message) };

try {
  await syncOparlSnapshot(source, store, log);
} catch (error) {
  console.error(`fetch-oparl failed: ${error instanceof Error ? error.message : String(error)}`);
  Deno.exit(1);
}
