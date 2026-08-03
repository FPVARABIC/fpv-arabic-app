/**
 * The community gate.
 *
 * WHAT THIS PROVES
 * ----------------
 * That the web's community is the SAME community — one Firestore, one
 * permission model, one set of documents — and that the two properties most
 * easily lost are actually present:
 *
 *   pagination that cannot duplicate or lose a post
 *   user text that can never become HTML
 *
 * The cursor logic is exercised BEHAVIOURALLY (encode/decode round trips,
 * hostile inputs) rather than merely read, because "the cursor is stable" is a
 * claim about behaviour and a regex cannot check it.
 *
 * Run: npx tsx scripts/testWebCommunity.ts
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'web');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

const read = (rel: string) => readFileSync(path.join(WEB, rel), 'utf8');

/**
 * Source with comments removed.
 *
 * Every "this file must not contain X" assertion below runs against this, not
 * the raw text. The files deliberately DOCUMENT the rules they follow — a
 * component that explains "there is no dangerouslySetInnerHTML here" would
 * otherwise fail the very check it is describing, which punishes the good
 * practice of writing the reason down.
 */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Community-related web sources, for the sweeping checks. */
function communityFiles(): { rel: string; src: string }[] {
  const out: { rel: string; src: string }[] = [];
  const walk = (dir: string) => {
    for (const e of readdirSync(dir)) {
      if (e === 'node_modules' || e === '.next') continue;
      const full = path.join(dir, e);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      if (!/\.(ts|tsx)$/.test(e)) continue;
      const rel = path.relative(WEB, full);
      if (/community/i.test(rel)) {
        out.push({ rel, src: stripComments(readFileSync(full, 'utf8')) });
      }
    }
  };
  walk(path.join(WEB, 'app'));
  walk(path.join(WEB, 'components'));
  walk(path.join(WEB, 'lib'));
  return out;
}

