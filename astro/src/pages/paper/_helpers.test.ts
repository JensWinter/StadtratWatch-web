import { assert, describe, test } from 'vitest';
import {
  getVoteStatusClass,
  selectPaperVotings,
  spansMultipleParliamentPeriods,
  toBatchNo,
  toPaperVotingViews,
} from './_helpers.ts';
import type {
  PaperVotingItem,
  PaperVotingsDto,
} from '@models/paper-votings.ts';
import { VoteResult } from '@models/Session.ts';

function paperVotingItem(
  overrides: Partial<PaperVotingItem> = {},
): PaperVotingItem {
  return {
    parliamentPeriodId: 'magdeburg-8',
    sessionId: '2024-07-08',
    date: '2024-07-08',
    votingId: 12,
    agendaItem: '12.6',
    title: 'Ein Antrag',
    type: 'Antrag',
    accepted: true,
    counts: { J: 30, N: 10, E: 2, O: 5 },
    votesByFactions: [],
    ...overrides,
  };
}

describe('toBatchNo', () => {
  test('groups papers into batches of 100', () => {
    assert.equal(toBatchNo(236011), '2360');
    assert.equal(toBatchNo(236099), '2360');
    assert.equal(toBatchNo(236100), '2361');
  });

  test('pads batch numbers to four digits', () => {
    assert.equal(toBatchNo(0), '0000');
    assert.equal(toBatchNo(4711), '0047');
  });
});

describe('selectPaperVotings', () => {
  test('returns the votings of the matching paper', () => {
    const votings = [paperVotingItem()];
    const batch: PaperVotingsDto[] = [
      { paperId: 236010, votings: [paperVotingItem({ votingId: 99 })] },
      { paperId: 236011, votings },
    ];

    assert.deepEqual(selectPaperVotings(batch, 236011), votings);
  });

  test('returns an empty array when the paper has no entry in the batch', () => {
    const batch: PaperVotingsDto[] = [{ paperId: 236010, votings: [] }];
    assert.deepEqual(selectPaperVotings(batch, 236011), []);
  });

  test('returns an empty array for an empty batch', () => {
    assert.deepEqual(selectPaperVotings([], 236011), []);
  });
});

describe('spansMultipleParliamentPeriods', () => {
  test('is false when all votings come from a single parliament period', () => {
    const votings = [
      paperVotingItem({ parliamentPeriodId: 'magdeburg-8' }),
      paperVotingItem({ parliamentPeriodId: 'magdeburg-8', votingId: 13 }),
    ];
    assert.isFalse(spansMultipleParliamentPeriods(votings));
  });

  test('is true when votings span more than one parliament period', () => {
    const votings = [
      paperVotingItem({ parliamentPeriodId: 'magdeburg-7' }),
      paperVotingItem({ parliamentPeriodId: 'magdeburg-8' }),
    ];
    assert.isTrue(spansMultipleParliamentPeriods(votings));
  });

  test('is false when there are no votings', () => {
    assert.isFalse(spansMultipleParliamentPeriods([]));
  });
});

describe('toPaperVotingViews', () => {
  test('adds a localised session date for display', () => {
    const [view] = toPaperVotingViews([
      paperVotingItem({ date: '2024-07-08' }),
    ]);
    assert.equal(view.dateDisplay, '08.07.2024');
  });

  test('labels the period badge with the period number', () => {
    const [view] = toPaperVotingViews([
      paperVotingItem({ parliamentPeriodId: 'magdeburg-8' }),
    ]);
    assert.equal(view.periodBadgeLabel, 'WP 8');
  });

  test('falls back to the raw period id when it carries no period number', () => {
    const [view] = toPaperVotingViews([
      paperVotingItem({ parliamentPeriodId: 'test-period' }),
    ]);
    assert.equal(view.periodBadgeLabel, 'test-period');
  });

  test('preserves the order and payload of the generated votings', () => {
    const votings = [
      paperVotingItem({ votingId: 14 }),
      paperVotingItem({ votingId: 12 }),
    ];
    const views = toPaperVotingViews(votings);

    assert.deepEqual(
      views.map((view) => view.votingId),
      [14, 12],
    );
    assert.equal(views[0].title, votings[0].title);
    assert.deepEqual(views[0].counts, votings[0].counts);
  });
});

describe('getVoteStatusClass', () => {
  test('maps each cast vote to its status colour', () => {
    assert.equal(getVoteStatusClass(VoteResult.VOTE_FOR), 'status-success');
    assert.equal(getVoteStatusClass(VoteResult.VOTE_AGAINST), 'status-error');
    assert.equal(
      getVoteStatusClass(VoteResult.VOTE_ABSTENTION),
      'status-warning',
    );
  });

  // The session page leaves non-votes unmodified, which daisyUI renders as a
  // faint neutral dot; adding status-neutral would make them solid instead.
  test('leaves non-votes unmodified, like the session page does', () => {
    assert.equal(getVoteStatusClass(VoteResult.DID_NOT_VOTE), '');
  });

  test('leaves unknown vote codes unmodified', () => {
    assert.equal(getVoteStatusClass('?'), '');
  });
});
