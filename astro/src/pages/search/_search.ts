import type { SearchParams } from 'typesense/lib/Typesense/Documents';
import type { ConfigurationOptions } from 'typesense/lib/Typesense/Configuration';
import * as Typesense from 'typesense';
import {
  TYPESENSE_HOST,
  TYPESENSE_PORT,
  TYPESENSE_PROTOCOL,
  TYPESENSE_SEARCH_ONLY_API_KEY,
} from 'astro:env/client';
import {
  toSearchResultItem,
  type PaperAndSpeechDocumentSchema,
  type SearchResultItem,
} from './_search-result';

export type SearchResult = {
  totalResultItems: number;
  searchResultItems: SearchResultItem[];
};

export async function search(q: string, page: number): Promise<SearchResult> {
  const searchParameters: SearchParams<PaperAndSpeechDocumentSchema> = {
    q,
    query_by: 'paper_reference,paper_name,content',
    page,
    highlight_affix_num_tokens: 15,
  };

  const options: ConfigurationOptions = {
    nodes: [
      {
        host: TYPESENSE_HOST,
        port: TYPESENSE_PORT,
        protocol: TYPESENSE_PROTOCOL,
      },
    ],
    apiKey: TYPESENSE_SEARCH_ONLY_API_KEY,
  };
  const client = new Typesense.Client(options);
  const searchResultPapersAndSpeeches = await client
    .collections<PaperAndSpeechDocumentSchema>('papers-and-speeches')
    .documents()
    .search(searchParameters);

  const searchResultItems = (searchResultPapersAndSpeeches.hits || [])
    .map(toSearchResultItem)
    .filter((item): item is SearchResultItem => item !== null);

  return {
    totalResultItems: searchResultPapersAndSpeeches.found,
    searchResultItems,
  };
}
