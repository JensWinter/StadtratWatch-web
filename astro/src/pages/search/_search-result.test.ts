import { describe, expect, it } from 'vitest';
import { toSearchResultItem } from './_search-result';

describe('toSearchResultItem', () => {
  it('links a speech to its session in the parliament period of the index document', () => {
    const hit = {
      document: {
        id: 'speech-2024-06-13-4711',
        type: 'speech',
        content: ['Sehr geehrte Damen und Herren'],
        paper_name: '',
        paper_type: '',
        paper_reference: '',
        speech_parliament_period: 'magdeburg-7',
        speech_session: '2024-06-13',
        speech_start: 4711,
        speech_session_date: 1718236800000,
        speech_speaker: 'Erika Mustermann',
      },
    };

    const searchResultItem = toSearchResultItem(hit);

    expect(searchResultItem?.speech?.url).toBe(
      '/pp/magdeburg-7/session/2024-06-13?tab=speeches#speech-4711',
    );
  });
});
