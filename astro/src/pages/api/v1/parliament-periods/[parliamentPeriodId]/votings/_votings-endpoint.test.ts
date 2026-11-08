import { getEntry } from 'astro:content';
import { describe, expect, test, vi } from 'vitest';
import type { Registry, RegistrySession } from '@models/registry';
import type { SessionScanItem, SessionScanVote } from '@models/session-scan';
import type { VoteCode } from '@models/Session';
import { GET } from './[sessionId].json.ts';

vi.mock('astro:content', () => ({
  getEntry: vi.fn(),
}));

const session: RegistrySession = {
  id: '2026-08-27',
  date: '2026-08-27',
  title: 'Sitzung',
  youtubeUrl: 'https://www.youtube.com/watch?v=abc',
  meetingMinutesUrl: null,
  approved: true,
};

const parliamentPeriod: Registry = {
  id: 'magdeburg-8',
  name: 'Magdeburg 8',
  lastUpdate: '2026-08-27',
  sessions: [session],
  factions: [{ id: 'council', name: 'Stadtrat', seats: 57 }],
  parties: [],
  persons: [
    {
      id: 'person-1',
      name: 'Max Mustermann',
      factionId: 'council',
      partyId: 'party',
      start: null,
      end: null,
    },
  ],
};

function createVotes(counts: {
  yes: number;
  no: number;
  abstain: number;
}): SessionScanVote[] {
  const votesOf = (count: number, vote: VoteCode) =>
    Array.from({ length: count }, (_, index) => ({
      name: `${vote}-${index}`,
      vote,
    }));
  return [
    ...votesOf(counts.yes, 'J'),
    ...votesOf(counts.no, 'N'),
    ...votesOf(counts.abstain, 'E'),
  ];
}

function createVoting(
  votes: SessionScanVote[],
  majorityFields: Pick<
    SessionScanItem,
    'majorityRequirement' | 'presentMembers'
  > = {},
): SessionScanItem {
  return {
    votingFilename: '2026-08-27-003.png',
    videoTimestamp: '0:12:34',
    votingSubject: {
      agendaItem: '2.1',
      motionId: 'A0001/26',
      title: 'Stadtschreiberstipendium für 2027 umsetzen',
      type: 'Tagesordnung',
      authors: [],
    },
    votes,
    ...majorityFields,
  };
}

async function getVotingsResponseData(
  sessionScan: SessionScanItem[],
): Promise<Record<string, unknown>[]> {
  vi.mocked(getEntry).mockResolvedValue({ data: sessionScan } as never);
  const response = await GET({
    params: { parliamentPeriodId: parliamentPeriod.id, sessionId: session.id },
    props: { parliamentPeriod, session },
  });
  const body = await response.json();
  return body.data;
}

describe('votings endpoint majority fields', () => {
  test('defaults to the simple majority without a recorded requirement', async () => {
    const [voting] = await getVotingsResponseData([
      createVoting(createVotes({ yes: 2, no: 1, abstain: 4 })),
    ]);

    expect(voting).toMatchObject({
      majorityRequirement: 'simple',
      presentMembers: null,
      result: 'accepted',
    });
  });

  test('rejects 29:16:0 that misses two thirds of 46 present members', async () => {
    const [voting] = await getVotingsResponseData([
      createVoting(createVotes({ yes: 29, no: 16, abstain: 0 }), {
        majorityRequirement: 'two-thirds-of-present',
        presentMembers: 46,
      }),
    ]);

    expect(voting).toMatchObject({
      majorityRequirement: 'two-thirds-of-present',
      presentMembers: 46,
      result: 'rejected',
    });
  });

  test('keeps the existing fields of a voting unchanged', async () => {
    const [voting] = await getVotingsResponseData([
      createVoting([{ name: 'Max Mustermann', vote: 'N' }]),
    ]);

    expect(voting).toMatchObject({
      id: 3,
      videoTimestamp: 754,
      votingSubject: {
        agendaItem: '2.1',
        motionId: 'A0001/26',
        title: 'Stadtschreiberstipendium für 2027 umsetzen',
        type: 'Tagesordnung',
        authors: [],
      },
      votes: [{ personId: 'person-1', vote: 'no' }],
    });
  });
});
