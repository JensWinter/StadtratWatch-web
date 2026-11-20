import { describe, expect, it } from 'bun:test';

import { type OparlSyncOptions, type OparlSyncStep, runOparlSync, type SyncScript } from './oparl-sync.ts';

const OPTIONS: OparlSyncOptions = {
  dryRun: false,
  years: undefined,
  ratsinfoDir: 'data/oparl-magdeburg/',
  papersDir: 'output/papers/',
  dataDir: 'data/',
  outputDir: 'output/paper-assets/',
};

type DerivativeFiles = Record<string, string>;

type FakeEnvironment = {
  snapshotExists?: boolean;
  failingScript?: SyncScript;
  derivativesBeforeRun?: DerivativeFiles;
  derivativesWrittenByRun?: DerivativeFiles;
};

function fakeDependencies({
  snapshotExists = true,
  failingScript,
  derivativesBeforeRun = {},
  derivativesWrittenByRun = {},
}: FakeEnvironment = {}) {
  const steps: OparlSyncStep[] = [];
  const derivativeFiles: DerivativeFiles = { ...derivativesBeforeRun };
  return {
    steps,
    dependencies: {
      currentYear: 2026,
      snapshotExists: () => Promise.resolve(snapshotExists),
      runStep: (step: OparlSyncStep) => {
        steps.push(step);
        if (step.script === failingScript) return Promise.resolve(1);
        if (step.script === 'generate-oparl-derivatives') Object.assign(derivativeFiles, derivativesWrittenByRun);
        return Promise.resolve(0);
      },
      readDerivative: (fileName: string) => Promise.resolve(derivativeFiles[fileName] ?? null),
      log: () => {},
    },
  };
}

describe('runOparlSync', () => {
  it('publishes snapshot and paper assets before it writes the derivates', async () => {
    const { steps, dependencies } = fakeDependencies();

    const result = await runOparlSync(OPTIONS, dependencies);

    expect(result.exitCode).toEqual(0);
    expect(steps).toEqual([
      { script: 'scrape-oparl', args: ['-m', 'incremental', '-r', 'data/oparl-magdeburg/', '--push'] },
      {
        script: 'download-paper-files',
        args: ['-r', 'data/oparl-magdeburg/', '-p', 'output/papers/2025', '-y', '2025'],
      },
      {
        script: 'download-paper-files',
        args: ['-r', 'data/oparl-magdeburg/', '-p', 'output/papers/2026', '-y', '2026'],
      },
      {
        script: 'generate-paper-assets',
        args: [
          '-r',
          'data/oparl-magdeburg/',
          '-p',
          'output/papers/',
          '-d',
          'data/',
          '-o',
          'output/paper-assets/',
          '--push',
        ],
      },
      { script: 'generate-oparl-derivatives', args: ['-o', 'data/oparl-magdeburg/', '-d', 'data/'] },
    ]);
  });

  it('mirrors the published snapshot first when there is no local snapshot', async () => {
    const { steps, dependencies } = fakeDependencies({ snapshotExists: false });

    await runOparlSync(OPTIONS, dependencies);

    expect(steps[0]).toEqual({ script: 'fetch-oparl', args: ['-d', 'data/oparl-magdeburg/'] });
    expect(steps[1]?.script).toEqual('scrape-oparl');
  });

  it('stops at the first failed step and writes no derivates after a failed asset push', async () => {
    const { steps, dependencies } = fakeDependencies({ failingScript: 'generate-paper-assets' });

    const result = await runOparlSync(OPTIONS, dependencies);

    expect(result.exitCode).not.toEqual(0);
    expect(steps.at(-1)?.script).toEqual('generate-paper-assets');
    expect(steps.map((step) => step.script)).not.toContain('generate-oparl-derivatives');
  });

  it('stops right after a failed scrape', async () => {
    const { steps, dependencies } = fakeDependencies({ failingScript: 'scrape-oparl' });

    const result = await runOparlSync(OPTIONS, dependencies);

    expect(result.exitCode).not.toEqual(0);
    expect(steps.map((step) => step.script)).toEqual(['scrape-oparl']);
  });

  it('downloads the PDFs of the given years instead of the default ones', async () => {
    const { steps, dependencies } = fakeDependencies();

    await runOparlSync({ ...OPTIONS, years: [2019, 2021] }, dependencies);

    const downloads = steps.filter((step) => step.script === 'download-paper-files');
    expect(downloads.map((step) => step.args)).toEqual([
      ['-r', 'data/oparl-magdeburg/', '-p', 'output/papers/2019', '-y', '2019'],
      ['-r', 'data/oparl-magdeburg/', '-p', 'output/papers/2021', '-y', '2021'],
    ]);
  });

  it('in a dry run publishes nothing, shows the paper-assets diff and writes no derivates', async () => {
    const { steps, dependencies } = fakeDependencies();

    const result = await runOparlSync({ ...OPTIONS, dryRun: true }, dependencies);

    expect(result.exitCode).toEqual(0);
    expect(steps.map((step) => step.script)).toEqual([
      'scrape-oparl',
      'download-paper-files',
      'download-paper-files',
      'generate-paper-assets',
    ]);
    expect(steps[0]?.args).not.toContain('--push');
    expect(steps[3]?.args).toEqual([
      '-r',
      'data/oparl-magdeburg/',
      '-p',
      'output/papers/',
      '-d',
      'data/',
      '-o',
      'output/paper-assets/',
      '--push',
      '--dry-run',
    ]);
  });

  it('reports which derivates the run changed', async () => {
    const { dependencies } = fakeDependencies({
      derivativesBeforeRun: { 'paper-index.json': '{"old":1}', 'paper-reference-map.json': '{"same":1}' },
      derivativesWrittenByRun: { 'paper-index.json': '{"new":1}', 'paper-reference-map.json': '{"same":1}' },
    });

    const result = await runOparlSync(OPTIONS, dependencies);

    expect(result.derivativeChanges).toEqual([
      { fileName: 'paper-index.json', changed: true },
      { fileName: 'paper-reference-map.json', changed: false },
    ]);
  });

  it('counts a derivate that did not exist before as changed', async () => {
    const { dependencies } = fakeDependencies({
      derivativesWrittenByRun: { 'paper-index.json': '{}', 'paper-reference-map.json': '{}' },
    });

    const result = await runOparlSync(OPTIONS, dependencies);

    expect(result.derivativeChanges?.every((change) => change.changed)).toEqual(true);
  });

  it('reports no derivate changes when it wrote no derivates', async () => {
    const { dependencies } = fakeDependencies();

    const result = await runOparlSync({ ...OPTIONS, dryRun: true }, dependencies);

    expect(result.derivativeChanges).toBeUndefined();
  });
});
