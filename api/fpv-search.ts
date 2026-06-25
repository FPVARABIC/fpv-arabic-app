import type { IncomingMessage, ServerResponse } from 'node:http';

// ─── Response shape ────────────────────────────────────────────────────────────

interface SearchResult {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  safeToDisplay: boolean;
}

interface SearchResponse {
  configured: boolean;
  query: string;
  results: SearchResult[];
  error?: string;
}

// ─── Trusted domain whitelist ──────────────────────────────────────────────────
// Only these domains may appear in results returned to the client.
// Any result whose URL does not match is dropped silently.

const ALLOWED_DOMAINS: string[] = [
  'docs.betaflight.com',
  'betaflight.com',
  'www.expresslrs.org',
  'expresslrs.org',
  'github.com',             // GitHub paths filtered below to ExpressLRS + betaflight orgs only
  'oscarliang.com',
  'fpv.wtf',
  'ardupilot.org',
  'rotorbuilds.com',
  'www.speedybee.com',
  'speedybee.com',
  'www.mateksys.com',
  'mateksys.com',
  'www.radiomasterrc.com',
  'radiomasterrc.com',
];

// GitHub requires org-level filtering — only trusted FPV orgs allowed.
const ALLOWED_GITHUB_PATH_PREFIXES: string[] = [
  '/ExpressLRS/',
  '/betaflight/',
  '/iNavFlight/',
];

// ─── Unsafe content patterns ──────────────────────────────────────────────────
// Results whose title or snippet match any of these are dropped before returning.
// Covers dangerous wiring/battery/motor advice and off-topic content.

const UNSAFE_PATTERNS: RegExp[] = [
  // Props on during motor test
  /props?\s+on\s+(during|while|when).*(motor|test)/i,
  /test.*motors?\s+with\s+props?\s+on/i,
  /motors?\s+tab.*props?\s+(on|attached|mounted)/i,
  // Arabic: مراوح مركبة أثناء اختبار
  /مراوح\s*مركب[ةه]\s*أثناء/,
  /اختبار\s*المحركات\s*والمراوح/,

  // Swollen/puffed battery is safe
  /swollen\s+battery\s+(is\s+)?(ok|safe|fine|normal)/i,
  /puffed?\s+lipo\s+(is\s+)?(ok|safe|fine)/i,
  // Arabic: بطارية منتفخة آمنة
  /بطاري[ةه]\s*منتفخ[ةه]\s*آمن/,

  // Frequency / regulatory bypass
  /bypass.*frequency\s+limit/i,
  /hack.*transmit.*power/i,
  /remove.*power\s+limit/i,
  /unlock.*frequency/i,
  /boost.*signal.*illegal/i,

  // Dangerous wiring shortcuts
  /tx\s+to\s+tx\s+(is\s+)?(ok|fine|correct|right)/i,
  /skip\s+(the\s+)?gnd/i,
  /ground\s+(wire\s+)?(is\s+)?(not\s+)?unnecessary/i,
  /receiver.*vbat\s+(is\s+)?(ok|safe|fine)/i,
  // Arabic: وصّل TX بـ TX
  /وصّ?ل\s*tx\s*(ب|مع|إلى)\s*tx/i,

  // Unsafe LiPo charging
  /charge.*lipo.*unattended/i,
  /leave.*lipo.*charging.*overnight/i,
  /lipo.*any.*charger/i,

  // Non-drone topics — general internet redirect
  /\b(recipe|cooking|politics|sports\s+score|weather\s+forecast|stock\s+market)\b/i,
];

// ─── Mock results (for UI development without a real API key) ─────────────────

