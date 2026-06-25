// Client-side wrapper for the /api/fpv-search serverless endpoint.
// Never holds API keys — all keys stay server-side in api/fpv-search.ts.

export type WebSearchResult = {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  safeToDisplay: boolean;
};

export type WebSearchResponse = {
  configured: boolean;
  query: string;
  results: WebSearchResult[];
  error?: string;
};

function isValidResult(r: unknown): r is WebSearchResult {
  if (!r || typeof r !== 'object') return false;
  const obj = r as Record<string, unknown>;
  return (
    typeof obj.title === 'string' &&
    typeof obj.url === 'string' &&
    typeof obj.domain === 'string' &&
    typeof obj.snippet === 'string' &&
    typeof obj.safeToDisplay === 'boolean'
  );
}

export async function fetchTrustedWebSearch(
  query: string,
  options?: { signal?: AbortSignal },
): Promise<WebSearchResponse> {
  const fallback: WebSearchResponse = {
    configured: false,
    query,
    results: [],
    error: 'Web search unavailable',
  };

  if (!query || query.trim().length < 2) {
    return { ...fallback, error: 'Query too short' };
  }

  try {
    const response = await fetch(
      `/api/fpv-search?q=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: options?.signal,
      },
    );

    if (!response.ok) return fallback;

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return fallback;
    }

    if (!data || typeof data !== 'object') return fallback;
    const obj = data as Record<string, unknown>;

    const configured =
      typeof obj.configured === 'boolean' ? obj.configured : false;
    const responseQuery =
      typeof obj.query === 'string' ? obj.query : query;
    const error =
      typeof obj.error === 'string' ? obj.error : undefined;
    const rawResults = Array.isArray(obj.results) ? obj.results : [];

    // Validate each result and cap at 5
    const results: WebSearchResult[] = rawResults
      .filter(isValidResult)
      .slice(0, 5);

    return { configured, query: responseQuery, results, error };
  } catch {
    // AbortError, network error, or anything else — always silent to the caller
    return fallback;
  }
}
