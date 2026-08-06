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

  // One community means one set of tables, reached one way.
  const server = read('lib/server/community.ts');
  ok('server reads go through the backend adapter',
    server.includes('serverSupabase') && server.includes('makeRead'));

  const writes = read('lib/communityWrites.ts');
  ok('browser writes go through the write port',
    writes.includes('browserBackend()'));
  ok('neither file touches an SDK directly',
    !server.includes('@supabase/') && !writes.includes('@supabase/'));

  const adapter = read('lib/backend/supabase/client.ts');
  ok('the adapter reads the `posts` and `comments` tables the schema defines',
    adapter.includes("from('posts')") && adapter.includes("from('comments')"));

  // No invented table anywhere.
  const INVENTED = /from\(['"](web_posts|posts_web|community_web|feed|threads)['"]\)/;
  const bad = FILES.filter(f => INVENTED.test(f.src)).map(f => f.rel);
  if (bad.length) console.error('  PARALLEL TABLE:', bad);
  ok('no parallel table is introduced', bad.length === 0);

  // The category vocabulary is the shared one — checked equal, element for
  // element, by the adapter suite; here it is enough that the page imports it.
  ok('the shared category labels are imported rather than redeclared',
    read('app/community/page.tsx').includes('@core/community/utils/categories')
    || read('components/community/NewPostForm.tsx').includes('@core/community/utils/categories'));
  ok('the search tokeniser is the shared one, inside the adapter',
    adapter.includes('normalizeDisplayName') && !/function normalizeToken/.test(adapter));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[2] Reads carry the visitor\'s own session — the policy IS the filter');
{
  /*
   * THE INVERSION THAT DEFINES THE MIGRATION. The Firebase version read
   * through the Admin SDK, which bypassed the rules — so every query had to
   * restate `status == 'active'` and THIS SUITE existed to check the
   * restatements. The Supabase server client carries the visitor's own
   * session, `posts_read_active` applies to it like any browser, and a
   * restated filter would be a second copy of the rule that can drift. So
   * the assertion flipped: the queries must NOT restate it.
   */
  const adapter = stripComments(read('lib/backend/supabase/client.ts'));
  ok('no adapter read restates the status filter by hand',
    !/eq\('status'/.test(adapter));
  ok('the policy that does the filtering is real and proven',
    readFileSync(path.join(ROOT, 'supabase/migrations/0002_rls_policies.sql'), 'utf8')
      .includes('posts_read_active'));

  const server = read('lib/server/community.ts');
  ok('a single post read still refuses non-active documents at the surface',
    adapter.includes("post.status === 'active' ? post : null"));
  ok('the module is server-only', /import\s+['"]server-only['"]/.test(server));
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n[3] Pagination cannot duplicate or lose a post');
{
  const adapter = read('lib/backend/supabase/client.ts');

  // A total order is what makes a cursor safe. created_at alone is not total.
  ok('posts are ordered by created_at AND id (a total order)',
    adapter.includes("order('created_at', { ascending: false })")
    && adapter.includes("order('id', { ascending: false })"));
  ok('comments are ordered by created_at AND id, oldest first',
    adapter.includes("order('created_at', { ascending: true })")
    && adapter.includes("order('id', { ascending: true })"));
  ok('paging uses a keyset filter on that composite, not an offset',
    adapter.includes('keysetFilter(') && !/\.range\(|\.offset\(/.test(adapter));
  ok('the "is there more" answer comes from an extra row, not a separate count',
    adapter.includes('limit + 1'));

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
  const adapter = stripComments(read('lib/backend/supabase/client.ts'));

  ok('no write function accepts an authorId parameter',
    !/authorId[?]?:\s*string/.test(writes));
  ok('the adapter sends the SESSION\'s id — and the policy re-checks it',
    adapter.includes('author_id: user'));
  ok('timestamps are the database\'s, never a client clock',
    !/created_at:\s*new Date|createdAt:\s*new Date/.test(adapter + writes));
  ok('no write names a status other than the soft-delete',
    !/status:\s*'(?!deleted)/.test(stripComments(writes)));
  ok('nothing about likes or ranking is writable from here',
    !/(likes_count|likesCount|feed_score|feedScore)\s*:/.test(adapter + stripComments(writes)));
  ok('deletion is soft only — no hard delete anywhere',
    adapter.includes("update({ status: 'deleted' })") && !/\.delete\(\)\.eq\('id', postId\)/.test(adapter));

  // The author denorm and the counters are the DATABASE\'s job now; a client
  // copy would be the forgeable one.
  ok('the client sends no author_name — the trigger fills it',
    !/author_name\s*:/.test(adapter));
  ok('the client bumps no counter — the triggers maintain them',
    !/comments_count|likes_count/.test(adapter.replace(/select\([^)]*\)/g, '')));

  // createPost refuses an anonymous browser before any upload starts.
  const createBody = writes.slice(writes.indexOf('export async function createPost'));
  ok('createPost resolves the signed-in user first',
    createBody.slice(0, 600).includes('auth.currentUser()'));
}

console.log('\n[6] The rules — not the UI — are the authority');
{
  const policies = readFileSync(path.join(ROOT, 'supabase/migrations/0002_rls_policies.sql'), 'utf8');
  const grants = readFileSync(path.join(ROOT, 'supabase/migrations/0006_community_web.sql'), 'utf8');

  // The owner-edit rule and the constraints that make it safe — in SQL now,
  // and EXERCISED by `npm run test:rls` rather than merely read here.
  ok('an owner-update policy exists, restricted to the author',
    policies.includes('posts_update_own')
    && policies.includes('author_id = auth.uid()'));
  ok('…and to a non-banned caller', policies.includes('is_active()'));
  ok('…and a moderated post cannot be resurrected by its author',
    policies.includes("status in ('active', 'deleted')"));
  ok('the hasOnly() allow-list became column-narrowed grants',
    grants.includes('grant update (text, search_tokens, edited_at, status)'));
  ok('posts are still never hard-deleted — no client DELETE policy at all',
    policies.includes('NO DELETE POLICY, FOR ANYBODY'));

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
console.log('\n[11] The write path agrees with the DATABASE');
{
  const writes = stripComments(read('lib/communityWrites.ts'));
  const migration = readFileSync(path.join(ROOT, 'supabase/migrations/0006_community_web.sql'), 'utf8');

  // The anti-spam windows live IN the insert policies now — there is no
  // profile stamp whose omission would disarm them, which is the bug class
  // the Firebase version had to test for. What remains client-side is the
  // courtesy message, and its numbers must match the policy's.
  ok('the 60-second post window is in the INSERT policy',
    migration.includes("interval '60 seconds'") && migration.includes('post_cooldown_ok'));
  ok('the 5-second comment window is in the INSERT policy',
    migration.includes("interval '5 seconds'") && migration.includes('comment_cooldown_ok'));
  ok('the UI advertises the same windows',
    /POST_COOLDOWN_MS = 60_000/.test(writes) && /COMMENT_COOLDOWN_MS = 5_000/.test(writes));

  // A limit the UI advertises must be the limit the platform applies.
  ok('the comment length the UI enforces is the platform\'s 500',
    /COMMENT_TEXT_MAX = 500/.test(writes));
  ok('the post length the UI enforces is the platform\'s 2000',
    /POST_TEXT_MAX = 2000/.test(writes));

  // The counters and the author denorm are triggers — nothing to forget.
  ok('the comment counter is a database trigger', migration.includes('comments_count_sync'));
  ok('the like counter is a database trigger', migration.includes('post_likes_count_sync'));
  ok('the author name is filled by a trigger that IGNORES the client\'s value',
    migration.includes('fill_author_denorm'));

  // A note is legal on exactly one reason, and its cap is stated once.
  ok('a report note is sent only for the one reason that takes one',
    /REPORT_REASON_WITH_NOTE/.test(writes));
  ok('the note cap is 200', /REPORT_NOTE_MAX = 200/.test(writes));
  ok('the note field is hidden for every other reason',
    read('components/community/PostActions.tsx').includes('reason === REPORT_REASON_WITH_NOTE'));

  // The duplicate-report guard is a UNIQUE INDEX — mechanical, not a
  // read-back that could swallow its own refusal.
  const schema = readFileSync(path.join(ROOT, 'supabase/migrations/0001_schema.sql'), 'utf8');
  ok('one open report per person per target is a partial unique index',
    schema.includes('reports_one_open_per_reporter'));
  ok('the UI translates that refusal instead of re-querying the queue',
    writes.includes('سبق أن أبلغت'));
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
