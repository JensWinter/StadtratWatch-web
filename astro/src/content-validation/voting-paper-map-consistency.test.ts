import { assert, describe, expect, test } from 'vitest';
import {
  assertVotingPaperMapConsistency,
  collectVotingPaperMapInconsistencies,
  type PeriodConsistencyInput,
} from './voting-paper-map-consistency.ts';

describe('collectVotingPaperMapInconsistencies', () => {
  test('returns no inconsistencies when every map session exists in the registry', () => {
    const periods: PeriodConsistencyInput[] = [
      {
        periodId: 'magdeburg-7',
        registrySessionDates: ['2022-09-01', '2022-10-06'],
        votingPaperMapSessionKeys: ['2022-09-01'],
      },
    ];

    assert.deepEqual(collectVotingPaperMapInconsistencies(periods), []);
  });

  test('allows registry sessions that are absent from the map (forward direction only)', () => {
    const periods: PeriodConsistencyInput[] = [
      {
        periodId: 'magdeburg-7',
        registrySessionDates: ['2022-09-01', '2022-10-06'],
        votingPaperMapSessionKeys: [],
      },
    ];

    assert.deepEqual(collectVotingPaperMapInconsistencies(periods), []);
  });

  test('reports a map session that is missing from the registry', () => {
    const periods: PeriodConsistencyInput[] = [
      {
        periodId: 'magdeburg-7',
        registrySessionDates: ['2022-09-01'],
        votingPaperMapSessionKeys: ['2022-09-01', '2099-01-01'],
      },
    ];

    const inconsistencies = collectVotingPaperMapInconsistencies(periods);

    assert.deepEqual(inconsistencies, [
      'Session 2099-01-01 in voting-paper-map is missing from registry of period magdeburg-7',
    ]);
  });

  test('collects all inconsistencies across periods instead of stopping at the first', () => {
    const periods: PeriodConsistencyInput[] = [
      {
        periodId: 'magdeburg-7',
        registrySessionDates: ['2022-09-01'],
        votingPaperMapSessionKeys: ['2099-01-01'],
      },
      {
        periodId: 'magdeburg-8',
        registrySessionDates: ['2024-08-01'],
        votingPaperMapSessionKeys: ['2099-02-02'],
      },
    ];

    assert.lengthOf(collectVotingPaperMapInconsistencies(periods), 2);
  });
});

describe('assertVotingPaperMapConsistency', () => {
  test('does not throw when everything is consistent', () => {
    const periods: PeriodConsistencyInput[] = [
      {
        periodId: 'magdeburg-7',
        registrySessionDates: ['2022-09-01'],
        votingPaperMapSessionKeys: ['2022-09-01'],
      },
    ];

    expect(() => assertVotingPaperMapConsistency(periods)).not.toThrow();
  });

  test('fails fast with a bundled message listing every inconsistency', () => {
    const periods: PeriodConsistencyInput[] = [
      {
        periodId: 'magdeburg-7',
        registrySessionDates: ['2022-09-01'],
        votingPaperMapSessionKeys: ['2099-01-01'],
      },
      {
        periodId: 'magdeburg-8',
        registrySessionDates: ['2024-08-01'],
        votingPaperMapSessionKeys: ['2099-02-02'],
      },
    ];

    expect(() => assertVotingPaperMapConsistency(periods)).toThrow(
      /2 issue\(s\)[\s\S]*2099-01-01[\s\S]*2099-02-02/,
    );
  });
});
