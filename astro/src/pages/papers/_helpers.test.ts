import {
  assert,
  describe,
  test,
  beforeAll,
  beforeEach,
  afterAll,
  vi,
} from 'vitest';
import { getRecentMainPapers, getRecentPapersPeriod } from './_helpers.ts';
import type { PaperIndexItem } from '@models/oparl-prepared.ts';

describe('getRecentMainPapers', () => {
  beforeAll(() => vi.useFakeTimers());

  beforeEach(() => vi.setSystemTime(new Date('2024-03-15')));

  afterAll(() => vi.useRealTimers());

  test('returns empty array when no papers are provided', () => {
    const result = getRecentMainPapers([]);
    assert.deepEqual(result, []);
  });

  test('returns RecentPaper objects with all required fields', () => {
    const papers: PaperIndexItem[] = [
      {
        id: 'https://example.com/oparl/papers/12345',
        name: 'Test Paper Title',
        reference: 'A-123/2024',
        paperType: 'Antrag',
        date: '2024-03-10',
      },
    ];

    const result = getRecentMainPapers(papers);

    assert.lengthOf(result, 1);
    const paper = result[0];

    // Check all fields of RecentPaper
    assert.equal(paper.oparlId, 'https://example.com/oparl/papers/12345');
    assert.equal(paper.id, '12345');
    assert.equal(paper.date, '2024-03-10');
    assert.equal(paper.dateDisplay, '10.03.2024');
    assert.equal(paper.type, 'Antrag');
    assert.equal(paper.reference, 'A-123/2024');
    assert.equal(paper.title, 'Test Paper Title');
  });

  test('handles papers with optional fields as undefined', () => {
    const papers: PaperIndexItem[] = [
      {
        id: 'https://example.com/oparl/papers/67890',
        name: 'Paper without optional fields',
        date: '2024-03-05',
        // paperType and reference are undefined
      },
    ];

    const result = getRecentMainPapers(papers);

    assert.lengthOf(result, 1);
    const paper = result[0];

    assert.equal(paper.type, undefined);
    assert.equal(paper.reference, undefined);
    assert.equal(paper.title, 'Paper without optional fields');
  });

  test('includes papers from the last 3 months (starting from first day of month 2 months ago)', () => {
    // Current date: 2024-03-15
    // Three months ago calculation: new Date(2024, 3-2, 1) = 2024-01-01
    const papers: PaperIndexItem[] = [
      { id: 'paper-1', name: 'Recent paper', date: '2024-02-15' },
      {
        id: 'paper-2',
        name: 'Paper on boundary (included)',
        date: '2024-01-01',
      },
      { id: 'paper-3', name: 'Old paper (excluded)', date: '2023-12-31' },
    ];

    const result = getRecentMainPapers(papers);

    assert.lengthOf(result, 2);
    assert.includeMembers(
      result.map((p) => p.id),
      ['paper-1', 'paper-2'],
    );
  });

  test('handles papers at month boundaries correctly', () => {
    // Current date: 2024-03-15
    // Cutoff: 2024-01-01
    const papers: PaperIndexItem[] = [
      { id: 'paper-jan-1', name: 'January 1st (included)', date: '2024-01-01' },
      {
        id: 'paper-dec-31',
        name: 'December 31st (excluded)',
        date: '2023-12-31',
      },
      {
        id: 'paper-feb-29',
        name: 'End of February (included)',
        date: '2024-02-29',
      },
    ];

    const result = getRecentMainPapers(papers);

    assert.lengthOf(result, 2);
    assert.includeMembers(
      result.map((p) => p.id),
      ['paper-jan-1', 'paper-feb-29'],
    );
  });

  test('works correctly when current date is at beginning of month', () => {
    vi.setSystemTime(new Date('2024-03-01'));
    // Three months ago: new Date(2024, 3-2, 1) = 2024-01-01

    const papers: PaperIndexItem[] = [
      { id: 'paper-1', name: 'January paper', date: '2024-01-15' },
      { id: 'paper-2', name: 'December paper', date: '2023-12-15' },
    ];

    const result = getRecentMainPapers(papers);

    assert.lengthOf(result, 1);
    assert.equal(result[0].id, 'paper-1');
  });

  test('works correctly when current date is at end of month', () => {
    vi.setSystemTime(new Date('2024-03-31'));
    // Three months ago: new Date(2024, 3-2, 1) = 2024-01-01

    const papers: PaperIndexItem[] = [
      { id: 'paper-1', name: 'January paper', date: '2024-01-01' },
      { id: 'paper-2', name: 'December paper', date: '2023-12-31' },
    ];

    const result = getRecentMainPapers(papers);

    assert.lengthOf(result, 1);
    assert.equal(result[0].id, 'paper-1');
  });
});

