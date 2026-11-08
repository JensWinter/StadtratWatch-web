import type { Registry, RegistryFaction, RegistryPerson } from '@srw-astro/models/registry';
import type { Vote } from '@srw-astro/models/session';
import type { SessionInput } from '@srw-astro/models/session-input';
import { getMajorityRequirement, type SessionScanVote } from '@srw-astro/models/session-scan';
import { votingAccepted } from '@srw-astro/models/voting-breakdown';

import type { Voting, VotingPerFaction } from './model.ts';

function getPersonsOfSession(persons: RegistryPerson[], sessionDate: string): RegistryPerson[] {
  return persons.filter(
    (person) =>
      (person.start === null || person.start <= sessionDate) && (person.end === null || person.end >= sessionDate),
  );
}

function getVotingForFactions(
  votes: Vote[],
  factions: RegistryFaction[],
  persons: RegistryPerson[],
): VotingPerFaction[] {
  return factions.map((faction) => {
    const factionPersons = persons.filter((person) => person.factionId === faction.id);
    const votesFor = votes.filter(
      (vote) => vote.vote === 'J' && factionPersons.some((person) => person.id === vote.personId),
    ).length;
    const votesAgainst = votes.filter(
      (vote) => vote.vote === 'N' && factionPersons.some((person) => person.id === vote.personId),
    ).length;
    const abstentions = votes.filter(
      (vote) => vote.vote === 'E' && factionPersons.some((person) => person.id === vote.personId),
    ).length;
    const notVoted = votes.filter(
      (vote) => vote.vote === 'O' && factionPersons.some((person) => person.id === vote.personId),
    ).length;

    return { faction: faction.name, votesFor, votesAgainst, abstentions, notVoted };
  });
}

export class VotingsImageDataGenerator {
  public generateVotingsImageData(parliamentPeriod: Registry, sessionsInput: SessionInput[]): Voting[] {
    const { persons, factions } = parliamentPeriod;

    return sessionsInput.flatMap((sessionInput) => {
      const sessionId = sessionInput.session.id;
      const date = sessionInput.session.date;
      const personsOfSession = getPersonsOfSession(persons, date);

      const mapSessionScanVoteToVote = (vote: SessionScanVote): Vote => ({
        personId: personsOfSession.find((p) => p.name === vote.name)?.id || '',
        vote: vote.vote === 'J' || vote.vote === 'N' || vote.vote === 'E' ? vote.vote : 'O',
      });
      return sessionInput.votings.map<Voting>((sessionVoting) => {
        const allVotes = sessionVoting.votes.map(mapSessionScanVoteToVote);
        const votes = getVotingForFactions(allVotes, factions, personsOfSession);
        return {
          sessionId,
          votingId: +sessionVoting.votingFilename.substring(11, 14),
          date,
          motionType: sessionVoting.votingSubject.type || 'Sonstige',
          motionId: sessionVoting.votingSubject.motionId,
          subjectTitle: sessionVoting.votingSubject.title,
          accepted: votingAccepted(parliamentPeriod, sessionVoting),
          majorityRequirement: getMajorityRequirement(sessionVoting),
          votes,
        };
      });
    });
  }
}
