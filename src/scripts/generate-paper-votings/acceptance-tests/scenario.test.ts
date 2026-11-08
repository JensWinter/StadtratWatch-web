import { describe, expect, it } from 'bun:test';

import type { PaperVotingsDto } from '@srw-astro/models/paper-votings';
import type { Registry, RegistryFaction, RegistryPerson } from '@srw-astro/models/registry';
import type { VoteCode } from '@srw-astro/models/session';
import type { SessionScan, SessionScanItem, SessionScanVote } from '@srw-astro/models/session-scan';

import type { PaperVotingsAssetDto } from '../model.ts';
import { PaperVotingsGenerator } from '../paper-votings-generator.ts';
import type { PaperVotingsWriter } from '../paper-votings-writer.ts';
import type { PeriodData, PeriodDataStore } from '../period-data-store.ts';

const PERIOD_7 = 'example-7';
const PERIOD_8 = 'example-8';

// Mirrors the live 239123 case: the same paper voted on in both parliament periods.
const CROSS_PERIOD_PAPER = 239123;
// Mirrors the live 243686 case: two scans for one agenda item in one session.
const MULTI_SCAN_PAPER = 243686;
const LOW_ID_PAPER = 42;

class MockPeriodDataStore implements PeriodDataStore {
  constructor(private readonly periods: PeriodData[]) {}

  loadPeriods = (): Promise<PeriodData[]> => Promise.resolve(this.periods);
}

class MockPaperVotingsWriter implements PaperVotingsWriter {
  assets: PaperVotingsAssetDto[] = [];

  writePaperVotings(assets: PaperVotingsAssetDto[]): Promise<void> {
    this.assets = assets;
    return Promise.resolve();
  }
}

