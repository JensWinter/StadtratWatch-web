import { describe, expect, test } from 'vitest';
import { resolveVotingPaperId } from './voting-paper.ts';
import type { PaperReferenceMap, VotingPaperMap } from './oparl-derivatives.ts';

const SESSION_DATE = '2023-04-20';

const MAIN_MOTION_ID = 240337;
const AMENDMENT_ID = 240946;
const PAPER_FROM_OTHER_SESSION_ID = 239999;

const votingPaperMap: VotingPaperMap = {
  [SESSION_DATE]: {
    '5.10': MAIN_MOTION_ID,
    '5.10.1': AMENDMENT_ID,
  },
};

const paperReferenceMap: PaperReferenceMap = {
  'DS0059/23': MAIN_MOTION_ID,
  'DS0059/23/1': AMENDMENT_ID,
  'A0186/22': PAPER_FROM_OTHER_SESSION_ID,
};

const derivates = { votingPaperMap, paperReferenceMap };

describe('resolveVotingPaperId', () => {
  test('follows the Drucksachennummer when that paper is on the agenda of the session', () => {
    const paperId = resolveVotingPaperId(derivates, SESSION_DATE, {
      agendaItem: '5.10',
      motionId: 'DS0059/23/1',
    });

    expect(paperId).toBe(AMENDMENT_ID);
  });

  test('follows the agenda item when the paper with the Drucksachennummer is not on the agenda of the session', () => {
    const paperId = resolveVotingPaperId(derivates, SESSION_DATE, {
      agendaItem: '5.10',
      motionId: 'A0186/22',
    });

    expect(paperId).toBe(MAIN_MOTION_ID);
  });

  test('follows the agenda item when the Drucksachennummer is not in OParl', () => {
    const paperId = resolveVotingPaperId(derivates, SESSION_DATE, {
      agendaItem: '5.10',
      motionId: 'DS0059/32',
    });

    expect(paperId).toBe(MAIN_MOTION_ID);
  });

  test('finds no paper when neither the agenda item nor the Drucksachennummer has one', () => {
    const paperId = resolveVotingPaperId(derivates, SESSION_DATE, {
      agendaItem: '2.1',
      motionId: '',
    });

    expect(paperId).toBeNull();
  });

  test('follows the Drucksachennummer when the agenda item has no paper', () => {
    const paperId = resolveVotingPaperId(derivates, SESSION_DATE, {
      agendaItem: '2.1',
      motionId: 'A0186/22',
    });

    expect(paperId).toBe(PAPER_FROM_OTHER_SESSION_ID);
  });

  test('ignores whitespace around the Drucksachennummer', () => {
    const paperId = resolveVotingPaperId(derivates, SESSION_DATE, {
      agendaItem: '5.10',
      motionId: ' DS0059/23/1 ',
    });

    expect(paperId).toBe(AMENDMENT_ID);
  });
});
