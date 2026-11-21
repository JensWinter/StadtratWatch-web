import type {
  DocumentSchema,
  SearchResponseHit,
} from 'typesense/lib/Typesense/Documents';

export interface PaperAndSpeechDocumentSchema extends DocumentSchema {
  id: string;
  type: string;
  content: string[];

  paper_name: string;
  paper_type: string;
  paper_reference: string;

  speech_parliament_period: string;
  speech_session: string;
  speech_start: number;
  speech_session_date: number;
  speech_speaker: string;
  speech_faction?: string;
  speech_party?: string;
  speech_on_behalf_of?: string;
}

type PaperSearchResultItem = {
  id: string;
  title: string;
  reference: string;
  type: string;
  content: string;
};

type SpeechSearchResultItem = {
  id: string;
  url: string;
  sessionDate: number;
  speaker: string;
  faction?: string;
  onBehalfOf?: string;
  content: string;
};

export type SearchResultItem = {
  type: 'paper' | 'speech';
  paper: PaperSearchResultItem | null;
  speech: SpeechSearchResultItem | null;
};

type SearchHit = Pick<
  SearchResponseHit<PaperAndSpeechDocumentSchema>,
  'document' | 'highlights'
>;

export function toSearchResultItem(hit: SearchHit): SearchResultItem | null {
  const document = hit.document;
  const content = firstContentSnippet(hit);

  if (document.type === 'paper') {
    return {
      type: 'paper',
      paper: {
        id: document.id.substring('paper-'.length),
        title: document.paper_name,
        reference: document.paper_reference,
        type: document.paper_type,
        content,
      },
      speech: null,
    };
  }

  if (document.type === 'speech') {
    return {
      type: 'speech',
      paper: null,
      speech: {
        id: document.id,
        url: speechUrl(document),
        sessionDate: document.speech_session_date,
        speaker: document.speech_speaker,
        faction: document.speech_faction,
        onBehalfOf: document.speech_on_behalf_of,
        content,
      },
    };
  }

  return null;
}

function firstContentSnippet(hit: SearchHit): string {
  const contentHighlight = hit.highlights?.find(
    (highlight) => highlight.field === 'content',
  );
  return contentHighlight?.snippets?.[0] ?? '';
}

function speechUrl(document: PaperAndSpeechDocumentSchema): string {
  return `/pp/${document.speech_parliament_period}/session/${document.speech_session}?tab=speeches#speech-${document.speech_start}`;
}
