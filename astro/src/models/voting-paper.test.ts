import { describe, expect, test } from 'vitest';
import { createVotingPaperResolver } from './voting-paper.ts';
import type { PaperReferenceMap } from './oparl-derivatives.ts';

const MAIN_MOTION_ID = 240337;
const AMENDMENT_ID = 240946;

const paperReferenceMap: PaperReferenceMap = {
  'DS0059/23': MAIN_MOTION_ID,
  'DS0059/23/1': AMENDMENT_ID,
};

const resolveVotingPaperId = createVotingPaperResolver(paperReferenceMap);

describe('resolving the paper of a voting', () => {
  test('follows the Drucksachennummer, whatever the agenda item', () => {
    const paperId = resolveVotingPaperId({ motionId: 'DS0059/23/1' });

    expect(paperId).toBe(AMENDMENT_ID);
  });

  test('ignores whitespace in the Drucksachennummer of the scan', () => {
    const paperId = resolveVotingPaperId({ motionId: ' DS0059/23 /1 ' });

    expect(paperId).toBe(AMENDMENT_ID);
  });

  test('ignores whitespace in the Drucksachennummer from OParl', () => {
    const resolveWithSpacedReference = createVotingPaperResolver({
      'A0249/25 /1': AMENDMENT_ID,
    });

    const paperId = resolveWithSpacedReference({ motionId: 'A0249/25/1' });

    expect(paperId).toBe(AMENDMENT_ID);
  });

  test('finds no paper when the Drucksachennummer is not in OParl', () => {
    const paperId = resolveVotingPaperId({ motionId: '0S0059/23' });

    expect(paperId).toBeNull();
  });

  test('finds no paper when the voting has no Drucksachennummer', () => {
    const paperId = resolveVotingPaperId({ motionId: '' });

    expect(paperId).toBeNull();
  });
});