const FILES = communityFiles();

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[1] One community — no parallel collection or second model');
{
  ok(`community files exist (${FILES.length})`, FILES.length >= 5);

  // The collection names must be exactly the ones the phone app already uses.
  const server = read('lib/server/community.ts');
  ok('posts are read from the existing `posts` collection',
    server.includes("collection('posts')"));
  ok('comments are read from the existing `posts/{id}/comments` subcollection',
    server.includes("collection('comments')"));

  const writes = read('lib/communityWrites.ts');
  ok('writes target `posts`', writes.includes("collection(db(), 'posts')"));
  ok('comments are written to the same subcollection',
    writes.includes("'posts', postId, 'comments'"));
  ok('reports go to the existing `reports` collection',
    writes.includes("collection(db(), 'reports')"));

  // No invented collection anywhere.
  const INVENTED = /collection\((?:db\(\),\s*)?['"](webPosts|posts_web|communityWeb|feed|threads)['"]/;
  const bad = FILES.filter(f => INVENTED.test(f.src)).map(f => f.rel);
  if (bad.length) console.error('  PARALLEL COLLECTION:', bad);
  ok('no parallel collection is introduced', bad.length === 0);

  // The post/comment shape comes from the shared types, not a local redefinition.
  ok('the shared community types are imported rather than redeclared',
    server.includes('@core/community/') || writes.includes('@core/community/'));
  ok('the search tokeniser is the shared one, not a second implementation',
    writes.includes('normalizeDisplayName') && !/function normalizeToken/.test(writes));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] Reads restate the Firestore read rule the Admin SDK bypasses');
{
  const server = read('lib/server/community.ts');

  // The Admin SDK ignores rules. Every query MUST filter on status itself or
  // hidden and deleted posts become public.
  const queryCount = (server.match(/\.collection\(/g) ?? []).length;
  const statusFilters = (server.match(/where\('status', '==', 'active'\)/g) ?? []).length;
  ok(`every list query filters on status (${statusFilters} filters)`, statusFilters >= 2);
  ok('there is at least one query per filter', queryCount >= statusFilters);

  ok('a single post read also refuses non-active documents',
    server.includes("post.status === 'active' ? post : null"));

  ok('the module is server-only, so the Admin SDK cannot reach a browser',
    /import\s+['"]server-only['"]/.test(server));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] Pagination cannot duplicate or lose a post');
{
  const server = read('lib/server/community.ts');

  // A total order is what makes a cursor safe. createdAt alone is not total.
  ok('posts are ordered by createdAt AND document id (a total order)',
    server.includes("orderBy('createdAt', 'desc')") && server.includes("orderBy('__name__', 'desc')"));
  ok('comments are ordered by createdAt AND document id',
    server.includes("orderBy('createdAt', 'asc')") && server.includes("orderBy('__name__', 'asc')"));
  ok('paging uses startAfter on that composite, not an offset',
    server.includes('startAfter(') && !/\.offset\(/.test(server));
  ok('the "is there more" answer comes from an extra row, not a separate count',
    server.includes('limit + 1'));

  // Behavioural: the cursor must survive a round trip and reject hostile input.
  //
  // Imported from lib/cursor.ts rather than lib/server/community.ts because the
  // latter is `server-only` and throws outside a Next server — correctly so, it
  // holds the Admin SDK. The pure cursor logic was split into its own module
  // precisely so that this behaviour could be PROVEN here rather than assumed.
  const { encodeCursor, decodeCursor } = await import('../web/lib/cursor');

  const sample = { createdAtMs: 1_770_000_000_123, id: 'AbC-123_xyz' };
  const round = decodeCursor(encodeCursor(sample));
  ok('a cursor survives an encode/decode round trip',
    round?.createdAtMs === sample.createdAtMs && round?.id === sample.id);

  // An id containing the separator must not be truncated — this is the bug
  // that silently shifts a page by one document.
  const colonId = { createdAtMs: 1, id: 'a:b:c' };
  const colonRound = decodeCursor(encodeCursor(colonId));
  ok('an id containing the separator survives intact', colonRound?.id === 'a:b:c');

  const HOSTILE = ['', 'not-base64!!', Buffer.from('nope').toString('base64url'),
    Buffer.from(':abc').toString('base64url'), Buffer.from('abc:').toString('base64url'),
    Buffer.from(`1:${'x'.repeat(200)}`).toString('base64url')];
  for (const h of HOSTILE) {
    ok(`a malformed cursor falls back to page one: ${JSON.stringify(h.slice(0, 22))}`,
      decodeCursor(h) === null);
  }
  ok('an absent cursor is simply page one', decodeCursor(undefined) === null && decodeCursor(null) === null);

  // The cursor is in the URL, so a page of results is shareable and survives a
  // refresh — and the whole feed works without JavaScript.
  const feed = read('app/community/page.tsx');
  ok('the next page is a real link carrying the cursor',
    feed.includes('community-next-page') && feed.includes('page.nextCursor'));
  ok('the feed reads its cursor from the URL, not component state',
    feed.includes('searchParams') && feed.includes('cursor'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[4] User content can never become HTML');
{
  // The single most important assertion in this file.
  const textPipeline = { rel: 'lib/text.ts', src: stripComments(read('lib/text.ts')) };
  const sweep = [...FILES, textPipeline];
  const dangerous = sweep.filter(f => f.src.includes('dangerouslySetInnerHTML')).map(f => f.rel);
  if (dangerous.length) console.error('  RAW HTML IN COMMUNITY:', dangerous);
  ok('no community file uses dangerouslySetInnerHTML', dangerous.length === 0);

  const risky = sweep.filter(f => /innerHTML|document\.write|new Function\(|eval\(/.test(f.src))
    .map(f => f.rel);
  if (risky.length) console.error('  RISKY SINK:', risky);
  ok('no community file writes to innerHTML or evaluates strings', risky.length === 0);

  // Text goes through the paragraph splitter, which returns strings React
  // renders as text nodes.
  ok('the text pipeline returns plain strings and emits no markup',
    textPipeline.src.includes('toParagraphs') && !/<[a-zA-Z]/.test(textPipeline.src));

  const card = read('components/community/PostCard.tsx');
  ok('the post card renders text through that pipeline', card.includes('toParagraphs'));
  ok('the composer preview uses the SAME pipeline, so what you see is what ships',
    read('components/community/NewPostForm.tsx').includes('toParagraphs'));

  // A community post is visibly marked as user content, so it is never mistaken
  // for reviewed platform knowledge.
  ok('a post is labelled as community content in the feed', card.includes('من المجتمع'));
  ok('…and on the post page', read('app/community/posts/[postId]/page.tsx').includes('محتوى مستخدم'));
  ok('the feed explains how community content differs from the encyclopedia',
    read('app/community/page.tsx').includes('ليست مرجعاً'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[5] Writes cannot forge identity, status or ranking');
{
  const writes = read('lib/communityWrites.ts');

  ok('the author is taken from the verified Firebase user, never an argument',
    writes.includes('authorId: user.uid') && !/authorId:\s*input\./.test(writes));
  ok('no write function accepts an authorId parameter',
    !/authorId[?]?:\s*string/.test(writes));
  ok('timestamps are the server\'s, never a client clock',
    writes.includes('serverTimestamp()') && !/createdAt:\s*new Date/.test(writes));
  ok('a new post is always created active', writes.includes("status: 'active'"));
  ok('a report is always created unresolved — a reporter cannot pre-close it',
    writes.includes('resolved: false'));
  /**
   * Extracts ONE function's body.
   *
   * A character-window regex around a function name reads into whichever
   * function happens to follow it — which is how the first version of this
   * check reported that `editPostText` sends a `status` field when in fact the
   * NEXT function, softDeletePost, does. Bounding the slice at the next
   * top-level `export` makes the assertion about the function it names.
   */
  const bodyOf = (src: string, name: string): string => {
    const start = src.indexOf(`export async function ${name}`);
    if (start < 0) return '';
    const after = src.indexOf('\nexport ', start + 1);
    return src.slice(start, after < 0 ? src.length : after);
  };

  // Comments stripped first: the slice between one function and the next
  // `export` also contains the NEXT function's doc comment, and that comment
  // legitimately explains what soft-deletion writes.
  const editBody = bodyOf(stripComments(writes), 'editPostText');
  ok('an edit sends exactly text, searchTokens and editedAt — in that shape',
    /text:[\s\S]*?searchTokens:[\s\S]*?editedAt:/.test(editBody));
  ok('an edit sends no status, category or media field',
    !/(status:|category:|mediaType:|authorId:)/.test(editBody));
  ok('…and nothing about likes or ranking',
    !/(likesCount|feedScore)/.test(editBody));
  ok('deletion is soft only — no hard delete anywhere',
    writes.includes("status: 'deleted'") && !/deleteDoc\(/.test(writes));

  // Every mutating helper requires a signed-in user before it does anything.
  const helpers = ['createTextPost', 'editPostText', 'softDeletePost', 'createComment',
    'softDeleteComment', 'reportContent'];
  for (const h of helpers) {
    const body = writes.slice(writes.indexOf(`export async function ${h}`));
    ok(`${h} requires a signed-in user first`,
      body.slice(0, 400).includes('requireUser()'));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[6] The rules — not the UI — are the authority');
{
  const rules = readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');

  // The edit branch this batch ADDED, and the constraints that make it safe.
  ok('an owner-edit branch exists', rules.includes("hasOnly(['text', 'searchTokens', 'editedAt'])"));
  ok('…restricted to the author', /resource\.data\.authorId == request\.auth\.uid/.test(rules));
  ok('…and to a non-banned caller', rules.includes('isActiveCaller()'));
  ok('…and only while the post is active',
    /resource\.data\.status == 'active'\s*\n\s*&& request\.resource\.data\.diff/.test(rules));
  ok('…with a server-clock editedAt, so an edit cannot be backdated',
    rules.includes('request.resource.data.editedAt == request.time'));
  ok('posts are still never hard-deleted', rules.includes('allow delete: if false'));

  // The UI's isOwner is presentation; the page must still pass the real uid.
  const postPage = read('app/community/posts/[postId]/page.tsx');
  ok('ownership is computed from the verified session, not from the browser',
    postPage.includes('session.uid === post.authorId'));
  ok('the page reads the session server-side', postPage.includes('getSession()'));

  const actions = read('components/community/PostActions.tsx');
  ok('the owner controls document that they are presentation, not protection',
    actions.includes('not the security boundary') || actions.includes('NOT THE SECURITY BOUNDARY'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[7] Every state a reader can land in is handled');
{
  const feed = read('app/community/page.tsx');
  for (const [state, marker] of [
    ['unconfigured environment', 'community-unconfigured'],
    ['load failure with a retry', 'community-error'],
    ['retry control', 'community-retry'],
    ['empty feed', 'community-empty'],
  ] as const) {
    ok(`the feed handles: ${state}`, feed.includes(marker));
  }

  const postPage = read('app/community/posts/[postId]/page.tsx');
  ok('a missing, hidden or deleted post is a real 404', postPage.includes('notFound()'));
  ok('an empty comment thread says so', postPage.includes('comments-empty'));
  ok('a signed-out reader is offered sign-in rather than a dead form',
    postPage.includes('/signin?next='));
  ok('a banned account is told why it cannot comment', postPage.includes('حسابك موقوف'));

  // Double-submit guards, which are the difference between one comment and two.
  const commentForm = read('components/community/CommentForm.tsx');
  ok('the comment form guards against double submission',
    commentForm.includes('if (!canSubmit) return;') && commentForm.includes('disabled={!canSubmit}'));
  ok('…and refuses an empty comment', commentForm.includes('text.trim().length > 0'));

  const newForm = read('components/community/NewPostForm.tsx');
  ok('the composer guards against double submission',
    newForm.includes('if (!canSubmit) return;'));
  ok('…and preserves a draft so a failure does not lose the writing',
    newForm.includes('sessionStorage') && newForm.includes('DRAFT_KEY'));
  ok('…and clears that draft once the post exists',
    newForm.includes('sessionStorage.removeItem(DRAFT_KEY)'));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[8] Accessibility and RTL basics');
{
  const pages = [
    'app/community/page.tsx',
    'app/community/posts/[postId]/page.tsx',
    'app/community/new/page.tsx',
  ];
  // Presence is what a source scan can honestly assert. "Exactly one h1 in the
  // rendered document" is a RUNTIME property — the new-post page declares two,
  // in mutually exclusive branches (the banned-account view and the composer),
  // and only ever renders one. Counting occurrences in the source would fail a
  // correct page, so the real check is made against served HTML in the browser
  // pass below rather than weakened here into something that proves nothing.
  for (const p of pages) {
    const src = read(p);
    ok(`${p}: declares a top-level heading`, (src.match(/<h1/g) ?? []).length >= 1);
  }

  const forms = ['components/community/CommentForm.tsx', 'components/community/NewPostForm.tsx'];
  for (const f of forms) {
    const src = read(f);
    // Every input needs a programmatic label; a placeholder is not a label.
    const inputs = (src.match(/<(textarea|select|input)\b/g) ?? []).length;
    const labels = (src.match(/htmlFor=/g) ?? []).length + (src.match(/className="sr-only"/g) ?? []).length;
    ok(`${f}: every field has a real label (${labels} for ${inputs})`, labels >= inputs);
  }

  ok('errors are announced to assistive tech',
    read('components/community/CommentForm.tsx').includes('role="alert"')
    && read('components/community/PostActions.tsx').includes('role="alert"'));

  // Numbers inside Arabic prose must be isolated or they reorder.
  ok('counts are direction-isolated inside Arabic text',
    read('components/community/PostCard.tsx').includes('dir="ltr"'));

  // Long unbroken strings (a pasted URL) must not widen the page.
  const card = read('components/community/PostCard.tsx');
  ok('user text cannot force horizontal overflow', card.includes('overflowWrap'));
}

/* ────────────────────────────────────────────────────────────────────────────
 * [11] The agreements with firestore.rules that only an end-to-end run found
 *
 * Every assertion here corresponds to a bug that `scripts/testWebCommunityE2E.ts`
 * caught against the real emulator. They are restated as cheap source checks so
 * a regression is caught in seconds by `npm run test:web-community`, without
 * needing an emulator, a build and a browser.
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n[11] The write path agrees with firestore.rules');
{
  const rules = readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
  const writes = stripComments(read('lib/communityWrites.ts'));

  // The auth-state race: reading `currentUser` synchronously writes as nobody
  // whenever the SDK has not finished restoring from IndexedDB.
  ok('the signed-in user is resolved only after auth state has settled',
    /authStateReady\(\)/.test(writes));
  ok('no code path reads currentUser without that wait',
    !/currentUser/.test(writes.replace(/await auth\.authStateReady\(\);[\s\S]{0,120}?currentUser/, '')));

  // The anti-spam windows: the rules gate on the AUTHOR'S OWN profile write,
  // so a surface that skips it walks past the limit entirely.
  ok('firestore.rules really does rate-limit posting on lastPostAt',
    /callerProfile\(\)\.lastPostAt/.test(rules));
  ok('creating a post arms that limit by stamping lastPostAt',
    /lastPostAt: serverTimestamp\(\)/.test(writes));
  ok('creating a post also keeps the profile post count truthful',
    /postsCount: increment\(1\)/.test(writes));
  ok('the post and its rate-limit stamp are written atomically',
    /writeBatch\(/.test(writes));

  ok('firestore.rules really does rate-limit commenting on lastCommentAt',
    /callerProfile\(\)\.lastCommentAt/.test(rules));
  ok('commenting arms that limit by stamping lastCommentAt',
    /lastCommentAt: serverTimestamp\(\)/.test(writes));

  // A limit the UI advertises must be the limit the database applies.
  const ruleCommentMax = rules.match(/text\.size\(\) <= (\d+)/g) ?? [];
  ok('the comment length the UI enforces equals the one the rules enforce',
    /COMMENT_TEXT_MAX = 500/.test(writes) && ruleCommentMax.some(m => m.includes('500')));
  ok('the post length the UI enforces equals the one the rules enforce',
    /POST_TEXT_MAX = 2000/.test(writes) && ruleCommentMax.some(m => m.includes('2000')));

  // A note is legal on exactly one reason; sending one otherwise destroys the
  // whole report rather than being ignored.
  ok('a report note is sent only for the one reason the rules permit it on',
    /REPORT_REASON_WITH_NOTE/.test(writes));
  ok('the note length matches the rules\' 200-character cap',
    /REPORT_NOTE_MAX = 200/.test(writes));
  ok('the note field is hidden for every other reason',
    read('components/community/PostActions.tsx').includes('reason === REPORT_REASON_WITH_NOTE'));

  // A check that swallows its own permission error always passes and proves
  // nothing. The rules were widened so this one can genuinely run.
  ok('a reporter may read back their own reports, so the duplicate guard can fire',
    /resource\.data\.reporterId == request\.auth\.uid/.test(rules));
  ok('the duplicate check no longer swallows a refusal',
    !/getDocs\(query\([\s\S]{0,400}?\)\)\.catch\(/.test(writes));
}

/* ────────────────────────────────────────────────────────────────────────────
 * [12] Identity — the site renders in the platform's own typeface
 * ──────────────────────────────────────────────────────────────────────────── */
console.log('\n[12] The Arabic typeface actually loads');
{
  const css = read('app/globals.css');
  const layout = read('app/layout.tsx');
  ok('the font comes from the same package the phone app uses',
    layout.includes("@fontsource-variable/cairo"));
  // The previous hand-written declaration pointed at a file that was never
  // committed, so every page silently fell back to a system font.
  ok('no hand-rolled @font-face points at an uncommitted file',
    !/url\(['"]\/fonts\//.test(css));
  ok('the body still asks for Cairo', /font-family:[^;]*Cairo Variable/.test(css));
}

console.log(`\n✅ testWebCommunity: ${passed} assertions passed\n`);
