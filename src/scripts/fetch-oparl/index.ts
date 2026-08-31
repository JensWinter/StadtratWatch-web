import { checkArgs, parseArgs, printHelpText } from './cli.ts';
import { tryGetFetchOparlEnv } from './env.ts';
import { fetchOparlSnapshot } from './oparl-snapshot-fetcher.ts';

const args = parseArgs(Deno.args);

if (args.help) {
  printHelpText();
  Deno.exit(0);
}

checkArgs(args);

const env = tryGetFetchOparlEnv();

try {
  await fetchOparlSnapshot({ baseUrl: env.baseUrl, dir: args.ratsinfosystemDir, prefix: env.prefix });
} catch (error) {
  console.error(`fetch-oparl failed: ${error instanceof Error ? error.message : String(error)}`);
  Deno.exit(1);
}

console.log('Done.');
