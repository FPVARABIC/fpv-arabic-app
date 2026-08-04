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
  // The Betaflight centre. Optional id for the same reason the other three
  // centres have one: «افتح مركز Betaflight» is a real destination, and before
  // this it resolved to null — so a link to the centre itself rendered as
  // unavailable while a link to one page inside it worked.
  | { kind: 'betaflight'; id?: string }
  | { kind: 'elrs-setup'; id?: string }
  | { kind: 'elrs-issue'; id?: string }
  | { kind: 'edgetx'; id?: string }
  // The video software centre. Same optional-id shape as the other centres:
  // without an id it is «افتح مركز الفيديو», with one it is the exact topic —
  // and only the second of those is ever a useful answer.
  | { kind: 'video'; id?: string }
  | { kind: 'roadmap'; id: string }
  // The workspace, optionally aimed at one part of it. `view` selects a section
  // ('rc' — the control-link form, 'findings' — the conflict report) and `field`
  // names the single input the reader is being asked to fill. That is what makes
  // «طلب Target» an action rather than a sentence: it opens the exact field.
  | { kind: 'project'; view?: 'rc' | 'video' | 'findings'; field?: string }
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
      return d.id ? `/betaflight/${d.id}` : '/betaflight';
    // The software-centre pages are single screens that select an entry from a
    // query parameter, so an id is optional: without one the destination is the
    // page, with one it is the exact step or issue. That difference is the whole
    // point — «افتح قسم البرامج» is not an answer, «افتح مشكلة الربط» is.
    case 'elrs-setup':
      return d.id
        ? `/programming/expresslrs/setup?step=${encodeURIComponent(d.id)}`
        : '/programming/expresslrs/setup';
    case 'elrs-issue':
      return d.id
        ? `/programming/expresslrs/troubleshooting?issue=${encodeURIComponent(d.id)}`
        : '/programming/expresslrs/troubleshooting';
    case 'edgetx':
      return d.id ? `/programming/edgetx/${d.id}` : '/programming/edgetx';
    case 'video':
      return d.id ? `/programming/video/${d.id}` : '/programming/video';
    case 'roadmap':
      return d.id ? `/roadmap/${d.id}` : null;
    case 'project': {
      const q = new URLSearchParams();
      if (d.view) q.set('view', d.view);
      if (d.field) q.set('field', d.field);
      const s = q.toString();
      return s ? `/project?${s}` : '/project';
    }
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
      // `project`, `project:rc`, `project:rc.rxTarget`, `project:findings` — the
      // aimed forms have to survive the round trip or a shared "fill in your
      // Target" link degrades silently into "open your project".
      return d.view ? (d.field ? `project:${d.view}.${d.field}` : `project:${d.view}`) : 'project';
    case 'assembly':
    case 'checklist':
    case 'coverage':
    case 'diagnose':
      return d.kind;
    case 'betaflight':
    case 'elrs-setup':
    case 'elrs-issue':
    case 'edgetx':
    case 'video':
      return d.id ? `${d.kind}:${d.id}` : d.kind;
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
      || key === 'elrs-setup' || key === 'elrs-issue' || key === 'edgetx' || key === 'video'
      || key === 'betaflight'
      ? ({ kind: key } as Destination)
      : null;
  }
  const kind = key.slice(0, i);
  const rest = key.slice(i + 1);
  if (!rest) return null;
  switch (kind) {
    case 'article': case 'module': case 'glossary': case 'dx':
    case 'lesson': case 'betaflight': case 'roadmap':
    case 'elrs-setup': case 'elrs-issue': case 'edgetx': case 'video':
      return { kind, id: rest } as Destination;
    case 'project': {
      const dot = rest.indexOf('.');
      const view = dot === -1 ? rest : rest.slice(0, dot);
      if (view !== 'rc' && view !== 'video' && view !== 'findings') return null;
      const field = dot === -1 ? undefined : rest.slice(dot + 1);
      return field ? { kind: 'project', view, field } : { kind: 'project', view };
    }
    case 'search':
      return { kind: 'search', query: rest };
    case 'external':
      return { kind: 'external', url: rest };
    default:
      return null;
  }
}
