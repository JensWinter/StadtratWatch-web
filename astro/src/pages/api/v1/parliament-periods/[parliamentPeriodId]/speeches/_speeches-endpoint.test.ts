import { getEntry } from 'astro:content';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  hashTranscript,
  type AiTextAssessment,
} from '@models/ai-text-assessment';
import type { Registry, RegistrySession } from '@models/registry';
import type { SessionSpeech } from '@models/session-speech';
import { isFeatureEnabled } from '@utils/feature-flags';
import { GET } from './[sessionId].json.ts';

vi.mock('astro:content', () => ({
  getEntry: vi.fn(),
}));

vi.mock('@utils/feature-flags', () => ({
  isFeatureEnabled: vi.fn(() => false),
}));

const transcription = 'Transkribierter Text';

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

function createSpeech(aiTextAssessment?: AiTextAssessment): SessionSpeech {
  return {
    speaker: 'Max Mustermann',
    start: 0,
    duration: 60,
    transcription,
    aiTextAssessment,
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

async function getSpeechesResponseData(
  speeches: SessionSpeech[],
): Promise<Record<string, unknown>[]> {
  vi.mocked(getEntry).mockResolvedValue({ data: speeches } as never);
  const response = await GET({
    params: { parliamentPeriodId: parliamentPeriod.id, sessionId: session.id },
    props: { parliamentPeriod, session },
  });
  const body = await response.json();
  return body.data;
}

describe('speeches endpoint aiTextAssessmentLabel', () => {
  afterEach(() => {
    vi.mocked(isFeatureEnabled).mockReturnValue(false);
  });

  test.each(['AI', 'Mixed'] as const)(
    'serializes label %s as a plain string when flag is on and assessment is high-confidence and matches the transcript',
    async (label) => {
      vi.mocked(isFeatureEnabled).mockReturnValue(true);

      const [speech] = await getSpeechesResponseData([
        createSpeech(createAssessment({ label })),
      ]);

      expect(speech.aiTextAssessmentLabel).toBe(label);
      expect(speech).not.toHaveProperty('aiTextAssessment');
    },
  );

  test('omits the field when flag is off', async () => {
    const [speech] = await getSpeechesResponseData([
      createSpeech(createAssessment()),
    ]);

    expect(speech).not.toHaveProperty('aiTextAssessmentLabel');
  });

  test('omits the field when assessment is not high-confidence non-human', async () => {
    vi.mocked(isFeatureEnabled).mockReturnValue(true);

    const [speech] = await getSpeechesResponseData([
      createSpeech(createAssessment({ highConfidenceNonHuman: false })),
    ]);

    expect(speech).not.toHaveProperty('aiTextAssessmentLabel');
  });

  test('omits the field when transcript drifted since assessment', async () => {
    vi.mocked(isFeatureEnabled).mockReturnValue(true);

    const [speech] = await getSpeechesResponseData([
      createSpeech(
        createAssessment({ transcriptSha256: hashTranscript('alt') }),
      ),
    ]);

    expect(speech).not.toHaveProperty('aiTextAssessmentLabel');
  });

  test('omits the field when speech has no assessment', async () => {
    vi.mocked(isFeatureEnabled).mockReturnValue(true);

    const [speech] = await getSpeechesResponseData([createSpeech()]);

    expect(speech).not.toHaveProperty('aiTextAssessmentLabel');
  });
});
