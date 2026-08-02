/**
 * The single destination resolver for the whole platform.
 *
 * A destination is an IDENTITY, not a path. `{ kind: 'article', id: 'esc-ratings' }`
 * means the same thing in the phone app, in a future web app, in a shared link,
 * in a search result, in a notification, and in a bot answer. Only this module
 * knows what URL shape a given surface uses, so changing that shape later is one
 * file rather than a content migration.
 *
 * WHY THIS EXISTS NOW, BEFORE THERE IS A WEB APP
 * ----------------------------------------------
 * The bot has to return somewhere to go, and it must not return a phone route
 * string — a string cannot be validated, cannot be re-shaped per platform, and
 * cannot fail loudly when its target stops existing. Building the abstraction
 * after the bot would mean rewriting every answer it produces.
 *
 * THE RULE THAT MAKES IT WORTH HAVING
 * -----------------------------------
 * `resolveDestination` returns `null` for anything that does not exist. A dead
 * link therefore becomes a testable condition rather than a user discovering it.
 * `scripts/testPlatformCore.ts` asserts every destination the app can produce
 * resolves, and this module must never invent a route for an unknown id.
 */

/** Every place in the platform a user, a link, or the bot can be sent. */
export type Destination =
  | { kind: 'article'; id: string }
  | { kind: 'module'; id: string }
  | { kind: 'glossary'; id: string }
  | { kind: 'dx'; id: string }
  | { kind: 'lesson'; id: string }
  | { kind: 'betaflight'; id: string }
  | { kind: 'roadmap'; id: string }
  | { kind: 'project' }
  | { kind: 'assembly' }
  | { kind: 'checklist' }
  | { kind: 'coverage' }
  | { kind: 'diagnose' }
  | { kind: 'search'; query: string }
  | { kind: 'external'; url: string };

export type DestinationKind = Destination['kind'];

/**
 * Existence checks, injected rather than imported.
 *
 * The registries live in lazily-loaded chunks; importing them here would drag
 * the whole encyclopedia into whatever bundle needs a route. Callers that can
 * verify (the KB link resolver, the bot) pass a checker; callers that only need
 * the URL shape pass nothing and get an unverified route.
 */
export interface DestinationChecks {
  articleExists?(id: string): boolean;
  moduleExists?(id: string): boolean;
  glossaryExists?(id: string): boolean;
  dxExists?(id: string): boolean;
  /** Article ids do not encode their module, so the route needs a lookup. */
  moduleIdOfArticle?(id: string): string | undefined;
}

/**
 * Resolves a destination to a route for the CURRENT surface.
 *
 * Returns `null` when the destination cannot be honoured: an unknown id, an
 * empty id, or an external link with no URL. Never guesses.
 */
export function resolveDestination(d: Destination, checks: DestinationChecks = {}): string | null {
  switch (d.kind) {
    case 'article': {
      if (!d.id) return null;
      if (checks.articleExists && !checks.articleExists(d.id)) return null;
      const moduleId = checks.moduleIdOfArticle?.(d.id);
      // Without a module lookup the article route cannot be built correctly, and
      // a guessed one would 404 for the user — so we refuse instead.
      if (!moduleId) return null;
      return `/kb/${moduleId}/${d.id}`;
    }
    case 'module':
      if (!d.id) return null;
      if (checks.moduleExists && !checks.moduleExists(d.id)) return null;
      return `/kb/${d.id}`;
    case 'glossary':
      if (!d.id) return null;
      if (checks.glossaryExists && !checks.glossaryExists(d.id)) return null;
      return `/glossary?term=${encodeURIComponent(d.id)}`;
    case 'dx':
      if (!d.id) return null;
      if (checks.dxExists && !checks.dxExists(d.id)) return null;
      return `/diagnose/${d.id}`;
    case 'lesson':
      return d.id ? `/lessons/${d.id}` : null;
    case 'betaflight':
      return d.id ? `/betaflight/${d.id}` : null;
    case 'roadmap':
      return d.id ? `/roadmap/${d.id}` : null;
    case 'project':
      return '/project';
    case 'assembly':
      return '/assembly';
    case 'checklist':
      return '/checklists';
    case 'coverage':
      return '/kb/matrix';
    case 'diagnose':
      return '/diagnose';
    case 'search':
      return `/search?q=${encodeURIComponent(d.query)}`;
    case 'external':
      return d.url || null;
    default:
      return null;
  }
}

/**
 * A stable, surface-independent string form of a destination.
 *
 * This is what a shared link, a notification payload, an analytics event or a
 * synced bookmark should carry — NOT a route. `article:esc-ratings` survives a
 * URL scheme change; `/kb/esc/esc-ratings` does not.
 */
export function destinationKey(d: Destination): string {
  switch (d.kind) {
    case 'search':
      return `search:${d.query}`;
    case 'external':
      return `external:${d.url}`;
    case 'project':
    case 'assembly':
    case 'checklist':
    case 'coverage':
    case 'diagnose':
      return d.kind;
    default:
      return `${d.kind}:${d.id}`;
  }
}

/** Parses a `destinationKey` back into a destination. Returns null if malformed. */
export function parseDestinationKey(key: string): Destination | null {
  const i = key.indexOf(':');
  if (i === -1) {
    return key === 'project' || key === 'assembly' || key === 'checklist'
      || key === 'coverage' || key === 'diagnose'
      ? ({ kind: key } as Destination)
      : null;
  }
  const kind = key.slice(0, i);
  const rest = key.slice(i + 1);
  if (!rest) return null;
  switch (kind) {
    case 'article': case 'module': case 'glossary': case 'dx':
    case 'lesson': case 'betaflight': case 'roadmap':
      return { kind, id: rest } as Destination;
    case 'search':
      return { kind: 'search', query: rest };
    case 'external':
      return { kind: 'external', url: rest };
    default:
      return null;
  }
}