describe('Generating paper votings', () => {
  let writer: MockPaperVotingsWriter;
  let generator: PaperVotingsGenerator;

  it('omits agenda items that are mapped to a paper but were never scanned', async () => {
    givenPeriods([
      period(PERIOD_8, {
        votingPaperMap: { '2024-07-08': { '1.1': 111 } },
        sessionScansByDate: { '2024-07-08': [] },
      }),
    ]);

    await runGeneration();

    expect(writer.assets).toEqual([]);
  });

  it('omits scanned agenda items that are not mapped to any paper', async () => {
    givenPeriods([
      period(PERIOD_8, {
        votingPaperMap: {},
        sessionScansByDate: { '2024-07-08': [scan('2024-07-08-001.png', '1.1')] },
      }),
    ]);

    await runGeneration();

    expect(writer.assets).toEqual([]);
  });

  it('keeps every scan of the same agenda item as its own voting', async () => {
    givenPeriods([
      period(PERIOD_8, {
        votingPaperMap: { '2024-07-08': { '12.6': MULTI_SCAN_PAPER } },
        sessionScansByDate: {
          '2024-07-08': [scan('2024-07-08-012.png', '12.6'), scan('2024-07-08-014.png', '12.6')],
        },
      }),
    ]);

    await runGeneration();

    expect(votingsOf(MULTI_SCAN_PAPER).map((voting) => voting.votingId)).toEqual([12, 14]);
  });

  it('merges votings of one paper across parliament periods, each against its own registry', async () => {
    givenPeriods([
      period(PERIOD_7, {
        votingPaperMap: { '2022-09-01': { '6.29': CROSS_PERIOD_PAPER } },
        sessionScansByDate: {
          '2022-09-01': [scan('2022-09-01-003.png', '6.29', [vote('Old Councillor', 'J')])],
        },
        factions: [faction('old-faction', 'Old Faction', 5)],
        persons: [person('Old Councillor', 'old-faction')],
      }),
      period(PERIOD_8, {
        votingPaperMap: { '2024-10-17': { '7.1': CROSS_PERIOD_PAPER } },
        sessionScansByDate: {
          '2024-10-17': [scan('2024-10-17-005.png', '7.1', [vote('New Councillor', 'J')])],
        },
        factions: [faction('new-faction', 'New Faction', 7)],
        persons: [person('New Councillor', 'new-faction')],
      }),
    ]);

    await runGeneration();

    expect(votingsOf(CROSS_PERIOD_PAPER).map((voting) => [voting.parliamentPeriodId, voting.sessionId])).toEqual([
      [PERIOD_8, '2024-10-17'],
      [PERIOD_7, '2022-09-01'],
    ]);
    expect(votingsOf(CROSS_PERIOD_PAPER)[0].votesByFactions).toEqual([
      {
        factionId: 'new-faction',
        factionName: 'New Faction',
        orderIndex: 0,
        votes: [{ personName: 'New Councillor', vote: 'J' }],
      },
    ]);
    expect(votingsOf(CROSS_PERIOD_PAPER)[1].votesByFactions).toEqual([
      {
        factionId: 'old-faction',
        factionName: 'Old Faction',
        orderIndex: 0,
        votes: [{ personName: 'Old Councillor', vote: 'J' }],
      },
    ]);
  });

  it('counts votes per vote code', async () => {
    givenPeriods([
      period(PERIOD_8, {
        votingPaperMap: { '2024-07-08': { '1.1': 111 } },
        sessionScansByDate: {
          '2024-07-08': [
            scan('2024-07-08-001.png', '1.1', [
              vote('Supporter', 'J'),
              vote('Opposer', 'N'),
              vote('Abstainer', 'E'),
              vote('Absentee', 'O'),
            ]),
          ],
        },
        persons: [
          person('Supporter', 'faction-1'),
          person('Opposer', 'faction-1'),
          person('Abstainer', 'faction-1'),
          person('Absentee', 'faction-1'),
        ],
      }),
    ]);

    await runGeneration();

    expect(votingsOf(111)[0].counts).toEqual({ J: 1, N: 1, E: 1, O: 1 });
  });

  it('accepts a voting with more yes than no votes', async () => {
    givenPeriods([periodWithVotes([vote('Supporter', 'J'), vote('Opposer', 'N'), vote('Abstainer', 'J')])]);

    await runGeneration();

    expect(votingsOf(111)[0].accepted).toBe(true);
  });

  it('rejects a voting without a yes majority', async () => {
    givenPeriods([periodWithVotes([vote('Supporter', 'J'), vote('Opposer', 'N')])]);

    await runGeneration();

    expect(votingsOf(111)[0].accepted).toBe(false);
  });

  it('marks a voting without a scanned majority requirement as simple majority', async () => {
    givenPeriods([periodWithVotes([vote('Supporter', 'J')])]);

    await runGeneration();

    expect(votingsOf(111)[0].majorityRequirement).toEqual('simple');
  });

  it('rejects a voting with more yes than no votes that misses a two-thirds majority of present members', async () => {
    const votingOfFourPresentMembers = {
      ...scan('2024-07-08-001.png', '1.1', [
        vote('Supporter', 'J'),
        vote('Second Supporter', 'J'),
        vote('Opposer', 'N'),
      ]),
      majorityRequirement: 'two-thirds-of-present',
      presentMembers: 4,
    } satisfies SessionScanItem;
    givenPeriods([
      period(PERIOD_8, {
        votingPaperMap: { '2024-07-08': { '1.1': 111 } },
        sessionScansByDate: { '2024-07-08': [votingOfFourPresentMembers] },
        persons: [
          person('Supporter', 'faction-1'),
          person('Second Supporter', 'faction-1'),
          person('Opposer', 'faction-1'),
        ],
      }),
    ]);

    await runGeneration();

    expect(votingsOf(111)[0].majorityRequirement).toEqual('two-thirds-of-present');
    expect(votingsOf(111)[0].accepted).toBe(false);
  });

  it('carries the scanned subject through to the asset', async () => {
    givenPeriods([
      period(PERIOD_8, {
        votingPaperMap: { '2024-07-08': { '12.6': MULTI_SCAN_PAPER } },
        sessionScansByDate: { '2024-07-08': [scan('2024-07-08-012.png', '12.6')] },
      }),
    ]);

    await runGeneration();

    const voting = votingsOf(MULTI_SCAN_PAPER)[0];
    expect(voting.agendaItem).toEqual('12.6');
    expect(voting.title).toEqual('Subject 12.6');
    expect(voting.type).toEqual('Antrag');
    expect(voting.date).toEqual('2024-07-08');
  });

  it('sorts votings by session date descending, then by voting id ascending', async () => {
    givenPeriods([
      period(PERIOD_8, {
        votingPaperMap: {
          '2024-07-08': { '1.1': 111 },
          '2024-10-17': { '2.1': 111 },
        },
        sessionScansByDate: {
          '2024-07-08': [scan('2024-07-08-014.png', '1.1'), scan('2024-07-08-002.png', '1.1')],
          '2024-10-17': [scan('2024-10-17-009.png', '2.1')],
        },
      }),
    ]);

    await runGeneration();

    expect(votingsOf(111).map((voting) => [voting.date, voting.votingId])).toEqual([
      ['2024-10-17', 9],
      ['2024-07-08', 2],
      ['2024-07-08', 14],
    ]);
  });

  it('groups papers into batches of hundred, padded to four digits', async () => {
    givenPeriods([
      period(PERIOD_8, {
        votingPaperMap: { '2024-07-08': { '1.1': LOW_ID_PAPER, '2.2': CROSS_PERIOD_PAPER } },
        sessionScansByDate: {
          '2024-07-08': [scan('2024-07-08-001.png', '1.1'), scan('2024-07-08-002.png', '2.2')],
        },
      }),
    ]);

    await runGeneration();

    expect(writer.assets.map((asset) => asset.batchNo)).toEqual(['0000', '2391']);
    expect(writer.assets[0].paperVotings.map((entry) => entry.paperId)).toEqual([LOW_ID_PAPER]);
    expect(writer.assets[1].paperVotings.map((entry) => entry.paperId)).toEqual([CROSS_PERIOD_PAPER]);
  });

  it('fails when a vote references a person outside the period registry', async () => {
    givenPeriods([periodWithVotes([vote('Ghost', 'J')])]);

    await expect(runGeneration()).rejects.toThrow('Person Ghost not found');
  });

  function givenPeriods(periods: PeriodData[]) {
    writer = new MockPaperVotingsWriter();
    generator = new PaperVotingsGenerator(new MockPeriodDataStore(periods), writer);
  }

  async function runGeneration() {
    await generator.generatePaperVotings();
  }

  function votingsOf(paperId: number) {
    const entries = writer.assets.flatMap((asset) => asset.paperVotings);
    const entry = entries.find((candidate: PaperVotingsDto) => candidate.paperId === paperId);
    if (!entry) {
      throw new Error(`No paper votings generated for paper ${paperId}`);
    }
    return entry.votings;
  }
});

