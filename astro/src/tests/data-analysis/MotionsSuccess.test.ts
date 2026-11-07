import { assert, describe, beforeEach, test } from 'vitest';
import { calcMotionsSuccessRateOfFaction } from '@data-analysis/MotionsSuccess.ts';
import type { RegistryFaction, RegistrySession } from '@models/registry.ts';
import type { SessionInput } from '@models/SessionInput.ts';

describe('MotionsSuccess', () => {
  let faction1: RegistryFaction;
  let faction2: RegistryFaction;
  let session1: RegistrySession;

  beforeEach(() => {
    faction1 = {
      id: 'faction-1',
      name: 'Faction 1',
      seats: 1,
    };

    faction2 = {
      id: 'faction-2',
      name: 'Faction 2',
      seats: 1,
    };

    session1 = {
      id: 'session-1',
      date: '2023-01-01',
      title: 'Session 1',
      youtubeUrl: 'https://youtube.com/session1',
      meetingMinutesUrl: 'https://example.com/minutes1',
      approved: true,
    };
  });

  test('is null when no sessions are provided', () => {
    const motionsSuccessRate = calcMotionsSuccessRateOfFaction(faction1, []);

    assert.isNull(motionsSuccessRate);
  });

  test('is null when no votings are provided at all', () => {
    const sessions: SessionInput[] = [
      {
        session: session1,
        votings: [],
        speeches: [],
      },
    ];

    const motionsSuccessRate = calcMotionsSuccessRateOfFaction(
      faction1,
      sessions,
    );

    assert.isNull(motionsSuccessRate);
  });

  test('is null when no motions are provided by faction', () => {
    const sessions: SessionInput[] = [
      {
        session: session1,
        votings: [
          {
            votingFilename: 'voting-1',
            videoTimestamp: '00:00:00',
            votingSubject: {
              agendaItem: 'Agenda Item 1',
              motionId: 'motion-1',
              title: 'Motion 1',
              type: 'Antrag',
              authors: [faction2.name],
            },
            votes: [],
          },
        ],
        speeches: [],
      },
    ];

    const motionsSuccessRate = calcMotionsSuccessRateOfFaction(
      faction1,
      sessions,
    );

    assert.isNull(motionsSuccessRate);
  });

  test('is not null when motions are provided by faction', () => {
    const sessions: SessionInput[] = [
      {
        session: session1,
        votings: [
          {
            votingFilename: 'voting-1',
            videoTimestamp: '00:00:00',
            votingSubject: {
              agendaItem: 'Agenda Item 1',
              motionId: 'motion-1',
              title: 'Motion 1',
              type: 'Antrag',
              authors: [faction1.name],
            },
            votes: [],
          },
        ],
        speeches: [],
      },
    ];

    const motionsSuccessRate = calcMotionsSuccessRateOfFaction(
      faction1,
      sessions,
    );

    assert.isNotNull(motionsSuccessRate);
  });

  test('is 100% when all motions passed', () => {
    const sessions: SessionInput[] = [
      {
        session: session1,
        votings: [
          {
            votingFilename: 'voting-1',
            videoTimestamp: '00:00:00',
            votingSubject: {
              agendaItem: 'Agenda Item 1',
              motionId: 'motion-1',
              title: 'Motion 1',
              type: 'Antrag',
              authors: [faction1.name],
            },
            votes: [{ name: 'Member 1', vote: 'J' }],
          },
        ],
        speeches: [],
      },
    ];

    const motionsSuccessRate = calcMotionsSuccessRateOfFaction(
      faction1,
      sessions,
    );

    assert.equal(motionsSuccessRate, 1);
  });

  test('is 0% when no motions passed', () => {
    const sessions: SessionInput[] = [
      {
        session: session1,
        votings: [
          {
            votingFilename: 'voting-1',
            videoTimestamp: '00:00:00',
            votingSubject: {
              agendaItem: 'Agenda Item 1',
              motionId: 'motion-1',
              title: 'Motion 1',
              type: 'Antrag',
              authors: [faction1.name],
            },
            votes: [{ name: 'Member 1', vote: 'N' }],
          },
        ],
        speeches: [],
      },
    ];

    const motionsSuccessRate = calcMotionsSuccessRateOfFaction(
      faction1,
      sessions,
    );

    assert.equal(motionsSuccessRate, 0);
  });

  test('is 40% when two out of five motions passed', () => {
    const sessions: SessionInput[] = [
      {
        session: session1,
        votings: [
          {
            votingFilename: 'voting-1',
            videoTimestamp: '00:00:00',
            votingSubject: {
              agendaItem: 'Agenda Item 1',
              motionId: 'motion-1',
              title: 'Motion 1',
              type: 'Antrag',
              authors: [faction1.name],
            },
            votes: [{ name: 'Member 1', vote: 'J' }],
          },
          {
            votingFilename: 'voting-2',
            videoTimestamp: '00:00:00',
            votingSubject: {
              agendaItem: 'Agenda Item 2',
              motionId: 'motion-2',
              title: 'Motion 2',
              type: 'Antrag',
              authors: [faction1.name],
            },
            votes: [{ name: 'Member 1', vote: 'J' }],
          },
          {
            votingFilename: 'voting-3',
            videoTimestamp: '00:00:00',
            votingSubject: {
              agendaItem: 'Agenda Item 3',
              motionId: 'motion-3',
              title: 'Motion 3',
              type: 'Antrag',
              authors: [faction1.name],
            },
            votes: [{ name: 'Member 1', vote: 'N' }],
          },
          {
            votingFilename: 'voting-4',
            videoTimestamp: '00:00:00',
            votingSubject: {
              agendaItem: 'Agenda Item 4',
              motionId: 'motion-4',
              title: 'Motion 4',
              type: 'Antrag',
              authors: [faction1.name],
            },
            votes: [{ name: 'Member 1', vote: 'N' }],
          },
          {
            votingFilename: 'voting-5',
            videoTimestamp: '00:00:00',
            votingSubject: {
              agendaItem: 'Agenda Item 5',
              motionId: 'motion-5',
              title: 'Motion 5',
              type: 'Antrag',
              authors: [faction1.name],
            },
            votes: [{ name: 'Member 1', vote: 'N' }],
          },
        ],
        speeches: [],
      },
    ];

    const motionsSuccessRate = calcMotionsSuccessRateOfFaction(
      faction1,
      sessions,
    );

    assert.equal(motionsSuccessRate, 0.4);
  });

  test('counts partial votings proportionately', () => {
    const sessions: SessionInput[] = [
      {
        session: session1,
        votings: [
          {
            votingFilename: 'voting-1',
            videoTimestamp: '00:00:00',
            votingSubject: {
              agendaItem: 'Agenda Item 1',
              motionId: 'motion-1',
              title: 'Motion 1',
              type: 'Antrag',
              authors: [faction1.name],
            },
            votes: [{ name: 'Member 1', vote: 'J' }],
          },
          {
            votingFilename: 'voting-2',
            videoTimestamp: '00:00:00',
            votingSubject: {
              agendaItem: 'Agenda Item 2',
              motionId: 'motion-2',
              title: 'Motion 2',
              type: 'Antrag',
              authors: [faction1.name],
            },
            votes: [{ name: 'Member 1', vote: 'J' }],
          },
          {
            votingFilename: 'voting-3',
            videoTimestamp: '00:00:00',
            votingSubject: {
              agendaItem: 'Agenda Item 2',
              motionId: 'motion-2',
              title: 'Motion 2',
              type: 'Antrag',
              authors: [faction1.name],
            },
            votes: [{ name: 'Member 1', vote: 'N' }],
          },
        ],
        speeches: [],
      },
    ];

    const motionsSuccessRate = calcMotionsSuccessRateOfFaction(
      faction1,
      sessions,
    );

    assert.equal(motionsSuccessRate, 0.75);
  });
});
