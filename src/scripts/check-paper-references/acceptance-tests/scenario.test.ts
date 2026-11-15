import { describe, expect, it } from 'bun:test';

import type { PaperReferenceMap } from '@srw-astro/models/oparl-derivatives';
import type { SessionScanItem } from '@srw-astro/models/session-scan';

import type { CheckInputStore, SessionScansByDate } from '../data-store.ts';
import { PaperReferenceChecker } from '../paper-reference-checker.ts';

class MockCheckInputStore implements CheckInputStore {
  constructor(
    private readonly paperReferenceMap: PaperReferenceMap,
    private readonly sessionScansByDate: SessionScansByDate,
  ) {}

  loadPaperReferenceMap = (): Promise<PaperReferenceMap> => Promise.resolve(this.paperReferenceMap);

  loadSessionScansByDate = (): Promise<SessionScansByDate> => Promise.resolve(this.sessionScansByDate);
}

describe('PaperReferenceChecker', () => {
  it('reports a voting whose Drucksachennummer is not in OParl', async () => {
    const store = new MockCheckInputStore(
      { 'DS0023/23': 240159, 'DS0059/23/1': 240946 },
      { '2023-04-20': [voting('5.10', 'DS0059/23/1'), voting('5.23', '0S0023/23')] },
    );

    const unknownReferences = await new PaperReferenceChecker(store).check();

    expect(unknownReferences).toEqual([{ sessionDate: '2023-04-20', agendaItem: '5.23', motionId: '0S0023/23' }]);
  });

  it('does not report a voting without a Drucksachennummer', async () => {
    const store = new MockCheckInputStore({}, { '2026-05-21': [voting('2', ''), voting('2', ' ')] });

    const unknownReferences = await new PaperReferenceChecker(store).check();

    expect(unknownReferences).toEqual([]);
  });

  it('reports a Drucksachennummer that differs from OParl only in whitespace', async () => {
    const store = new MockCheckInputStore(
      { 'DS0286/25': 246000, 'A0024/25 /1': 245735 },
      { '2025-06-19': [voting('2.1', ' DS0286/25'), voting('5.5.1', 'A0024/25/1'), voting('5.5.1', 'A0024/25 /1')] },
    );

    const unknownReferences = await new PaperReferenceChecker(store).check();

    expect(unknownReferences).toEqual([
      { sessionDate: '2025-06-19', agendaItem: '2.1', motionId: ' DS0286/25' },
      { sessionDate: '2025-06-19', agendaItem: '5.5.1', motionId: 'A0024/25/1' },
    ]);
  });

  it('checks only the given session', async () => {
    const store = new MockCheckInputStore(
      {},
      { '2023-04-20': [voting('5.23', '0S0023/23')], '2024-04-04': [voting('5.7', '050577/23')] },
    );

    const unknownReferences = await new PaperReferenceChecker(store).check('2024-04-04');

    expect(unknownReferences).toEqual([{ sessionDate: '2024-04-04', agendaItem: '5.7', motionId: '050577/23' }]);
  });

  it('fails for a session without a scan', async () => {
    const store = new MockCheckInputStore({}, { '2023-04-20': [voting('5.23', '0S0023/23')] });

    await expect(new PaperReferenceChecker(store).check('2023-04-02')).rejects.toThrow('2023-04-02');
  });
});

function voting(agendaItem: string, motionId: string): SessionScanItem {
  return {
    votingFilename: `${agendaItem}.png`,
    videoTimestamp: '00:00:00',
    votingSubject: { agendaItem, motionId, title: 'Titel', type: null, authors: [] },
    votes: [],
  };
}