function periodWithVotes(votes: SessionScanVote[]): PeriodData {
  return period(PERIOD_8, {
    votingPaperMap: { '2024-07-08': { '1.1': 111 } },
    sessionScansByDate: { '2024-07-08': [scan('2024-07-08-001.png', '1.1', votes)] },
  });
}

function period(
  periodId: string,
  options: {
    votingPaperMap: PeriodData['votingPaperMap'];
    sessionScansByDate: { [sessionDate: string]: SessionScan };
    factions?: RegistryFaction[];
    persons?: RegistryPerson[];
  },
): PeriodData {
  const factions = options.factions ?? [faction('faction-1', 'Faction 1', 10)];
  const persons = options.persons ?? [
    person('Supporter', 'faction-1'),
    person('Opposer', 'faction-1'),
    person('Abstainer', 'faction-1'),
    person('Absentee', 'faction-1'),
  ];

  return {
    registry: {
      id: periodId,
      name: `Period ${periodId}`,
      lastUpdate: '2024-10-01',
      sessions: Object.keys(options.sessionScansByDate).map((date) => ({
        id: date,
        date,
        title: `Session ${date}`,
        youtubeUrl: '',
        meetingMinutesUrl: null,
        approved: true,
      })),
      factions,
      parties: [],
      persons,
    } satisfies Registry,
    votingPaperMap: options.votingPaperMap,
    sessionScansByDate: options.sessionScansByDate,
  };
}

function scan(votingFilename: string, agendaItem: string, votes: SessionScanVote[] = []): SessionScanItem {
  return {
    votingFilename,
    videoTimestamp: '00:10:00',
    votingSubject: {
      agendaItem,
      motionId: 'M1',
      title: `Subject ${agendaItem}`,
      type: 'Antrag',
      authors: [],
    },
    votes,
  };
}

function vote(name: string, voteCode: VoteCode): SessionScanVote {
  return { name, vote: voteCode };
}

function faction(id: string, name: string, seats: number): RegistryFaction {
  return { id, name, seats };
}

function person(name: string, factionId: string): RegistryPerson {
  return { id: name.toLowerCase().replace(' ', '-'), name, factionId, partyId: 'party-1', start: null, end: null };
}