describe('getRecentPapersPeriod', () => {
  beforeAll(() => vi.useFakeTimers());

  afterAll(() => vi.useRealTimers());

  test('returns period from January to March when current date is in March', () => {
    vi.setSystemTime(new Date('2024-03-15'));
    // Current month: März
    // Two months ago: new Date(2024, 3-2, 1) = 2024-01-01 -> Januar

    const result = getRecentPapersPeriod();

    assert.equal(result, 'Januar - März');
  });

  test('returns period from February to April when current date is in April', () => {
    vi.setSystemTime(new Date('2024-04-20'));
    // Current month: April
    // Two months ago: new Date(2024, 4-2, 1) = 2024-02-01 -> Februar

    const result = getRecentPapersPeriod();

    assert.equal(result, 'Februar - April');
  });

  test('returns correct period when at beginning of month', () => {
    vi.setSystemTime(new Date('2024-05-01'));
    // Current month: Mai
    // Two months ago: new Date(2024, 5-2, 1) = 2024-03-01 -> März

    const result = getRecentPapersPeriod();

    assert.equal(result, 'März - Mai');
  });

  test('returns correct period when at end of month', () => {
    vi.setSystemTime(new Date('2024-05-31'));
    // Current month: Mai
    // Two months ago: new Date(2024, 5-2, 1) = 2024-03-01 -> März

    const result = getRecentPapersPeriod();

    assert.equal(result, 'März - Mai');
  });

  test('handles year boundary correctly (January)', () => {
    vi.setSystemTime(new Date('2024-01-15'));
    // Current month: Januar
    // Two months ago: new Date(2024, 1-2, 1) = new Date(2024, -1, 1) = 2023-11-01 -> November

    const result = getRecentPapersPeriod();

    assert.equal(result, 'November - Januar');
  });

  test('handles year boundary correctly (February)', () => {
    vi.setSystemTime(new Date('2024-02-15'));
    // Current month: Februar
    // Two months ago: new Date(2024, 2-2, 1) = 2024-00-01 = 2023-12-01 -> Dezember

    const result = getRecentPapersPeriod();

    assert.equal(result, 'Dezember - Februar');
  });

  test('returns all German month names correctly throughout the year', () => {
    const testCases = [
      { date: '2024-01-15', expected: 'November - Januar' },
      { date: '2024-02-15', expected: 'Dezember - Februar' },
      { date: '2024-03-15', expected: 'Januar - März' },
      { date: '2024-04-15', expected: 'Februar - April' },
      { date: '2024-05-15', expected: 'März - Mai' },
      { date: '2024-06-15', expected: 'April - Juni' },
      { date: '2024-07-15', expected: 'Mai - Juli' },
      { date: '2024-08-15', expected: 'Juni - August' },
      { date: '2024-09-15', expected: 'Juli - September' },
      { date: '2024-10-15', expected: 'August - Oktober' },
      { date: '2024-11-15', expected: 'September - November' },
      { date: '2024-12-15', expected: 'Oktober - Dezember' },
    ];

    testCases.forEach(({ date, expected }) => {
      vi.setSystemTime(new Date(date));
      const result = getRecentPapersPeriod();
      assert.equal(result, expected, `Failed for date ${date}`);
    });
  });

  test('returns consistent result when called multiple times with same date', () => {
    vi.setSystemTime(new Date('2024-06-15'));

    const result1 = getRecentPapersPeriod();
    const result2 = getRecentPapersPeriod();
    const result3 = getRecentPapersPeriod();

    assert.equal(result1, result2);
    assert.equal(result2, result3);
    assert.equal(result1, 'April - Juni');
  });

  test('uses de-DE locale for month formatting', () => {
    vi.setSystemTime(new Date('2024-12-15'));
    // Verify that German month names are used (Dezember, not December)

    const result = getRecentPapersPeriod();

    assert.equal(result, 'Oktober - Dezember');
    assert.include(result, 'Dezember'); // German spelling
    assert.notInclude(result, 'December'); // English spelling
  });
});