const MOCK_RESULTS: SearchResult[] = [
  {
    title: 'Betaflight Configurator — Getting Started',
    url: 'https://docs.betaflight.com/docs/configurator/getting-started',
    domain: 'docs.betaflight.com',
    snippet:
      'Learn how to connect your flight controller to Betaflight Configurator, configure ports, receiver protocol, and motor direction for the first time.',
    safeToDisplay: true,
  },
  {
    title: 'ExpressLRS Quick Start — Binding',
    url: 'https://www.expresslrs.org/quick-start/binding/',
    domain: 'www.expresslrs.org',
    snippet:
      'Follow this guide to bind your ExpressLRS receiver to your radio transmitter using a binding phrase or button-bind method.',
    safeToDisplay: true,
  },
  {
    title: 'FPV Drone Build Guide — Motor and ESC Wiring',
    url: 'https://oscarliang.com/motor-esc-wiring-fpv-drone/',
    domain: 'oscarliang.com',
    snippet:
      'Step-by-step instructions for wiring brushless motors to a 4-in-1 ESC and connecting to the flight controller. Includes TX/RX wiring diagrams.',
    safeToDisplay: true,
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function normalizeDomain(hostname: string): string {
  return hostname.replace(/^www\./, '');
}

function isDomainAllowed(url: string): boolean {
  let hostname: string;
  let pathname: string;
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname;
    pathname = parsed.pathname;
  } catch {
    return false;
  }

  // GitHub requires path-level check — only trusted FPV orgs
  if (hostname === 'github.com') {
    return ALLOWED_GITHUB_PATH_PREFIXES.some(prefix =>
      pathname.startsWith(prefix),
    );
  }

  const normalizedHost = normalizeDomain(hostname);
  return ALLOWED_DOMAINS.some(
    allowed => normalizeDomain(allowed) === normalizedHost,
  );
}

function isContentSafe(title: string, snippet: string): boolean {
  const combined = `${title} ${snippet}`;
  return !UNSAFE_PATTERNS.some(pattern => pattern.test(combined));
}

function send(res: ServerResponse, status: number, body: SearchResponse): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    // CORS: only same-origin allowed — this endpoint must not be called cross-origin
    'Access-Control-Allow-Origin': 'same-origin',
  });
  res.end(json);
}

// ─── Brave Search API call ────────────────────────────────────────────────────

interface BraveSearchResult {
  title?: string;
  url?: string;
  description?: string;
}

interface BraveSearchResponse {
  web?: {
    results?: BraveSearchResult[];
  };
}

async function callBraveSearch(
  query: string,
  apiKey: string,
): Promise<SearchResult[]> {
  // Prefix query with FPV/drone context to anchor search in the domain
  const augmentedQuery = `FPV drone ${query}`;
  const params = new URLSearchParams({
    q: augmentedQuery,
    count: '8',          // fetch more than needed so filtering doesn't leave zero results
    safesearch: 'strict',
    search_lang: 'en',
    country: 'us',
  });

  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
      // Abort if Brave takes too long — serverless functions have limits
      signal: AbortSignal.timeout(8000),
    },
  );

  if (!response.ok) {
    throw new Error(`Brave API error: ${response.status}`);
  }

  const data = (await response.json()) as BraveSearchResponse;
  const raw = data?.web?.results ?? [];

  const results: SearchResult[] = [];

  for (const item of raw) {
    const url = item.url ?? '';
    const title = item.title ?? '';
    const snippet = item.description ?? '';

    // Skip if missing essential fields
    if (!url || !title) continue;

    // Domain whitelist check
    if (!isDomainAllowed(url)) continue;

    // Safety content check
    const safe = isContentSafe(title, snippet);

    results.push({
      title,
      url,
      domain: extractDomain(url),
      snippet,
      safeToDisplay: safe,
    });

    // Return at most 5 filtered results
    if (results.length >= 5) break;
  }

  return results;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  // Only allow GET
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, { configured: false, query: '', results: [], error: 'Method not allowed' });
    return;
  }

  // Parse query string
  const rawUrl = req.url ?? '';
  const queryString = rawUrl.includes('?') ? rawUrl.split('?')[1] : '';
  const params = new URLSearchParams(queryString);
  const q = (params.get('q') ?? '').trim();

  // Reject missing or very short queries
  if (!q || q.length < 2) {
    send(res, 400, { configured: false, query: '', results: [], error: 'Missing query' });
    return;
  }

  const apiKey = process.env.BRAVE_SEARCH_API_KEY ?? '';
  const mockMode = process.env.SEARCH_MOCK_MODE === 'true';

  // ── Case A: API key missing ────────────────────────────────────────────────
  if (!apiKey && !mockMode) {
    send(res, 200, { configured: false, query: q, results: [] });
    return;
  }

  // ── Case B: Mock mode ──────────────────────────────────────────────────────
  if (mockMode) {
    send(res, 200, { configured: true, query: q, results: MOCK_RESULTS });
    return;
  }

  // ── Case C: Real Brave Search ──────────────────────────────────────────────
  try {
    const results = await callBraveSearch(q, apiKey);
    send(res, 200, { configured: true, query: q, results });
  } catch (err) {
    // Never expose raw error details to the client
    const message = err instanceof Error ? err.message : 'Search unavailable';
    const isTimeout = message.includes('timeout') || message.includes('abort');
    send(res, 200, {
      configured: true,
      query: q,
      results: [],
      error: isTimeout ? 'Search timed out' : 'Search temporarily unavailable',
    });
  }
}
