import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  hashTranscript,
  type AiTextAssessment,
} from '@models/ai-text-assessment';
import type { Registry, RegistrySession } from '@models/registry';
import type { SessionSpeech } from '@models/session-speech';
import { isFeatureEnabled } from '@utils/feature-flags';
import Speech from './Speech.astro';

vi.mock('@utils/feature-flags', () => ({
  isFeatureEnabled: vi.fn(() => false),
}));

const transcription = 'Transkribierter Text';
const methodologyHref = '/transparency/ai-assessment/';
const badgeDescription =
  'Dieser Redebeitrag enthält möglicherweise in Teilen KI-generierten Text.';

function createAssessment(
  overrides: Partial<AiTextAssessment> = {},
): AiTextAssessment {
  return {
    label: 'AI',
    fractionAi: 1,
    fractionAiAssisted: 0,
    fractionHuman: 0,
    segmentCounts: { ai: 1, aiAssisted: 0, human: 0 },
    nonHumanWordWeightedConfidenceDistribution: { High: 1, Medium: 0, Low: 0 },
    highConfidenceNonHuman: true,
    highConfidenceNonHumanRuleVersion: 'weakest-non-human-window@1',
    modelName: 'pangram-4',
    modelVersion: '4.0',
    checkedAt: '2026-10-11',
    transcriptSha256: hashTranscript(transcription),
    ...overrides,
  };
}

const session: RegistrySession = {
  id: '2026-01-22',
  date: '2026-01-22',
  title: 'Sitzung',
  youtubeUrl: 'https://www.youtube.com/watch?v=abc',
  meetingMinutesUrl: null,
  approved: true,
};

const parliamentPeriod: Registry = {
  id: 'magdeburg-8',
  name: 'Magdeburg 8',
  lastUpdate: '2026-01-22',
  sessions: [session],
  factions: [],
  parties: [],
  persons: [],
};

async function renderSpeech(speech: SessionSpeech): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(Speech, {
    props: {
      parliamentPeriod,
      session,
      speech,
      speechElementId: `speech-${speech.start}`,
      link: '/pp/magdeburg-8/session/2026-01-22?tab=speeches',
    },
  });
}

function createSpeech(aiTextAssessment?: AiTextAssessment): SessionSpeech {
  return {
    speaker: 'Max Mustermann',
    start: 0,
    duration: 60,
    transcription,
    aiTextAssessment,
  };
}

describe('Speech AI text assessment badge', () => {
  afterEach(() => {
    vi.mocked(isFeatureEnabled).mockReturnValue(false);
  });

  test('renders badge with methodology link when flag is on and assessment is exposed', async () => {
    vi.mocked(isFeatureEnabled).mockReturnValue(true);

    const html = await renderSpeech(createSpeech(createAssessment()));

    expect(html).toContain(badgeDescription);
    expect(html).toContain(`href="${methodologyHref}"`);
    expect(html).toContain('Informationen zur Analyse-Methodik');
  });

  test('omits badge when flag is off', async () => {
    const html = await renderSpeech(createSpeech(createAssessment()));

    expect(html).not.toContain(badgeDescription);
    expect(html).not.toContain(methodologyHref);
  });

  test('omits badge when assessment is not high-confidence non-human', async () => {
    vi.mocked(isFeatureEnabled).mockReturnValue(true);

    const html = await renderSpeech(
      createSpeech(createAssessment({ highConfidenceNonHuman: false })),
    );

    expect(html).not.toContain(badgeDescription);
  });

  test('omits badge when transcript drifted since assessment', async () => {
    vi.mocked(isFeatureEnabled).mockReturnValue(true);

    const html = await renderSpeech(
      createSpeech(
        createAssessment({ transcriptSha256: hashTranscript('alt') }),
      ),
    );

    expect(html).not.toContain(badgeDescription);
  });

  test('omits badge when speech has no assessment', async () => {
    vi.mocked(isFeatureEnabled).mockReturnValue(true);

    const html = await renderSpeech(createSpeech());

    expect(html).not.toContain(badgeDescription);
  });
});
