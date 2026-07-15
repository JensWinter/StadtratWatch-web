import { getStaticPaths as getStaticParliamentPeriodPaths } from '../../[parliamentPeriodId].json.ts';
import { generateMeta } from '../../../_helpers.ts';
import { getEntry } from 'astro:content';
import { getVideoTimestampAsSeconds } from '@utils/session-utils.ts';
import type { Registry, RegistrySession } from '@models/registry.ts';
import { getVotingId } from '@models/voting-breakdown.ts';

export const getStaticPaths = async () => {
  const paths = await getStaticParliamentPeriodPaths();
  return paths.flatMap((path) =>
    path.props.parliamentPeriod.sessions.map((session) => ({
      params: {
        parliamentPeriodId: path.params.parliamentPeriodId,
        sessionId: session.id,
      },
      props: {
        parliamentPeriod: path.props.parliamentPeriod,
        session,
      },
    })),
  );
};

function translateVote(vote: string): string {
  switch (vote) {
    case 'J':
      return 'yes';
    case 'N':
      return 'no';
    case 'E':
      return 'abstain';
    case 'O':
      return 'no_show';
    default:
      return vote;
  }
}

export async function GET({
  params,
  props,
}: {
  params: { parliamentPeriodId: string; sessionId: string };
  props: { parliamentPeriod: Registry; session: RegistrySession };
}) {
  const { parliamentPeriodId, sessionId } = params;

  const sessionScansEntry = await getEntry(
    'sessionScans',
    `${parliamentPeriodId}/${sessionId}`,
  );
  const { data: sessionScans } = sessionScansEntry || {};
  if (!sessionScans) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  const { parliamentPeriod } = props;
  const personsMap = new Map(
    parliamentPeriod.persons.map((person) => [person.name, person]),
  );
  const data = sessionScans.map((scan) => ({
    id: getVotingId(scan),
    videoTimestamp: getVideoTimestampAsSeconds(scan),
    votingSubject: scan.votingSubject,
    votes: scan.votes.map((vote) => ({
      personId: personsMap.get(vote.name)?.id,
      vote: translateVote(vote.vote),
    })),
  }));

  const response = {
    meta: generateMeta(),
    data,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
