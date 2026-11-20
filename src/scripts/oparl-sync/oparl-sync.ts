import * as path from 'node:path';

export type SyncScript =
  'fetch-oparl' | 'scrape-oparl' | 'download-paper-files' | 'generate-paper-assets' | 'generate-oparl-derivatives';

export type OparlSyncStep = {
  script: SyncScript;
  args: string[];
};

export type OparlSyncOptions = {
  dryRun: boolean;
  years: number[] | undefined;
  ratsinfoDir: string;
  papersDir: string;
  dataDir: string;
  outputDir: string;
};

export type OparlSyncDependencies = {
  currentYear: number;
  snapshotExists(): Promise<boolean>;
  runStep(step: OparlSyncStep): Promise<number>;
  readDerivative(fileName: string): Promise<string | null>;
  log(message: string): void;
};

export type DerivativeChange = {
  fileName: string;
  changed: boolean;
};

export type OparlSyncResult = {
  exitCode: number;
  derivativeChanges?: DerivativeChange[];
};

const DERIVATIVE_FILE_NAMES = ['paper-index.json', 'paper-reference-map.json'];

export async function runOparlSync(
  options: OparlSyncOptions,
  dependencies: OparlSyncDependencies,
): Promise<OparlSyncResult> {
  const snapshotExists = await dependencies.snapshotExists();
  const steps = planSteps(options, dependencies.currentYear, snapshotExists);
  const writesDerivatives = steps.some((step) => step.script === 'generate-oparl-derivatives');
  const derivativesBeforeRun = writesDerivatives ? await readDerivatives(dependencies) : [];

  for (const step of steps) {
    dependencies.log(`OParl-Sync: ${step.script} ${step.args.join(' ')}`);
    const exitCode = await dependencies.runStep(step);
    if (exitCode !== 0) {
      dependencies.log(`OParl-Sync aborted: ${step.script} failed with exit code ${exitCode}.`);
      return { exitCode };
    }
  }

  if (!writesDerivatives) return { exitCode: 0 };

  const derivativesAfterRun = await readDerivatives(dependencies);
  const derivativeChanges = DERIVATIVE_FILE_NAMES.map((fileName, index) => ({
    fileName,
    changed: derivativesBeforeRun[index] !== derivativesAfterRun[index],
  }));
  for (const { fileName, changed } of derivativeChanges) {
    dependencies.log(`${fileName}: ${changed ? 'changed' : 'unchanged'}`);
  }
  return { exitCode: 0, derivativeChanges };
}

function readDerivatives(dependencies: OparlSyncDependencies): Promise<(string | null)[]> {
  return Promise.all(DERIVATIVE_FILE_NAMES.map((fileName) => dependencies.readDerivative(fileName)));
}

function planSteps(options: OparlSyncOptions, currentYear: number, snapshotExists: boolean): OparlSyncStep[] {
  const { dryRun, ratsinfoDir, papersDir, dataDir, outputDir } = options;
  const years = options.years ?? [currentYear - 1, currentYear];
  const fetchSnapshotSteps: OparlSyncStep[] = snapshotExists
    ? []
    : [{ script: 'fetch-oparl', args: ['-d', ratsinfoDir] }];
  const snapshotPushArgs = dryRun ? [] : ['--push'];
  const paperAssetsPushArgs = dryRun ? ['--push', '--dry-run'] : ['--push'];
  // Derivates written in a dry run would point at papers whose assets are not published yet.
  const derivativesSteps: OparlSyncStep[] = dryRun
    ? []
    : [{ script: 'generate-oparl-derivatives', args: ['-o', ratsinfoDir, '-d', dataDir] }];
  return [
    ...fetchSnapshotSteps,
    { script: 'scrape-oparl', args: ['-m', 'incremental', '-r', ratsinfoDir, ...snapshotPushArgs] },
    ...years.map((year): OparlSyncStep => ({
      script: 'download-paper-files',
      args: ['-r', ratsinfoDir, '-p', path.join(papersDir, String(year)), '-y', String(year)],
    })),
    {
      script: 'generate-paper-assets',
      args: ['-r', ratsinfoDir, '-p', papersDir, '-d', dataDir, '-o', outputDir, ...paperAssetsPushArgs],
    },
    ...derivativesSteps,
  ];
}
