/**
 * Real source-structure assertions for the Community hardening task —
 * comment-cooldown redesign, comment likes, user search, and the privacy/
 * scope audit. Reads the real source/data files on disk and asserts on
 * their structure directly, the same convention used by every other *.ts
 * structural test in this repo (testAssembly.ts, testProgrammingHub.ts,
 * etc). scripts/testCommunityRules.ts proves the same behaviors are
 * actually enforced against a real Firestore Security Rules emulator.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeDisplayName, prefixRangeEnd, MIN_USER_SEARCH_QUERY_LENGTH } from '../src/components/Community/utils/userSearch';
import { POST_RATE_LIMIT_SECONDS, postRateLimitMessage } from '../src/components/Community/utils/rateLimit';
import { commentLikePath, commentLikesPath } from '../src/components/Community/utils/firestorePaths';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

const typesTs = readFileSync(join(ROOT, 'src/components/Community/types.ts'), 'utf8');
const ensureCommunityUserTs = readFileSync(join(ROOT, 'src/components/Community/utils/ensureCommunityUser.ts'), 'utf8');
const firestorePathsTs = readFileSync(join(ROOT, 'src/components/Community/utils/firestorePaths.ts'), 'utf8');
const rateLimitTs = readFileSync(join(ROOT, 'src/components/Community/utils/rateLimit.ts'), 'utf8');
const useCommentComposerTs = readFileSync(join(ROOT, 'src/components/Community/hooks/useCommentComposer.ts'), 'utf8');
const useCommentLikeTs = readFileSync(join(ROOT, 'src/components/Community/hooks/useCommentLike.ts'), 'utf8');
const usePostTs = readFileSync(join(ROOT, 'src/components/Community/hooks/usePost.ts'), 'utf8');
const functionsErrorTs = readFileSync(join(ROOT, 'src/components/Community/utils/functionsError.ts'), 'utf8');
const commentsListTsx = readFileSync(join(ROOT, 'src/components/Community/PostPage/CommentsList.tsx'), 'utf8');
const commentInputTsx = readFileSync(join(ROOT, 'src/components/Community/PostPage/CommentInput.tsx'), 'utf8');
const postDetailTsx = readFileSync(join(ROOT, 'src/components/Community/PostPage/PostDetail.tsx'), 'utf8');
const useSearchTs = readFileSync(join(ROOT, 'src/components/Community/hooks/useSearch.ts'), 'utf8');
const useUserSearchTs = readFileSync(join(ROOT, 'src/components/Community/hooks/useUserSearch.ts'), 'utf8');
const searchScreenTsx = readFileSync(join(ROOT, 'src/components/Community/Search/SearchScreen.tsx'), 'utf8');
const rulesTxt = readFileSync(join(ROOT, 'firestore.rules'), 'utf8');
const migrationTs = readFileSync(join(ROOT, 'scripts/migrateDisplayNameNormalized.ts'), 'utf8');
const firebaseLibTs = readFileSync(join(ROOT, 'src/lib/firebase.ts'), 'utf8');
const functionsIndexTs = readFileSync(join(ROOT, 'functions/src/index.ts'), 'utf8');
const functionsPackageJson = readFileSync(join(ROOT, 'functions/package.json'), 'utf8');
const firebaseJson = readFileSync(join(ROOT, 'firebase.json'), 'utf8');
const vercelJson = readFileSync(join(ROOT, 'vercel.json'), 'utf8');
const postCardTsx = readFileSync(join(ROOT, 'src/components/Community/Feed/PostCard.tsx'), 'utf8');
const postLikeButtonTsx = readFileSync(join(ROOT, 'src/components/Community/PostLikeButton.tsx'), 'utf8');
const usePostLikeTs = readFileSync(join(ROOT, 'src/components/Community/hooks/usePostLike.ts'), 'utf8');
const useComposerTs = readFileSync(join(ROOT, 'src/components/Community/hooks/useComposer.ts'), 'utf8');
const migrationProdTs = readFileSync(join(ROOT, 'functions/scripts/migrateDisplayNameNormalizedProd.ts'), 'utf8');
const homeViewTsx = readFileSync(join(ROOT, 'src/views/HomeView.tsx'), 'utf8');
const bottomNavTsx = readFileSync(join(ROOT, 'src/components/BottomNavigation.tsx'), 'utf8');
const mediaUploaderTsx = readFileSync(join(ROOT, 'src/components/Community/Composer/MediaUploader.tsx'), 'utf8');
const feedRankingTs = readFileSync(join(ROOT, 'functions/src/feedRanking.ts'), 'utf8');
const useFeedTs = readFileSync(join(ROOT, 'src/components/Community/hooks/useFeed.ts'), 'utf8');
const feedDiversityTs = readFileSync(join(ROOT, 'src/components/Community/utils/feedDiversity.ts'), 'utf8');
const indexesJson = readFileSync(join(ROOT, 'firestore.indexes.json'), 'utf8');
const postComposerTsx = readFileSync(join(ROOT, 'src/components/Community/Composer/PostComposer.tsx'), 'utf8');
const imageLightboxTsx = readFileSync(join(ROOT, 'src/components/Community/ImageLightbox.tsx'), 'utf8');
const storageRulesTxt = readFileSync(join(ROOT, 'storage.rules'), 'utf8');
const mediaDeleteRetryTs = readFileSync(join(ROOT, 'src/components/Community/Composer/mediaDeleteRetry.ts'), 'utf8');
const communityHomeTsx = readFileSync(join(ROOT, 'src/components/Community/CommunityHome.tsx'), 'utf8');
const useFollowTs = readFileSync(join(ROOT, 'src/components/Community/hooks/useFollow.ts'), 'utf8');
const useNotificationsTs = readFileSync(join(ROOT, 'src/components/Community/hooks/useNotifications.ts'), 'utf8');
const useLessonReminderTs = readFileSync(join(ROOT, 'src/components/Community/hooks/useLessonReminder.ts'), 'utf8');
const notificationsScreenTsx = readFileSync(join(ROOT, 'src/components/Community/Notifications/NotificationsScreen.tsx'), 'utf8');
const storageKeysTs = readFileSync(join(ROOT, 'src/utils/storageKeys.ts'), 'utf8');
const profileSheetTsx = readFileSync(join(ROOT, 'src/components/ProfileSheet.tsx'), 'utf8');
const useIsModeratorTs = readFileSync(join(ROOT, 'src/components/Community/hooks/useIsModerator.ts'), 'utf8');
const useReportsQueueTs = readFileSync(join(ROOT, 'src/components/Community/hooks/useReportsQueue.ts'), 'utf8');
const useUserStatusTs = readFileSync(join(ROOT, 'src/components/Community/hooks/useUserStatus.ts'), 'utf8');
const useAnnouncementCreateTs = readFileSync(join(ROOT, 'src/components/Community/hooks/useAnnouncementCreate.ts'), 'utf8');
const adminDashboardTsx = readFileSync(join(ROOT, 'src/components/Community/Admin/AdminDashboard.tsx'), 'utf8');
const reportsReviewScreenTsx = readFileSync(join(ROOT, 'src/components/Community/Admin/ReportsReviewScreen.tsx'), 'utf8');
const userManagementScreenTsx = readFileSync(join(ROOT, 'src/components/Community/Admin/UserManagementScreen.tsx'), 'utf8');
const announcementComposerScreenTsx = readFileSync(join(ROOT, 'src/components/Community/Admin/AnnouncementComposerScreen.tsx'), 'utf8');
const useAnnouncementMirrorTs = readFileSync(join(ROOT, 'src/components/Community/hooks/useAnnouncementMirror.ts'), 'utf8');

console.log('\n[1] Types — new fields/interfaces exist; the now-obsolete CommentCooldown type is fully removed');
{
  ok('Comment.likesCount is declared', /likesCount\?:\s*number/.test(typesTs));
  ok('Comment.likesCount is optional (pre-existing comments lack it)', /likesCount\?:/.test(typesTs));
  ok('CommunityUser.displayNameNormalized is declared', /displayNameNormalized\?:\s*string/.test(typesTs));
  ok('CommunityUser.displayNameNormalized is optional (pre-existing users lack it until migrated)', /displayNameNormalized\?:/.test(typesTs));
  ok('CommentLike interface still exists (comment-like documents are still real, just Cloud-Function-written now)', /export interface CommentLike/.test(typesTs));
  ok('the obsolete CommentCooldown interface (Phase 6 pre-correction) is fully removed, not merely unused', !/CommentCooldown/.test(typesTs));
}

console.log('\n[2] Firestore path helpers — deterministic, correctly shaped; the obsolete commentCooldowns helpers are removed');
{
  ok('commentLikePath produces the deterministic comments/{id}/likes/{uid} shape', commentLikePath('p1', 'c1', 'u1') === 'posts/p1/comments/c1/likes/u1');
  ok('commentLikesPath (collection, no uid) is the parent of commentLikePath', commentLikesPath('p1', 'c1') === 'posts/p1/comments/c1/likes');
  ok('the obsolete commentCooldownPath/commentCooldownsPath/COMMENT_COOLDOWNS_SUBCOLLECTION exports are fully removed', !/commentCooldown/i.test(firestorePathsTs));
}

console.log('\n[3] normalizeDisplayName — Arabic/English normalization, prefix-search helper');
{
  ok('lowercases Latin text', normalizeDisplayName('Ahmed Ali') === 'ahmed ali');
  ok('folds hamza variants (أ/إ/آ) to bare alef', normalizeDisplayName('أحمد') === normalizeDisplayName('احمد'));
  ok('folds taa marbuta to haa', normalizeDisplayName('فاطمة') === normalizeDisplayName('فاطمه'));
  ok('collapses internal multi-space runs to a single space (not glued together)', normalizeDisplayName('Ahmed   Ali') === 'ahmed ali');
  ok('trims leading/trailing whitespace', normalizeDisplayName('  Ahmed  ') === 'ahmed');
  ok('empty input normalizes to an empty string, not a crash', normalizeDisplayName('') === '');
  ok('a real prefix relationship holds for a genuine substring match ("احمد" starts-with "احم")', normalizeDisplayName('احمد علي').startsWith(normalizeDisplayName('احم')));

  const rangeEnd = prefixRangeEnd('ahm');
  ok('prefixRangeEnd appends a character (real upper bound, not a no-op)', rangeEnd.length === 'ahm'.length + 1);
  ok('prefixRangeEnd starts with the original prefix (still a valid range start)', rangeEnd.startsWith('ahm'));
  ok('MIN_USER_SEARCH_QUERY_LENGTH is a small positive bound (prevents overly-broad prefix reads)', MIN_USER_SEARCH_QUERY_LENGTH >= 1 && MIN_USER_SEARCH_QUERY_LENGTH <= 3);
}

console.log('\n[4] ensureCommunityUser.ts — bootstraps displayNameNormalized, still never writes email');
{
  ok('imports normalizeDisplayName', /import\s*\{\s*normalizeDisplayName\s*\}/.test(ensureCommunityUserTs));
  ok('writes displayNameNormalized on the created user document', /displayNameNormalized:\s*normalizeDisplayName\(displayName\)/.test(ensureCommunityUserTs));
  ok('still never references an email field anywhere in this file', !/\bemail\b/i.test(ensureCommunityUserTs.replace(/\/\/.*$/gm, '')));
}

console.log('\n[5] rateLimit.ts — post rate limit unchanged; comment rate limiting is fully server-side now, no client constants left');
{
  ok('POST_RATE_LIMIT_SECONDS is exactly 60 (unchanged, out of this correction pass\'s scope)', POST_RATE_LIMIT_SECONDS === 60);
  ok('postRateLimitMessage produces a real, non-empty Arabic message', postRateLimitMessage(30).length > 0 && /\d/.test(postRateLimitMessage(30)));
  ok('the obsolete GLOBAL_COMMENT_BURST_GUARD_SECONDS/POST_COMMENT_COOLDOWN_SECONDS/message-function exports are fully removed', !/GLOBAL_COMMENT_BURST_GUARD_SECONDS|POST_COMMENT_COOLDOWN_SECONDS|globalCommentBurstMessage|postCommentCooldownMessage/.test(rateLimitTs));
}

// TEMPORARY (bridge until Firebase Blaze billing is restored — see
// docs/KNOWN_ISSUES.md's "Comment creation temporarily reverted..." entry)
// — this section previously asserted the Phase 6 Cloud-Function-only
// design (imports httpsCallable, no client write, no client cooldown).
// It now asserts the reverted direct-client-write design instead. REVERT
// THESE ASSERTIONS back to the Cloud-Function-only checks (see git history
// at commit b60405d, or this file's own history before this change) once
// the permanent re-migration happens.
console.log('\n[6] useCommentComposer.ts — TEMPORARY: direct client write with a 5s client-side rate-limit pre-check (Blaze billing bridge)');
{
  ok('no longer imports httpsCallable/firebaseFunctions — replaced by a direct write', !/httpsCallable|firebaseFunctions/.test(useCommentComposerTs));
  ok('imports ensureCommunityUser for the bootstrap fallback (matches useComposer.ts\'s own pattern)', /ensureCommunityUser/.test(useCommentComposerTs));
  ok('imports COMMENT_RATE_LIMIT_SECONDS/commentRateLimitMessage from rateLimit.ts (client-side pre-check restored)', /COMMENT_RATE_LIMIT_SECONDS/.test(useCommentComposerTs) && /commentRateLimitMessage/.test(useCommentComposerTs));
  ok('performs a direct Firestore batch write (writeBatch/batch.set) at a comments path — creation is client-side again', /writeBatch/.test(useCommentComposerTs) && /batch\.set/.test(useCommentComposerTs));
  ok('the batch pairs the comment write with commentsCount and lastCommentAt updates, matching the pre-Phase-6 shape', /batch\.update\([^)]*commentsCount/.test(useCommentComposerTs) && /batch\.update\([^)]*lastCommentAt/.test(useCommentComposerTs));
  ok('createComment resolves to a { commentId, collapsed } shape the caller can use to upsert locally (collapsed is always false — no duplicate-fingerprint collapse in this temporary design)', /CreateCommentResult/.test(useCommentComposerTs) && /collapsed:\s*false/.test(useCommentComposerTs));
  ok('the revert is explicitly marked TEMPORARY, pointing back to the permanent Cloud-Function design', /TEMPORARY/.test(useCommentComposerTs));
}

console.log('\n[7] CommentInput.tsx — duplicate-submit-while-pending guard preserved, hands the created commentId upward');
{
  ok('submit() still refuses to re-fire while a request is already pending', /if\s*\(!trimmed\s*\|\|\s*submitting\)\s*return;/.test(commentInputTsx));
  ok('no fixed setTimeout-based artificial cooldown/countdown exists in the composer UI itself', !/setTimeout/.test(commentInputTsx));
  ok('onCommentAdded is called with the created comment\'s id (not a bare no-arg refresh callback)', /onCommentAdded\(result\.commentId\)/.test(commentInputTsx));
}

// TEMPORARY (bridge until Firebase Blaze billing is restored — see
// docs/KNOWN_ISSUES.md's "Post/comment likes temporarily reverted..." entry)
// — this section previously asserted the Cloud-Function-only design (calls
// toggleCommentLike, no client-side batch write). It now asserts the
// reverted direct-client-write design instead. REVERT THESE ASSERTIONS back
// to the Cloud-Function-only checks (see git history at commit b60405d, or
// this file's own history before this change) once the permanent
// re-migration happens.
console.log('\n[8] useCommentLike.ts — TEMPORARY: direct client batch write (like-doc create/delete + likesCount ±1), no set-state-in-effect');
{
  ok('no longer imports httpsCallable/firebaseFunctions — replaced by a direct batch write', !/httpsCallable|firebaseFunctions/.test(useCommentLikeTs));
  ok('imports writeBatch/increment/serverTimestamp for the direct paired write', /writeBatch/.test(useCommentLikeTs) && /increment/.test(useCommentLikeTs) && /serverTimestamp/.test(useCommentLikeTs));
  ok('imports commentPath (in addition to commentLikePath) to reference the parent comment doc for the likesCount update', /commentPath/.test(useCommentLikeTs));
  ok('the batch either (create like-doc + likesCount +1) or (delete like-doc + likesCount -1), never a bare desiredState call', /batch\.set/.test(useCommentLikeTs) && /batch\.delete/.test(useCommentLikeTs) && /increment\(1\)/.test(useCommentLikeTs) && /increment\(-1\)/.test(useCommentLikeTs));
  ok('a failed toggle rolls back the optimistic UI flip', /rollback the optimistic flip/.test(useCommentLikeTs));
  ok('the effect that fetches the current like status never calls setState synchronously in its own body (only inside the async result) — avoids react-hooks/set-state-in-effect', /ever calls setState from inside the async result/.test(useCommentLikeTs));
  ok('likedLoading/liked are DERIVED from a keyed result object compared against the current key, not tracked as separate state kept in sync via effect', /result\.key !== key|result\.key === key/.test(useCommentLikeTs));
  ok('this hook does not fetch or return a like COUNT itself (count comes from the comment doc\'s own denormalized field, never an unbounded liker query)', !/getDocs\(/.test(useCommentLikeTs) && !/collection\(firestoreDb, commentLikesPath/.test(useCommentLikeTs));
  ok('the revert is explicitly marked TEMPORARY, pointing back to the permanent Cloud-Function design', /TEMPORARY/.test(useCommentLikeTs));
}

console.log('\n[8b] usePost.ts — bounded cursor-based comment pagination, no synchronous setState in the main effect');
{
  ok('imports limit/startAfter for cursor-based pagination', /\blimit\b/.test(usePostTs) && /\bstartAfter\b/.test(usePostTs));
  ok('a bounded, documented page size constant exists (not an unbounded getDocs)', /COMMENTS_PAGE_SIZE\s*=\s*\d+/.test(usePostTs));
  ok('exposes loadMoreComments for cursor-based pagination', /loadMoreComments/.test(usePostTs));
  ok('exposes appendCreatedComment (single-doc upsert instead of a full re-fetch after posting)', /appendCreatedComment/.test(usePostTs));
  ok('exposes removeCommentLocally (local filter instead of a full re-fetch after deleting)', /removeCommentLocally/.test(usePostTs));
  ok('the main effect never calls setPostState/setCommentsState synchronously in its own body before any await (avoids react-hooks/set-state-in-effect)', /Derived, not stored/.test(usePostTs));
}

console.log('\n[8c] functionsError.ts — shared FunctionsError → Arabic message mapping used by both Function-calling hooks');
{
  ok('exports functionsErrorMessage', /export function functionsErrorMessage/.test(functionsErrorTs));
  ok('recognizes functions/-prefixed FunctionsErrorCode strings specifically (not a bare string compare)', /functions\//.test(functionsErrorTs));
  ok('falls back to the caller-supplied fallback message for transport-level failures (never surfaces a raw/undefined message)', /fallback/.test(functionsErrorTs));
}

console.log('\n[9] CommentsList.tsx — accessible Like control, status not color-only, defensive likesCount coalesce');
{
  ok('imports the Heart icon', /import\s*\{[^}]*Heart[^}]*\}\s*from\s*'lucide-react'/.test(commentsListTsx));
  ok('the like button is a real native <button type="button">', /<button\s*\n\s*type="button"\s*\n\s*onClick=\{handleClick\}/.test(commentsListTsx));
  ok('aria-label changes between liked/unliked states (not a static generic label)', /aria-label=\{liked \? '.*' : '.*'\}/.test(commentsListTsx));
  ok('aria-pressed reflects the current liked state', /aria-pressed=\{!isGuest && liked\}/.test(commentsListTsx));
  ok('the heart icon itself changes fill (a shape change, not merely a color change) between states', /fill=\{liked \? '#dc2626' : 'none'\}/.test(commentsListTsx));
  ok('likesCount is read defensively with ?? 0 (pre-existing comments may lack the field)', /comment\.likesCount \?\? 0/.test(commentsListTsx));
  ok('guests are gated to a login toast rather than silently failing or silently succeeding', /يجب تسجيل الدخول للإعجاب/.test(commentsListTsx));
  ok('onCommentDeleted is called with the deleted comment\'s id (local removal, not a bare no-arg refresh)', /onCommentDeleted\(commentId\)/.test(commentsListTsx));
}

console.log('\n[10] useSearch.ts (post search) — debounced and stale-response-guarded (Phase 6 fix)');
{
  ok('a debounce timer is used (not a raw call on every keystroke)', /debounceTimerRef/.test(useSearchTs) && /setTimeout/.test(useSearchTs));
  ok('a request-generation counter guards against a stale response overwriting a newer one', /requestIdRef/.test(useSearchTs) && /localId !== requestIdRef\.current/.test(useSearchTs));
  ok('the debounce timer is cleared on unmount (no leaked timer firing into a dead hook)', /clearTimeout\(debounceTimerRef\.current\)/.test(useSearchTs));
  ok('search() no longer returns a Promise the caller is expected to await (fire-and-forget by design once debounced)', /search:\s*\(rawQuery: string\) => void/.test(useSearchTs));
}

console.log('\n[11] useUserSearch.ts — bounded prefix search, debounced, stale-guarded, explicit safe-fields projection');
{
  ok('queries by range on displayNameNormalized (prefix search), not an unbounded scan', /where\('displayNameNormalized', '>='/.test(useUserSearchTs) && /where\('displayNameNormalized', '<='/.test(useUserSearchTs));
  ok('the query has a hard limit()', /limit\(RESULTS_LIMIT\)/.test(useUserSearchTs));
  ok('a minimum query length gates the read (no 1-character overly-broad prefix scan)', /MIN_USER_SEARCH_QUERY_LENGTH/.test(useUserSearchTs));
  ok('debounced (same pattern as post search)', /debounceTimerRef/.test(useUserSearchTs) && /setTimeout/.test(useUserSearchTs));
  ok('stale-response-guarded via a request-generation counter', /requestIdRef/.test(useUserSearchTs) && /localId !== requestIdRef\.current/.test(useUserSearchTs));
  ok('results are built via an EXPLICIT allow-list projection {uid, displayName, photoURL} — not a raw spread of the Firestore document', /return\s*\{\s*uid:\s*d\.id,\s*displayName:\s*data\.displayName,\s*photoURL:\s*data\.photoURL\s*\}/.test(useUserSearchTs));
  ok('the result mapping never spreads the raw document data (...data) into the returned objects', !/\.\.\.data\b/.test(useUserSearchTs));
  // Strips comment lines first: this file's own explanatory comments
  // legitimately discuss WHY no email exists to leak — only real code
  // (a field name, a property access) matters for this assertion.
  const useUserSearchNonCommentLines = useUserSearchTs.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
  ok('the word "email" never appears in actual code (only in explanatory comments, if at all)', !/email/i.test(useUserSearchNonCommentLines));
}

console.log('\n[12] SearchScreen.tsx — accounts section clearly labeled and visually distinct from post results');
{
  ok('renders a "الحسابات" (accounts) heading', /الحسابات/.test(searchScreenTsx));
  ok('renders a "المنشورات" (posts) heading, distinct from the accounts heading', /المنشورات/.test(searchScreenTsx));
  ok('imports and uses useUserSearch', /useUserSearch/.test(searchScreenTsx));
  ok('the accounts section is gated by the same minimum query length the hook itself enforces (consistent UX, no dead loading state below the floor)', /MIN_USER_SEARCH_QUERY_LENGTH/.test(searchScreenTsx));
  ok('selecting a user result calls the existing onOpenAuthor navigation (reuses the existing public-profile flow, no new profile screen)', /onClick=\{\(\) => onOpenAuthor\(user\.uid\)\}/.test(searchScreenTsx));
  ok('user result cards render only avatar + displayName, no other field from the search result object', /<Avatar photoURL=\{user\.photoURL\} name=\{user\.displayName\}/.test(searchScreenTsx));
}

console.log('\n[13] firestore.rules — comment creation AND comment likes are both TEMPORARILY reverted to direct client writes (Blaze billing bridge — see docs/KNOWN_ISSUES.md)');
{
  ok('the obsolete commentCooldowns subcollection is fully removed', !/commentCooldowns/.test(rulesTxt));
  ok('the obsolete 3s/15s duration-based comment-cooldown guards are fully removed (the TEMPORARY revert uses a new, shorter 5s window, not the old ones)', !/duration\.value\(3, 's'\)/.test(rulesTxt) && !/duration\.value\(15, 's'\)/.test(rulesTxt));
  // TEMPORARY (see docs/KNOWN_ISSUES.md) — comment creation is a real,
  // Rules-validated client-writable rule again, not `if false`. REVERT this
  // assertion back to checking `allow create: if false;` is the active rule
  // once the permanent re-migration happens.
  ok('comment creation is a real client-writable rule again (TEMPORARY revert), not denied outright', /match \/comments\/\{commentId\}[\s\S]{0,2500}?allow create: if isSignedIn\(\)/.test(rulesTxt));
  ok('the reverted create rule enforces the new, shorter 5s global-per-user cooldown', /duration\.value\(5, 's'\)/.test(rulesTxt));
  ok('the rateLimits bookkeeping subcollection is fully closed to every client read/write (defense-in-depth — still Admin-SDK-only, unaffected by the comment-create revert)', /match \/rateLimits\/\{document=\*\*\}[\s\S]{0,100}?allow read, write: if false;/.test(rulesTxt));
  ok('the likes/{likerUid} subcollection is defined, nested under comments/{commentId}', /match \/likes\/\{likerUid\}/.test(rulesTxt));
  // TEMPORARY (see docs/KNOWN_ISSUES.md) — comment likes are a real,
  // Rules-validated client-writable create/delete again, not `if false`.
  // REVERT this assertion back to checking total denial once the permanent
  // re-migration happens.
  ok('comment like create/delete are real client-writable rules again (TEMPORARY revert); update stays denied outright (this IS the double-toggle guard)', /One like document per \(comment, liker\)[\s\S]{0,2000}?match \/likes\/\{likerUid\}[\s\S]{0,300}?allow create: if isOwner\(likerUid\)[\s\S]{0,400}?allow update: if false;[\s\S]{0,100}?allow delete: if isOwner\(likerUid\);/.test(rulesTxt));
  ok('likes remain publicly readable, unaffected by the revert', /match \/likes\/\{likerUid\}[\s\S]{0,50}?allow read: if true;/.test(rulesTxt));
  ok('the old forged-diff pattern for likesCount (a stale, already-removed alternate implementation) is still absent — unrelated to the TEMPORARY accepted-risk likesCount ±1 branch this revert adds (see docs/KNOWN_ISSUES.md), which intentionally IS client-writable again', !/likesCount == resource\.data\.get\('likesCount'/.test(rulesTxt));
  ok('displayNameNormalized is allow-listed on user bootstrap create', /'displayNameNormalized'/.test(rulesTxt));
  ok('displayNameNormalized is locked (cannot change) on update, same as displayName/photoURL', /request\.resource\.data\.displayNameNormalized == resource\.data\.displayNameNormalized/.test(rulesTxt));
  // TEMPORARY (see docs/KNOWN_ISSUES.md) — the users/{uid} update rule has a
  // client-reachable lastCommentAt bump path again, paired with the
  // reverted direct comment write. REVERT this assertion back to checking
  // this path is ABSENT once the permanent re-migration happens.
  ok('the users/{uid} update rule has a client-reachable lastCommentAt bump path again (TEMPORARY revert)', /lastCommentAt == request\.time/.test(rulesTxt));
  ok('no overly-broad "allow read, write: if request.auth != null" catch-all pattern was introduced anywhere', !/allow read, write: if request\.auth != null/.test(rulesTxt));
  ok('the word "email" never appears as a real field name in an allow-listed keys() list (only in explanatory comments)', !/hasOnly\(\[[^\]]*'email'[^\]]*\]\)/.test(rulesTxt));
}

console.log('\n[14] Migration utility — dry-run by default, idempotent, emulator-only, fails CLOSED, documented production runbook');
{
  ok('dry-run is the default (--apply is required to actually write)', /const APPLY = process\.argv\.includes\('--apply'\)/.test(migrationTs));
  ok('skips any document that already has displayNameNormalized (idempotent re-run)', /already migrated.*idempotent skip/.test(migrationTs));
  ok('fails CLOSED (process.exit(1)) when FIRESTORE_EMULATOR_HOST is not set, not merely by omission of admin credentials', /if\s*\(!process\.env\.FIRESTORE_EMULATOR_HOST\)/.test(migrationTs) && /process\.exit\(1\)/.test(migrationTs));
  ok('the header documents a complete production runbook (dependency, credentials, IAM role, batching strategy)', /PRODUCTION MIGRATION RUNBOOK/.test(migrationTs));
  ok('the runbook explicitly names the minimum sufficient IAM role (not a broad Editor/Owner grant)', /roles\/datastore\.user/.test(migrationTs));
  ok('the runbook explicitly warns that the Admin SDK bypasses Firestore Security Rules', /bypasses Firestore Security Rules/.test(migrationTs));
  ok('the runbook explicitly states credentials must never be committed', /never be committed|never committed/.test(migrationTs));
  ok('targets the same emulator PROJECT_ID convention as the other Community emulator scripts', /PROJECT_ID = 'demo-community-rules-test'/.test(migrationTs));
}

console.log('\n[14b] functions/ — createComment/toggleCommentLike Cloud Functions, isolated sub-package, correct trust boundary');
{
  ok('functions/package.json depends on firebase-admin (the trust boundary for these two writes)', /"firebase-admin"/.test(functionsPackageJson));
  ok('functions/package.json depends on firebase-functions (2nd-gen)', /"firebase-functions"/.test(functionsPackageJson));
  ok('functions/ is a fully isolated sub-package (its own package.json, never merged into the root client dependency tree)', functionsPackageJson.includes('"name"'));
  ok('createComment is exported as an onCall function', /export const createComment = onCall/.test(functionsIndexTs));
  ok('toggleCommentLike is exported as an onCall function', /export const toggleCommentLike = onCall/.test(functionsIndexTs));
  ok('createComment throws unauthenticated when request.auth is missing (uid is never trusted from the payload)', /if \(!request\.auth\) throw new HttpsError\('unauthenticated'/.test(functionsIndexTs));
  ok('the caller uid is taken exclusively from request.auth.uid, never from request.data', /const uid = request\.auth\.uid;/.test(functionsIndexTs));
  ok('createComment enforces a rolling-window flood guard (a documented, tunable ceiling, not an unbounded allow)', /MAX_COMMENTS_PER_WINDOW/.test(functionsIndexTs));
  ok('createComment collapses an immediate duplicate-fingerprint retry into the ORIGINAL comment instead of creating a second one', /collapsed: true/.test(functionsIndexTs));
  ok('createComment never enforces any PER-POST cooldown that would block a second, distinct comment on the same post (the defect this correction pass fixes)', !/postId.*cooldown|per-post cooldown/i.test(functionsIndexTs));
  ok('toggleCommentLike takes an explicit desiredState (\'like\'|\'unlike\') rather than blindly inverting current state — a blind toggle is not retry-safe', /desiredState: 'like' \| 'unlike'/.test(functionsIndexTs));
  ok('toggleCommentLike writes the like doc and adjusts likesCount inside the SAME transaction (atomic, no split-write drift)', /runTransaction\(async tx/.test(functionsIndexTs) && /tx\.set\(likeRef/.test(functionsIndexTs) && /tx\.update\(commentRef, \{ likesCount: FieldValue\.increment/.test(functionsIndexTs));
  ok('a repeated "like" call on an already-liked comment is a true no-op (idempotent, never double-increments)', /already in the desired state/.test(functionsIndexTs));
}

console.log('\n[14c] firebase.json / src/lib/firebase.ts — Functions emulator wired end to end for local development and tests');
{
  ok('firebase.json declares the functions source directory', /"functions":\s*\{\s*\n\s*"source":\s*"functions"/.test(firebaseJson));
  ok('firebase.json declares a functions emulator port', /"functions":\s*\{\s*\n\s*"port":\s*5001/.test(firebaseJson));
  ok('src/lib/firebase.ts imports getFunctions/connectFunctionsEmulator from firebase/functions', /import\s*\{\s*getFunctions,\s*connectFunctionsEmulator\s*\}\s*from\s*'firebase\/functions'/.test(firebaseLibTs));
  ok('src/lib/firebase.ts exports a shared firebaseFunctions instance (the same one both hooks import)', /export const firebaseFunctions = getFunctions\(firebaseApp\)/.test(firebaseLibTs));
  ok('the emulator gate connects the Functions emulator alongside Firestore/Storage/Auth, only when explicitly opted in', /connectFunctionsEmulator\(firebaseFunctions, '127\.0\.0\.1', 5001\)/.test(firebaseLibTs));
}

console.log('\n[14d] PostDetail.tsx — bounded comment pagination wired into the UI');
{
  ok('imports and uses loadMoreComments from usePost', /loadMoreComments/.test(postDetailTsx));
  ok('renders a load-more control gated by commentsHasMore', /commentsHasMore/.test(postDetailTsx));
  ok('the retry button now calls retryComments (first-page reload), not a bare refresh', /onClick=\{retryComments\}/.test(postDetailTsx));
  ok('CommentsList\'s onCommentDeleted is wired to removeCommentLocally (no full re-fetch after a delete)', /onCommentDeleted=\{removeCommentLocally\}/.test(postDetailTsx));
  ok('CommentInput\'s onCommentAdded is wired to appendCreatedComment (single-doc upsert, not a full re-fetch after posting)', /onCommentAdded=\{appendCreatedComment\}/.test(postDetailTsx));
}

console.log('\n[15] Privacy leak scan — no email field anywhere in changed Community source (structural, repeatable)');
{
  const changedCommunityFiles = [
    'src/components/Community/utils/userSearch.ts',
    'src/components/Community/utils/firestorePaths.ts',
    'src/components/Community/utils/rateLimit.ts',
    'src/components/Community/utils/functionsError.ts',
    'src/components/Community/hooks/useCommentComposer.ts',
    'src/components/Community/hooks/useCommentLike.ts',
    'src/components/Community/hooks/usePost.ts',
    'src/components/Community/hooks/useSearch.ts',
    'src/components/Community/hooks/useUserSearch.ts',
    'src/components/Community/PostPage/CommentsList.tsx',
    'src/components/Community/PostPage/CommentInput.tsx',
    'src/components/Community/PostPage/PostDetail.tsx',
    'src/components/Community/Search/SearchScreen.tsx',
    'functions/src/index.ts',
  ];
  // Strips both // line comments and {/* JSX block */} comments — several
  // of these files (.ts and .tsx alike) legitimately document WHY no email
  // field exists, the actual privacy property under test; only real code
  // (a field name, a property access) should ever fail this assertion.
  const stripComments = (src: string): string =>
    src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').split('\n').filter(l => !l.trim().startsWith('//')).join('\n');

  for (const relPath of changedCommunityFiles) {
    const content = readFileSync(join(ROOT, relPath), 'utf8');
    ok(`${relPath} contains no reference to an "email" field in real code`, !/\bemail\b/i.test(stripComments(content)));
  }
  // types.ts and ensureCommunityUser.ts DO legitimately mention "email" — but
  // only inside explanatory comments about why it is deliberately absent,
  // never as an actual field name. Verified precisely, not just excluded.
  ok('types.ts never declares an actual "email" interface member anywhere', !/^\s*email[?:]/m.test(typesTs));
}

console.log('\n[17] Post likes (Phase 7) — schema/path helpers/Function are consistent; Rules and usePostLike.ts are TEMPORARILY reverted (Blaze billing bridge — see docs/KNOWN_ISSUES.md)');
{
  ok('Post.likesCount is declared', /likesCount\?:\s*number/.test(typesTs) && (typesTs.match(/likesCount\?:\s*number/g) ?? []).length >= 2);
  ok('PostLike interface exists, mirroring CommentLike', /export interface PostLike/.test(typesTs));
  ok('postLikesPath/postLikePath helpers exist in firestorePaths.ts', /export const postLikesPath/.test(firestorePathsTs) && /export const postLikePath/.test(firestorePathsTs));
  ok('firestore.rules requires likesCount == 0 at post creation', /request\.resource\.data\.likesCount == 0/.test(rulesTxt));
  ok('firestore.rules\' post create key allow-list includes likesCount', /'commentsCount', 'createdAt', 'status', 'searchTokens', 'likesCount'/.test(rulesTxt));
  // TEMPORARY (see docs/KNOWN_ISSUES.md) — post like create/delete are real
  // client-writable rules again, not `if false`. REVERT this assertion back
  // to checking total denial once the permanent re-migration happens.
  ok('post like create/delete are real client-writable rules again (TEMPORARY revert); update stays denied outright (this IS the double-toggle guard)', /One like document per \(post, liker\)[\s\S]{0,2000}?match \/likes\/\{likerUid\}[\s\S]{0,300}?allow create: if isOwner\(likerUid\)[\s\S]{0,400}?allow update: if false;[\s\S]{0,100}?allow delete: if isOwner\(likerUid\);/.test(rulesTxt));
  ok('togglePostLike is exported as an onCall function', /export const togglePostLike = onCall/.test(functionsIndexTs));
  ok('togglePostLike takes an explicit desiredState (\'like\'|\'unlike\') rather than blindly inverting current state', /export const togglePostLike[\s\S]{0,600}?desiredState/.test(functionsIndexTs));
  ok('togglePostLike writes the like doc and adjusts likesCount inside the SAME transaction (atomic, no split-write drift) — unchanged, still the intended permanent design', /tx\.set\(likeRef, \{ createdAt: FieldValue\.serverTimestamp\(\) \}\);\s*\n\s*tx\.update\(postRef, \{ likesCount: FieldValue\.increment/.test(functionsIndexTs));
  ok('cleanupPostLikes is exported as an onDocumentUpdated trigger scoped to posts/{postId}', /export const cleanupPostLikes = onDocumentUpdated\(\s*\n\s*\{ document: 'posts\/\{postId\}'/.test(functionsIndexTs));
  ok('cleanupPostLikes and cleanupCommentLikes share the same bounded-batch delete helper (no duplicated batching loop)', (functionsIndexTs.match(/deleteAllDocsInBatches\(/g) ?? []).length >= 3); // 1 definition + 2 call sites
  ok('useComposer.ts writes likesCount: 0 at post creation, alongside commentsCount: 0', /commentsCount: 0,\s*\n\s*likesCount: 0,/.test(useComposerTs));
  // TEMPORARY (see docs/KNOWN_ISSUES.md) — usePostLike.ts performs a direct
  // batch write again, not a callable invocation. REVERT this assertion
  // back to checking the httpsCallable('togglePostLike', ...) binding once
  // the permanent re-migration happens.
  ok('usePostLike.ts performs a direct batch write (create/delete like-doc + likesCount ±1), not a Cloud Function call (TEMPORARY revert)', !/httpsCallable|firebaseFunctions/.test(usePostLikeTs) && /writeBatch/.test(usePostLikeTs) && /batch\.set/.test(usePostLikeTs) && /batch\.delete/.test(usePostLikeTs));
}

console.log('\n[18] Post-like UI — one shared component, used consistently, accessible');
{
  ok('PostCard.tsx renders the shared PostLikeButton (feed, search results, public-profile posts, and saved posts all reuse PostCard, so this one wiring covers all of them)', /<PostLikeButton\b/.test(postCardTsx));
  ok('PostDetail.tsx renders the shared PostLikeButton', /<PostLikeButton\b/.test(postDetailTsx));
  ok('PostLikeButton is a single shared component, not duplicated per-screen', /export const PostLikeButton/.test(postLikeButtonTsx));
  ok('the like button is a real native <button>', /<button\b/.test(postLikeButtonTsx));
  ok('the accessible name is Arabic and flips between like/unlike (never color-only status)', /'إلغاء الإعجاب بهذا المنشور'/.test(postLikeButtonTsx) && /'أعجبني هذا المنشور'/.test(postLikeButtonTsx));
  ok('aria-pressed reflects the liked state', /aria-pressed=\{!isGuest && liked\}/.test(postLikeButtonTsx));
  ok('the Heart icon itself changes shape (fill), not just color, between states', /fill=\{liked \? '#dc2626' : 'none'\}/.test(postLikeButtonTsx));
  ok('the count span is always rendered (even as an empty string), so toggling never shifts layout', /likesCount > 0 \? likesCount : ''/.test(postLikeButtonTsx));
  ok('the button is disabled while a toggle is genuinely pending, preventing double-activation', /disabled=\{!isGuest && \(likedLoading \|\| toggling\)\}/.test(postLikeButtonTsx));
}

console.log('\n[19] CSP (vercel.json) — Cloud Functions and Storage domains are reachable (the deployed comment-publish/upload bug fix)');
{
  const cspHeader = vercelJson.match(/"Content-Security-Policy"[\s\S]*?"value": "([^"]+)"/)?.[1] ?? '';
  const connectSrc = cspHeader.match(/connect-src ([^;]+);/)?.[1] ?? '';
  ok('connect-src allows Cloud Functions callable invocation (the Functions SDK constructs URLs as https://{region}-{projectId}.cloudfunctions.net/{name} — confirmed from the installed SDK source)', connectSrc.includes('https://*.cloudfunctions.net'));
  ok('connect-src allows Firebase Storage (the Storage SDK\'s default host is firebasestorage.googleapis.com — confirmed from the installed SDK source)', connectSrc.includes('https://firebasestorage.googleapis.com'));
  const imgSrc = cspHeader.match(/img-src ([^;]+);/)?.[1] ?? '';
  ok('img-src also allows Firebase Storage, so uploaded post images actually render', imgSrc.includes('https://firebasestorage.googleapis.com'));
  ok('the pre-existing security headers (X-Frame-Options, HSTS, frame-ancestors) are untouched — this was a targeted connect-src/img-src addition, not a rewrite', /"X-Frame-Options", "value": "DENY"/.test(vercelJson) && /frame-ancestors 'none'/.test(vercelJson));
}

console.log('\n[20] Production displayNameNormalized migration — real, executable, fail-safe');
{
  ok('the production script is NOT part of the deployed Functions bundle (functions/tsconfig.json only includes "src")', !JSON.parse(readFileSync(join(ROOT, 'functions/tsconfig.json'), 'utf8')).include.includes('scripts'));
  ok('dry-run by default, requires explicit --apply to write', /const APPLY = process\.argv\.includes\('--apply'\)/.test(migrationProdTs));
  ok('requires an explicit --project flag — never guesses a target project', /Missing required --project/.test(migrationProdTs));
  ok('uses Application Default Credentials only — no service-account key file is read or embedded', /applicationDefault\(\)/.test(migrationProdTs) && !/require\(.*\.json/.test(migrationProdTs));
  ok('is idempotent — skips any document that already has displayNameNormalized', /already migrated — idempotent skip/.test(migrationProdTs));
  ok('skips malformed documents safely rather than crashing the whole run', /SKIP \(malformed\)/.test(migrationProdTs));
  ok('uses bounded pagination, never one unbounded collection read', /orderBy\('__name__'\)\.limit\(PAGE_SIZE\)/.test(migrationProdTs));
  ok('uses BulkWriter for batched/rate-limited/retried writes, not a manual tight loop', /db\.bulkWriter\(\)/.test(migrationProdTs));
}

console.log('\n[21] displayNameNormalized self-heal backfill (Phase 8) — narrow, owner-only, single-field');
{
  ok('ensureCommunityUser.ts backfills displayNameNormalized for an EXISTING document when missing/stale', /if \(data\.displayNameNormalized !== expectedNormalized\)/.test(ensureCommunityUserTs));
  ok('the backfill derives the normalized value from the document\'s OWN stored displayName, never from the freshly-passed identity param', /normalizeDisplayName\(storedDisplayName\)/.test(ensureCommunityUserTs));
  ok('the backfill is a single-field tx.update, never touching any other field', /tx\.update\(userRef, \{ displayNameNormalized: expectedNormalized \}\)/.test(ensureCommunityUserTs));
  ok('firestore.rules allows a displayNameNormalized-only update for the owner', /affectedKeys\(\)\.hasOnly\(\['displayNameNormalized'\]\)/.test(rulesTxt));
  ok('the backfill Rules branch is owner-gated (isOwner(uid) governs both update branches)', /allow update: if isOwner\(uid\)/.test(rulesTxt));
}

console.log('\n[22] Bottom-nav Home button — centralized reset signal for Community-internal state (Phase 8)');
{
  ok('BottomNavigation.tsx sends a fresh homeReset value in navigation state on every Home press, not just on route change', /navigate\('\/home', \{ state: \{ homeReset:/.test(bottomNavTsx));
  ok('the reset counter is a mutated ref (React-purity-rule-compliant), not an impure call inside the click handler itself', /homeResetCounterRef\.current \+= 1;\s*\n\s*navigate\('\/home', \{ state: \{ homeReset: homeResetCounterRef\.current \} \}\);/.test(bottomNavTsx));
  ok('HomeView.tsx watches location.state.homeReset and resets Community screen state on every fresh value', /const homeReset = \(location\.state as \{ homeReset\?: number \} \| null\)\?\.homeReset;/.test(homeViewTsx));
  ok('the reset collapses the internal screen stack back to the feed', /setScreen\(\{ name: 'feed' \}\);\s*\n\s*setMenuOpen\(false\);/.test(homeViewTsx));
  ok('the reset is guarded against re-firing on an unrelated re-render (compared against the last-seen value, not merely "is it defined")', /homeReset !== undefined && homeReset !== lastHomeResetRef\.current/.test(homeViewTsx));
}

console.log('\n[23] Secure image uploads for Community posts (Phase 9)');
{
  ok('MediaUploader.tsx exports an exact MIME allow-list (jpeg/png/webp), not a wildcard', /ALLOWED_IMAGE_MIME_TYPES\s*=\s*\['image\/jpeg',\s*'image\/png',\s*'image\/webp'\]/.test(mediaUploaderTsx));
  ok('the allow-list check function is exported for reuse by the composer\'s own pre-validation', /export const isAllowedImageMimeType/.test(mediaUploaderTsx));
  ok('verifyImageDecodable is exported — a genuine decode check, not merely a MIME/extension check', /export const verifyImageDecodable/.test(mediaUploaderTsx) && /createImageBitmap/.test(mediaUploaderTsx));
  ok('MAX_RAW_INPUT_BYTES (pre-compression ceiling) is exported for the composer to enforce before spending a compression pass', /export const MAX_RAW_INPUT_BYTES/.test(mediaUploaderTsx));
  ok('uploadMedia takes an explicit uid parameter — the path is uid-scoped, never trusted from anywhere else', /uploadMedia\s*=\s*async\s*\(\s*file:\s*File,\s*uid:\s*string,\s*postId:\s*string/.test(mediaUploaderTsx));
  ok('uploadMedia derives real width/height from the actual compressed output via verifyImageDecodable, never fabricated', /verifyImageDecodable\(fullBlob\)/.test(mediaUploaderTsx));
  ok('deleteMedia is exported — the orphan-cleanup primitive useComposer.ts calls on a failed post-create', /export const deleteMedia/.test(mediaUploaderTsx));
  ok('deleteMedia attempts both files independently via classifyAndRetryDelete (one failing never blocks the other)', /classifyAndRetryDelete\(\(\) => deleteObject\(fullRef\)/.test(mediaUploaderTsx) && /classifyAndRetryDelete\(\(\) => deleteObject\(thumbRef\)/.test(mediaUploaderTsx));
  ok('deleteMedia returns a structured MediaDeleteResult (derived via deriveMediaDeleteResult), not void — the correction-pass fix for the independent review\'s partial-failure finding', /deriveMediaDeleteResult\(full, thumbnail\)/.test(mediaUploaderTsx));

  ok('useComposer.ts passes currentUser.uid into uploadMedia (the uid segment is Auth-derived, never trusted from form data)', /uploadMedia\(imageFile,\s*currentUser\.uid,\s*postId/.test(useComposerTs));
  ok('useComposer.ts calls deleteMedia on a failed post-create AFTER a successful upload — the orphan-cleanup wiring', /const cleanup = await deleteMedia\(media\)/.test(useComposerTs));
  ok('useComposer.ts inspects the structured cleanup result rather than assuming success (correction pass)', /if \(!cleanup\.fullySucceeded\)/.test(useComposerTs));
  ok('useComposer.ts logs a partial/full cleanup failure without leaking a token-bearing download URL (only the outcome enum values)', /console\.error\('\[useComposer\] orphaned media cleanup did not fully succeed[\s\S]{0,120}full: cleanup\.full,[\s\S]{0,40}thumbnail: cleanup\.thumbnail,/.test(useComposerTs));
  ok('useComposer.ts still re-throws the ORIGINAL batchErr unconditionally, regardless of the cleanup outcome — the publish error is never replaced by a cleanup error', /throw batchErr;/.test(useComposerTs));
  ok('useComposer.ts writes mediaWidth/mediaHeight from the real uploaded media, never a hardcoded/fabricated value', /mediaWidth:\s*media\?\.width\s*\?\?\s*null/.test(useComposerTs) && /mediaHeight:\s*media\?\.height\s*\?\?\s*null/.test(useComposerTs));

  // CSP fix — vercel.json has no worker-src, which falls back to script-src
  // (no blob: entry), silently blocking browser-image-compression's
  // useWebWorker:true Worker creation. useWebWorker:false runs compression on
  // the main thread instead of widening the CSP to admit blob: workers.
  ok('MediaUploader.tsx compresses on the main thread (useWebWorker: false), not a CSP-blocked blob: Worker', /const IMAGE_COMPRESSION_OPTIONS = \{ useWebWorker: false \} as const;/.test(mediaUploaderTsx));
  ok('both the full-image and thumbnail imageCompression calls share the same useWebWorker setting via IMAGE_COMPRESSION_OPTIONS, not two independently-drifting literals', (mediaUploaderTsx.match(/\.\.\.IMAGE_COMPRESSION_OPTIONS/g) ?? []).length === 2);
  ok('a hard timeout wraps the combined compress+upload flow so a stalled network (or the pre-fix CSP deadlock) cannot leave submitting stuck true forever', /const MEDIA_UPLOAD_TIMEOUT_MS = 40_000;/.test(mediaUploaderTsx) && /withTimeout\(uploadMediaInner\(file, uid, postId, onProgress\), MEDIA_UPLOAD_TIMEOUT_MS\)/.test(mediaUploaderTsx));
  ok('the timeout race clears its own timer on settle either way (Promise.race + finally), leaving no dangling timer after a normal fast upload', /Promise\.race\(\[promise, timeout\]\)\.finally\(\(\) => clearTimeout\(timer\)\)/.test(mediaUploaderTsx));
  ok('MediaUploadTimeoutError is exported as a distinguishable type, not a plain Error a catch block would have to string-match', /export class MediaUploadTimeoutError extends Error/.test(mediaUploaderTsx));
  ok('useComposer.ts imports MediaUploadTimeoutError and shows a distinct, honest Arabic message for an upload timeout specifically (not the generic post-publish-failed message)', /import \{ uploadMedia, deleteMedia, MediaUploadTimeoutError, type UploadedMedia \} from '\.\.\/Composer\/MediaUploader';/.test(useComposerTs) && /err instanceof MediaUploadTimeoutError \? 'تعذّر رفع الصورة، حاول مرة أخرى' : 'تعذر نشر المنشور\. حاول مرة أخرى\.'/.test(useComposerTs));
  ok('the timeout error message is still surfaced through the existing single setError/finally{setSubmitting(false)} path — no new state variable, no new code path for retry (submitting simply becomes false again, same as any other error)', /setSubmitting\(false\);/.test(useComposerTs));

  ok('mediaDeleteRetry.ts exports MediaDeleteOutcome/MediaDeleteResult, classifyAndRetryDelete, and deriveMediaDeleteResult as a Storage-SDK-independent, unit-testable seam', /export type MediaDeleteOutcome/.test(mediaDeleteRetryTs) && /export async function classifyAndRetryDelete/.test(mediaDeleteRetryTs) && /export function deriveMediaDeleteResult/.test(mediaDeleteRetryTs));
  ok('classifyAndRetryDelete treats storage/object-not-found as "already-missing", not "failed" — idempotent cleanup counts as success', /code === 'storage\/object-not-found'/.test(mediaDeleteRetryTs) && /return 'already-missing';/.test(mediaDeleteRetryTs));
  ok('classifyAndRetryDelete only retries a bounded, named set of transient error codes — never storage/unauthorized (a retry cannot fix a permission denial)', /RETRYABLE_STORAGE_ERROR_CODES/.test(mediaDeleteRetryTs) && !/RETRYABLE_STORAGE_ERROR_CODES = new Set\(\[[\s\S]{0,200}storage\/unauthorized/.test(mediaDeleteRetryTs));
  ok('the retry loop is bounded by a fixed DELETE_MAX_RETRIES constant, never an unbounded/while(true) loop', /export const DELETE_MAX_RETRIES = 2;/.test(mediaDeleteRetryTs) && /for \(let attempt = 0; attempt <= DELETE_MAX_RETRIES; attempt\+\+\)/.test(mediaDeleteRetryTs));
  ok('deriveMediaDeleteResult never reports fullySucceeded=true when either object failed — failedCount drives all three flags from one source of truth', /const failedCount = \[full, thumbnail\]\.filter\(outcome => outcome === 'failed'\)\.length;/.test(mediaDeleteRetryTs));

  ok('PostComposer.tsx\'s image file input is no longer disabled', !/type="file"[\s\S]{0,200}disabled/.test(postComposerTsx));
  ok('PostComposer.tsx\'s "uploads disabled" messaging has been removed now that uploads are enabled', !/رفع الصور غير متاح حالياً/.test(postComposerTsx));
  ok('PostComposer.tsx validates MIME type before accepting a picked file', /isAllowedImageMimeType\(file\.type\)/.test(postComposerTsx));
  ok('PostComposer.tsx validates raw file size before accepting a picked file', /file\.size > MAX_RAW_INPUT_BYTES/.test(postComposerTsx));
  ok('PostComposer.tsx decode-verifies the file before accepting it (rejects a renamed non-image)', /verifyImageDecodable\(file\)/.test(postComposerTsx));
  ok('PostComposer.tsx offers a "replace image" affordance, not merely add/remove', /استبدال الصورة/.test(postComposerTsx));
  ok('the video button remains disabled and untouched (D4, out of scope for this phase)', /<Video size=\{16\} \/> فيديو/.test(postComposerTsx) && /قريباً/.test(postComposerTsx));

  ok('ImageLightbox.tsx exists and is portaled to document.body (escapes AppShell\'s stacking context, same convention as ReportButton/ProfileSheet)', /createPortal\(/.test(imageLightboxTsx) && /document\.body/.test(imageLightboxTsx));
  ok('ImageLightbox.tsx closes on Escape', /key === 'Escape'/.test(imageLightboxTsx));
  ok('ImageLightbox.tsx closes on backdrop click', /onClick=\{onClose\}/.test(imageLightboxTsx));
  ok('ImageLightbox.tsx has an explicit close button', /aria-label="إغلاق المعاينة"/.test(imageLightboxTsx));
  ok('ImageLightbox.tsx uses object-fit: contain — the full, uncropped image, unlike the feed thumbnail\'s intentional cover-crop', /objectFit:\s*'contain'/.test(imageLightboxTsx));
  ok('PostDetail.tsx wires the lightbox to the full post image', /ImageLightbox/.test(postDetailTsx) && /setPreviewOpen\(true\)/.test(postDetailTsx));
  ok('PostDetail.tsx reserves aspect-ratio space from the post\'s own real mediaWidth/mediaHeight (no layout shift)', /mediaWidth && post\.mediaHeight/.test(postDetailTsx));

  // Correction pass — independent-review-flagged accessibility gaps.
  ok('ImageLightbox.tsx exposes role="dialog" and aria-modal="true" with a meaningful Arabic label', /role="dialog"/.test(imageLightboxTsx) && /aria-modal="true"/.test(imageLightboxTsx) && /aria-label="معاينة الصورة بحجمها الكامل"/.test(imageLightboxTsx));
  ok('ImageLightbox.tsx focuses the close button when it opens', /closeButtonRef\.current\?\.focus\(\)/.test(imageLightboxTsx));
  ok('ImageLightbox.tsx traps Tab/Shift+Tab inside the dialog instead of letting focus escape to the page behind the backdrop', /e\.key !== 'Tab'/.test(imageLightboxTsx) && /e\.shiftKey && document\.activeElement === first/.test(imageLightboxTsx) && /!e\.shiftKey && document\.activeElement === last/.test(imageLightboxTsx));
  ok('ImageLightbox.tsx captures the pre-open focused element and restores focus to it on close/unmount', /const previouslyFocused = document\.activeElement/.test(imageLightboxTsx) && /previouslyFocused\?\.focus\(\)/.test(imageLightboxTsx));
  ok('ImageLightbox.tsx locks body scroll while open and restores the exact previous overflow value on close/unmount', /document\.body\.style\.overflow = 'hidden'/.test(imageLightboxTsx) && /document\.body\.style\.overflow = previousBodyOverflow/.test(imageLightboxTsx));
  ok('ImageLightbox.tsx removes its keydown listener on cleanup — no listener leak across opens/closes', /window\.removeEventListener\('keydown', onKeyDown\)/.test(imageLightboxTsx));
  ok('ImageLightbox.tsx\'s image alt text is a meaningful (non-empty) Arabic description, not decorative alt=""', /alt = 'صورة المنشور بحجمها الكامل'/.test(imageLightboxTsx));

  ok('storage.rules\' community-posts path now includes a {uid} segment', /match \/community\/posts\/\{uid\}\/\{postId\}\/\{fileName\}/.test(storageRulesTxt));
  ok('storage.rules\' write rule checks request.auth.uid == uid — real per-user path scoping, not merely "any active user"', /request\.auth\.uid == uid/.test(storageRulesTxt));
  ok('storage.rules uses an exact MIME allow-list, not a wildcard — SVG/GIF are structurally rejected', /contentType in \['image\/jpeg', 'image\/png', 'image\/webp'\]/.test(storageRulesTxt));
  ok('storage.rules never uses the broad "allow read, write: if request.auth != null" anti-pattern', !/allow read, write: if request\.auth != null/.test(storageRulesTxt));
  ok('storage.rules grants delete only to the path\'s own owner (required for useComposer.ts\'s client-side orphan cleanup)', /allow delete: if request\.auth != null && request\.auth\.uid == uid/.test(storageRulesTxt));

  ok('firestore.rules\' post-create allow-list includes mediaWidth/mediaHeight', /'mediaWidth', 'mediaHeight'/.test(rulesTxt));
  ok('firestore.rules\' image-post mediaPath check is uid-scoped (matches storage.rules\' own path shape exactly)', /mediaPath == 'community\/posts\/' \+ request\.auth\.uid \+ '\/' \+ postId/.test(rulesTxt));
  ok('firestore.rules bounds mediaWidth/mediaHeight to a sane positive ceiling, not merely "is a number"', /mediaWidth is number[\s\S]{0,60}mediaWidth > 0[\s\S]{0,60}mediaWidth <= 10000/.test(rulesTxt));

  ok('cleanupPostMedia is exported as an onDocumentUpdated trigger scoped to posts/{postId}', /export const cleanupPostMedia = onDocumentUpdated\(\s*\{ document: 'posts\/\{postId\}'/.test(functionsIndexTs));
  ok('cleanupPostMedia uses the same active->non-active guard as cleanupPostLikes (self-terminating, no cascade)', (functionsIndexTs.match(/if \(before\.status !== 'active' \|\| after\.status === 'active'\) return;/g) ?? []).length >= 2);
  ok('cleanupPostMedia no-ops on a text-only post (no mediaPath to clean up)', /if \(!mediaPath\) return;/.test(functionsIndexTs));
  ok('cleanupPostMedia deletes via the Admin Storage SDK (bypasses storage.rules by design, same trust model as the Firestore cleanup triggers)', /getStorage\(\)\.bucket\(\)\.getFiles\(\{ prefix: `\$\{mediaPath\}\/` \}\)/.test(functionsIndexTs));
  ok('cleanupPostMedia never crashes the trigger on a Storage error (try/catch around the delete)', /\[cleanupPostMedia\] postId=\$\{event\.params\.postId\} failed/.test(functionsIndexTs));

  // Correction pass — the independent review found the function's own doc
  // comment claimed a single bucket.deleteFiles({ prefix }) call while the
  // real code does getFiles({ prefix }) + a per-file delete(). The comment
  // is now corrected to match; these assertions pin BOTH the corrected
  // comment text and the real implementation so they can never silently
  // diverge again.
  ok('cleanupPostMedia\'s doc comment accurately describes getFiles({ prefix }) + per-file delete(), not a nonexistent bucket.deleteFiles({ prefix }) call', /bucket\.getFiles\(\{ prefix \}\) below treats "no/.test(functionsIndexTs) && !/bucket\.deleteFiles\(\{ prefix \}\) treats "no/.test(functionsIndexTs));
  ok('cleanupPostMedia\'s actual delete call really is getFiles + Promise.all(files.map(file => file.delete()...)), matching the corrected comment', /const \[files\] = await getStorage\(\)\.bucket\(\)\.getFiles\(\{ prefix: `\$\{mediaPath\}\/` \}\);/.test(functionsIndexTs) && /await Promise\.all\(files\.map\(file => file\.delete\(\)\.catch/.test(functionsIndexTs));
}

console.log('\n[24] Image-only publish is independently valid (composer audit correction pass)');
{
  ok('PostComposer.tsx derives hasValidText and hasValidImage as two SEPARATE conditions, not one dependent on the other', /const hasValidText = text\.trim\(\)\.length > 0;/.test(postComposerTsx) && /const hasValidImage = imageFile !== null;/.test(postComposerTsx));
  ok('PostComposer.tsx\'s canSubmit is (hasValidText || hasValidImage) && !submitting — the exact root-cause fix, not hasValidText alone', /const canSubmit = \(hasValidText \|\| hasValidImage\) && !submitting;/.test(postComposerTsx));
  ok('PostComposer.tsx no longer gates canSubmit on text length alone (the pre-fix defect pattern is fully gone, not merely supplemented)', !/const canSubmit = text\.trim\(\)\.length > 0 && !submitting;/.test(postComposerTsx));
  ok('PostComposer.tsx\'s textarea placeholder becomes optional/caption-oriented once an image is selected', /imageFile \? 'أضف وصفًا أو سؤالًا للصورة/.test(postComposerTsx));
  ok('PostComposer.tsx shows an honest "الصورة جاهزة للنشر" readiness status once a valid image is locally ready (and not yet submitting)', /الصورة جاهزة للنشر/.test(postComposerTsx));
  ok('PostComposer.tsx distinguishes an uploading phase ("جارٍ رفع الصورة...") from a publishing phase ("جارٍ نشر المنشور...") rather than one generic label for every case', /جارٍ رفع الصورة\.\.\./.test(postComposerTsx) && /جارٍ نشر المنشور\.\.\./.test(postComposerTsx));
  ok('PostComposer.tsx disables the remove-image button while submitting (no conflicting mutation of in-flight state)', /onClick=\{removeImage\}\s*\n\s*disabled=\{submitting\}/.test(postComposerTsx));
  ok('PostComposer.tsx disables the add/replace-image button while submitting too, not only while validating', /disabled=\{validatingImage \|\| submitting\}/.test(postComposerTsx));
  ok('PostComposer.tsx wraps its readiness/validation/error status in an aria-live region for screen-reader announcements', /aria-live="polite"/.test(postComposerTsx));
  ok('PostComposer.tsx\'s image preview alt text is meaningful, not decorative alt=""', /alt="معاينة الصورة المختارة قبل النشر"/.test(postComposerTsx));

  ok('firestore.rules no longer requires text.size() > 0 unconditionally for every post (the pre-fix defect that would deny image-only posts even after the UI fix)', !/request\.resource\.data\.text\.size\(\) > 0\s*\n\s*&& request\.resource\.data\.text\.size\(\) <= 2000/.test(rulesTxt));
  ok('firestore.rules allows empty text specifically when mediaType == "image" (image-only publish, server-side)', /request\.resource\.data\.mediaType == 'image'\s*\n\s*\|\| !request\.resource\.data\.text\.matches\('\^\\\\s\*\$'\)/.test(rulesTxt));
  ok('firestore.rules still requires genuinely non-whitespace text for a text-only post (mediaType != "image") via a whole-string whitespace regex, not merely text.size() > 0', /matches\('\^\\\\s\*\$'\)/.test(rulesTxt));

  ok('PostCard.tsx (shared by feed/search/profile/saved) only renders the post-text paragraph when there is real text — no meaningless empty <p> for image-only posts', /\{post\.text && \(/.test(postCardTsx) && /Image-only posts have text: ''/.test(postCardTsx));
  ok('PostDetail.tsx only renders the post-text paragraph when there is real text — same fix as PostCard.tsx', /\{post\.text && \(/.test(postDetailTsx) && /Image-only posts have text: ''/.test(postDetailTsx));
}

console.log('\n[25] Community feed ranking (Phase 2)');
{
  ok('types.ts declares feedScore, feedScoreComputedAt, and feedScoreFrozen on Post', /feedScore\?: number;/.test(typesTs) && /feedScoreComputedAt\?: Timestamp \| null;/.test(typesTs) && /feedScoreFrozen\?: boolean;/.test(typesTs));

  ok('firestore.rules\' post-create allow-list includes all three new feedScore* fields', /'feedScore', 'feedScoreComputedAt', 'feedScoreFrozen'/.test(rulesTxt));
  ok('firestore.rules requires feedScore == 100 exactly at creation (the approved formula\'s freshness(0) constant, never a client-computed value)', /request\.resource\.data\.feedScore == 100/.test(rulesTxt));
  ok('firestore.rules allows feedScoreComputedAt to be absent OR null at creation, never a forged timestamp', /!\('feedScoreComputedAt' in request\.resource\.data\)\s*\n\s*\|\| request\.resource\.data\.feedScoreComputedAt == null/.test(rulesTxt));
  ok('firestore.rules allows feedScoreFrozen to be absent OR false at creation, never a forged true', /!\('feedScoreFrozen' in request\.resource\.data\)\s*\n\s*\|\| request\.resource\.data\.feedScoreFrozen == false/.test(rulesTxt));
  ok('firestore.rules documents that feedScore has no client-writable update path at all (same trust boundary as likesCount)', /feedScore \/ feedScoreComputedAt \/ feedScoreFrozen \(Phase 2\) have NO/.test(rulesTxt));

  ok('firestore.indexes.json includes the status+feedScore+createdAt composite index for the ranked default feed query', /"fieldPath": "feedScore", "order": "DESCENDING"/.test(indexesJson) && /"fieldPath": "createdAt", "order": "DESCENDING"/.test(indexesJson));
  ok('firestore.indexes.json includes the status+feedScoreFrozen+feedScore composite index for the scheduled recompute function\'s own query', /"fieldPath": "feedScoreFrozen", "order": "ASCENDING"/.test(indexesJson));

  ok('feedRanking.ts exports the exact approved constants: 40h momentum window, 9-day recompute horizon, 2h velocity window', /MOMENTUM_WINDOW_HOURS = 40/.test(feedRankingTs) && /RECOMPUTE_HORIZON_MS = 9 \* 24 \* 60 \* 60 \* 1000/.test(feedRankingTs) && /VELOCITY_WINDOW_MS = 2 \* 60 \* 60 \* 1000/.test(feedRankingTs));
  ok('feedRanking.ts\'s freshness() uses the corrected ^1.5 exponent, not a linear fade', /Math\.pow\(remaining, 1\.5\)/.test(feedRankingTs));
  ok('feedRanking.ts\'s engagementScore() is sqrt-dampened (anti-gaming), not a raw linear count', /Math\.sqrt\(Math\.max\(0, likesCount\)\)/.test(feedRankingTs) && /Math\.sqrt\(Math\.max\(0, commentsCount\)\)/.test(feedRankingTs));
  ok('feedRanking.ts\'s velocityBonus() is capped (VELOCITY_CAP=150), never unbounded', /const VELOCITY_CAP = 150;/.test(feedRankingTs) && /Math\.min\(VELOCITY_CAP, raw\)/.test(feedRankingTs));
  ok('feedRanking.ts\'s computeFeedScore() caps the final result at SCORE_CAP=1000', /Math\.min\(SCORE_CAP, raw\)/.test(feedRankingTs));
  ok('feedRanking.ts\'s recomputeFeedScoresBatch queries only active, unfrozen posts (bounds the candidate set over time)', /where\('status', '==', 'active'\)/.test(feedRankingTs) && /where\('feedScoreFrozen', '==', false\)/.test(feedRankingTs));
  ok('feedRanking.ts batches writes in bounded groups (Firestore\'s 500-write batch limit), same pattern as index.ts\'s deleteAllDocsInBatches', /FEED_SCORE_BATCH_SIZE = 500/.test(feedRankingTs));

  ok('functions/src/index.ts wires recomputeFeedScores as a genuine onSchedule export, not deployed automatically by this phase', /export const recomputeFeedScores = onSchedule\('every 10 minutes', /.test(functionsIndexTs));

  ok('useComposer.ts writes feedScore: 100 at post creation (a fixed constant, not an import from functions/src which would pull firebase-admin into the client bundle)', /feedScore: 100,/.test(useComposerTs));

  ok('useFeed.ts\'s unfiltered "all" feed orders by feedScore desc then createdAt desc (the required determinism tiebreaker)', /orderBy\('feedScore', 'desc'\)/.test(useFeedTs) && /orderBy\('createdAt', 'desc'\)/.test(useFeedTs));
  ok('useFeed.ts fetches a 30-candidate window (3x PAGE_SIZE), the approved candidatePageSize, not the 20-candidate alternative', /CANDIDATE_PAGE_SIZE = 30/.test(useFeedTs));
  ok('useFeed.ts\'s category-filtered path is unchanged — still plain createdAt-desc, no ranking, no diversity filter (Section M\'s explicit scoping; Phase 10 extracted the query into chronologicalConstraints(), typed PostCategory directly, so the cast now lives at each call site instead of next to where())', /loadChronologicalPage/.test(useFeedTs) && /where\('category', '==', category\)/.test(useFeedTs) && /chronologicalConstraints\(category as PostCategory, cursorRef\.current\)/.test(useFeedTs));
  ok('useFeed.ts delegates diversity/newest-post-guarantee logic to the Firebase-free utils/feedDiversity module, not reimplemented inline', /from '\.\.\/utils\/feedDiversity'/.test(useFeedTs));

  ok('feedDiversity.ts enforces the approved caps: max 2 posts/author, max 4 posts/category per displayed page', /AUTHOR_DIVERSITY_CAP = 2/.test(feedDiversityTs) && /CATEGORY_DIVERSITY_CAP = 4/.test(feedDiversityTs));
  ok('feedDiversity.ts\'s greedy fill defers excess candidates rather than discarding them outright', /deferred\.push\(post\);/.test(feedDiversityTs));
  ok('feedDiversity.ts\'s newest-post guarantee looks for the newest post within the already-fetched stream before falling back to a separately-supplied candidate', /combinedStream\.find\(p => p\.id === newestCandidate\.id\)/.test(feedDiversityTs));

  ok('CommentsList.tsx adds an opt-in "top comments" toggle without changing the default chronological order', /type CommentSortMode = 'oldest' \| 'top';/.test(commentsListTsx) && /useState<CommentSortMode>\('oldest'\)/.test(commentsListTsx));
  ok('CommentsList.tsx\'s top-comment score uses sqrt(likesCount) with a small per-hour age penalty, never Date.now() or a ref read during render (React purity)', /Math\.sqrt\(comment\.likesCount \?\? 0\) - 0\.02 \* ageHours/.test(commentsListTsx) && /setTopSortComputedAt\(Date\.now\(\)\)/.test(commentsListTsx));
}

console.log('\n[26] Notifications system (Phase 1, in-app only) + persistent search bar');
{
  ok('types.ts declares the CommunityNotification/CommunityNotificationWithId, DeviceToken, and Announcement/AnnouncementWithId interfaces', /export interface CommunityNotification\b/.test(typesTs) && /export interface CommunityNotificationWithId/.test(typesTs) && /export interface DeviceToken/.test(typesTs) && /export interface Announcement\b/.test(typesTs) && /export interface AnnouncementWithId/.test(typesTs));
  ok('types.ts\'s NotificationType enumerates exactly the 5 approved kinds', /export type NotificationType = 'follow' \| 'like_post' \| 'like_comment' \| 'comment' \| 'announcement';/.test(typesTs));

  ok('firestorePaths.ts exports notificationsPath/notificationPath (owner-scoped subcollection, savedPosts precedent)', /export const notificationsPath = \(uid: string\)/.test(firestorePathsTs) && /export const notificationPath = \(uid: string, notificationId: string\)/.test(firestorePathsTs));
  ok('firestorePaths.ts exports deviceTokensPath/deviceTokenPath', /export const deviceTokensPath = \(uid: string\)/.test(firestorePathsTs) && /export const deviceTokenPath = \(uid: string, tokenId: string\)/.test(firestorePathsTs));
  ok('firestorePaths.ts exports announcementPath (top-level collection)', /export const announcementPath = \(announcementId: string\)/.test(firestorePathsTs));

  ok('firestore.rules\' notifications create rule is anti-forgery: every branch requires exists()/get() proof against an already-committed primary artifact, never shape-only trust', /Anti-forgery design: every create branch below requires proof/.test(rulesTxt));
  ok('firestore.rules\' follow-notification branch requires a real, already-committed following relation', /exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(request\.auth\.uid\)\/following\/\$\(uid\)\)/.test(rulesTxt));
  ok('firestore.rules\' like_post branch requires both a real like doc AND the recipient to really be that post\'s author', /exists\(\/databases\/\$\(database\)\/documents\/posts\/\$\(request\.resource\.data\.targetId\)\/likes\/\$\(request\.auth\.uid\)\)/.test(rulesTxt) && /get\(\/databases\/\$\(database\)\/documents\/posts\/\$\(request\.resource\.data\.targetId\)\)\.data\.authorId == uid\)/.test(rulesTxt));
  ok('firestore.rules\' comment-notification branch checks the REAL comment author (get(), not the caller\'s claimed actorId)', /get\(\/databases\/\$\(database\)\/documents\/posts\/\$\(request\.resource\.data\.postId\)\/comments\/\$\(request\.resource\.data\.targetId\)\)\.data\.authorId == request\.auth\.uid/.test(rulesTxt));
  ok('firestore.rules\' announcement-notification branch is self-write only (auth.uid == uid), the mirror of every other branch\'s auth.uid != uid', /request\.resource\.data\.type == 'announcement'[\s\S]{0,80}request\.auth\.uid == uid/.test(rulesTxt));
  ok('firestore.rules\' notification read-state update is bounded to the read field alone via hasOnly()', /request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\(\['read'\]\)/.test(rulesTxt));
  ok('firestore.rules\' deviceTokens subcollection is fully private (owner read/write only), never publicly readable like posts/likes', /Unlike almost every other document in this app, tokens are NEVER/.test(rulesTxt));
  ok('firestore.rules\' announcements collection is moderator-create, signed-in-read, reusing the existing isModerator() function (no new auth infrastructure)', /match \/announcements\/\{announcementId\}/.test(rulesTxt) && /allow create: if isModerator\(\)/.test(rulesTxt));

  ok('useFollow.ts issues the follow-notification write as a SEPARATE write strictly AFTER the transaction commits, never inside it', /ACCEPTED TRADE-OFF/.test(useFollowTs) && /type: 'follow'/.test(useFollowTs));
  ok('useFollow.ts never fires a notification on unfollow (one-directional: follow only)', (() => {
    const followFnMatch = useFollowTs.match(/const follow = useCallback[\s\S]*?\n {2}\}, \[/);
    const unfollowFnMatch = useFollowTs.match(/const unfollow = useCallback[\s\S]*?\n {2}\}, \[/);
    return !!followFnMatch && /type: 'follow'/.test(followFnMatch[0]) && !!unfollowFnMatch && !/notificationsPath/.test(unfollowFnMatch[0]);
  })());

  ok('usePostLike.ts takes authorId and only notifies on a genuine new like by someone other than the post\'s own author', /usePostLike = \(postId: string, authorId: string\)/.test(usePostLikeTs) && /!wasLiked && authorId !== currentUid/.test(usePostLikeTs) && /ACCEPTED TRADE-OFF/.test(usePostLikeTs));
  ok('useCommentLike.ts takes authorId and only notifies on a genuine new like by someone other than the comment\'s own author', /useCommentLike = \(postId: string, commentId: string, authorId: string\)/.test(useCommentLikeTs) && /authorId !== currentUid/.test(useCommentLikeTs) && /ACCEPTED TRADE-OFF/.test(useCommentLikeTs));
  ok('useCommentComposer.ts\'s createComment takes postAuthorId and never notifies when commenting on your own post', /createComment: \(postId: string, text: string, postAuthorId: string\)/.test(useCommentComposerTs) && /postAuthorId !== currentUser\.uid/.test(useCommentComposerTs) && /ACCEPTED TRADE-OFF/.test(useCommentComposerTs));
  ok('PostLikeButton.tsx/CommentInput.tsx thread authorId/postAuthorId down from data already in scope at the call site, no new Firestore read added', /authorId: string;/.test(postLikeButtonTsx) && /usePostLike\(postId, authorId\)/.test(postLikeButtonTsx) && /postAuthorId: string;/.test(commentInputTsx) && /createComment\(postId, trimmed, postAuthorId\)/.test(commentInputTsx));
  ok('PostCard.tsx and PostDetail.tsx pass authorId={post.authorId} into PostLikeButton', /authorId=\{post\.authorId\}/.test(postCardTsx) && /authorId=\{post\.authorId\}/.test(postDetailTsx));
  ok('PostDetail.tsx passes postAuthorId={post.authorId} into CommentInput', /postAuthorId=\{post\.authorId\}/.test(postDetailTsx));

  ok('useNotifications.ts is a one-shot fetch + manual refresh (no onSnapshot listener call), matching useFollow.ts\'s convention — useFeed.ts itself moved to a live first page in Phase 10, so it is no longer this comparison\'s reference example', !/onSnapshot\(/.test(useNotificationsTs) && /refresh: load/.test(useNotificationsTs));
  ok('useNotifications.ts computes unreadCount via getCountFromServer on a bare where(\'read\',\'==\',false) — no composite index needed', /getCountFromServer\(unreadQuery\)/.test(useNotificationsTs) && /where\('read', '==', false\)/.test(useNotificationsTs));
  ok('useNotifications.ts orders the list by createdAt desc, bounded by a PAGE_SIZE limit — no unbounded read', /orderBy\('createdAt', 'desc'\)/.test(useNotificationsTs) && /limit\(PAGE_SIZE\)/.test(useNotificationsTs));

  ok('useLessonReminder.ts is fully Firestore-independent — no firebase import at all, derived purely from local progress state', !/firebase/.test(useLessonReminderTs) && /useProgressContext/.test(useLessonReminderTs));
  ok('useLessonReminder.ts captures Date.now() as state from an effect, never calling it inline during render/useMemo (React purity — same pattern CommentsList.tsx already established)', /useEffect\(\(\) => \{ setNow\(Date\.now\(\)\); \}, \[\]\);/.test(useLessonReminderTs) && !/if \(Date\.now\(\)/.test(useLessonReminderTs));
  ok('storageKeys.ts declares the LESSON_REMINDER_LAST_SHOWN throttle key', /LESSON_REMINDER_LAST_SHOWN: 'fpv_lesson_reminder_last_shown',/.test(storageKeysTs));

  ok('NotificationsScreen.tsx receives notifications/loading/error/markAsRead as PROPS, not a second useNotifications() call — avoids desyncing from the header badge', /notifications: CommunityNotificationWithId\[\];/.test(notificationsScreenTsx) && !/= useNotifications\(/.test(notificationsScreenTsx));
  ok('NotificationsScreen.tsx renders the lesson-progress reminder as a local, client-only entry merged into the same inbox surface', /useLessonReminder\(\)/.test(notificationsScreenTsx) && /لم تكمل هذا الدرس بعد/.test(notificationsScreenTsx));
  ok('NotificationsScreen.tsx lazily fetches an announcement\'s title/body only for announcement-type entries (the notification doc itself carries no title/body)', /AnnouncementRow/.test(notificationsScreenTsx) && /getDoc\(doc\(firestoreDb, announcementPath\(announcementId\)\)\)/.test(notificationsScreenTsx));

  ok('HomeView.tsx owns a SINGLE useNotifications() instance shared between CommunityHome\'s badge and NotificationsScreen\'s list', (homeViewTsx.match(/useNotifications\(\)/g) ?? []).length === 1);
  ok('HomeView.tsx\'s homeReset effect also refreshes notifications, and documents why it depends on notifications.refresh (a stable useCallback) rather than the whole notifications object', /notifications\.refresh\(\);/.test(homeViewTsx) && /the `notifications` object itself is a new literal every render/.test(homeViewTsx));

  ok('CommunityHome.tsx replaces the small search-icon button with a persistent, always-visible pill-style search bar (readOnly input, onFocus\\/onClick navigation)', !/aria-label="بحث"[\s\S]{0,10}<\/button>/.test(communityHomeTsx) && /readOnly[\s\S]{0,40}onFocus=\{onOpenSearch\}/.test(communityHomeTsx) && /onClick=\{onOpenSearch\}/.test(communityHomeTsx));
  ok('CommunityHome.tsx adds a notification bell button with an unread-count badge, wired to onOpenNotifications/unreadNotificationsCount props', /onOpenNotifications: \(\) => void;/.test(communityHomeTsx) && /unreadNotificationsCount: number;/.test(communityHomeTsx) && /onClick=\{onOpenNotifications\}/.test(communityHomeTsx) && /unreadNotificationsCount > 9 \? '9\+' : unreadNotificationsCount/.test(communityHomeTsx));

  ok('no service worker file was created (Stage 3 — push — is explicitly out of scope for this phase)', !existsSync(join(ROOT, 'public/firebase-messaging-sw.js')));
  ok('vercel.json was NOT touched for this phase (no worker-src/FCM CSP entries added yet — that is Stage 3)', !/worker-src/.test(vercelJson) && !/firebaseinstallations|fcm\.googleapis/.test(vercelJson));
}

console.log('\n[27] Real-time feed + comments/likes (Phase 10)');
{
  ok('useFeed.ts now takes an `active` parameter (screen-based attach/detach), not just category', /export const useFeed = \(category: FeedCategory, active: boolean\): UseFeedResult =>/.test(useFeedTs));
  ok('useFeed.ts imports onSnapshot for the live first-page listener', /\bonSnapshot\b/.test(useFeedTs));
  ok('the live listener attach\\/detach effect is keyed on [category, active, refreshTick] — not on component unmount alone (CommunityHomeScreens never unmounts)', /\}, \[category, active, refreshTick\]\);/.test(useFeedTs));
  ok('category changes force a full reset (a resetKey comparison), but an active-only change does not wipe already-loaded pages/scroll state', /const resetKey = `\$\{category\}:\$\{refreshTick\}`;/.test(useFeedTs) && /lastResetKeyRef\.current !== resetKey/.test(useFeedTs));
  ok('pagination is locked (loadMore owns cursorRef\\/carryOverRef\\/hasMore from then on) synchronously BEFORE the async fetch starts, closing the race with a concurrent live update', /paginationLockedRef\.current = true;/.test(useFeedTs) && /Lock BEFORE the async fetch starts/.test(useFeedTs));
  ok('seenIdsRef is REPLACED (not accumulated) by the live listener while unlocked — a post that transiently passes through the live top-N window and gets pushed back out must remain reachable via loadMore, not permanently hidden', /seenIdsRef\.current = new Set\(displayed\.map\(p => p\.id\)\)/.test(useFeedTs) && /seenIdsRef\.current = new Set\(freshBatch\.map\(p => p\.id\)\)/.test(useFeedTs));
  ok('the live-prefix\\/one-shot-tail splice boundary (liveDisplayedCountRef) updates on every snapshot regardless of lock state, not frozen at lock time (a second post-lock update would otherwise slice at a stale index)', /liveDisplayedCountRef\.current = displayed\.length;/.test(useFeedTs) && /liveDisplayedCountRef\.current = freshBatch\.length;/.test(useFeedTs));
  ok('pages beyond the first (loadMore) remain a plain one-shot getDocs fetch, unchanged in shape from before this feature', /const loadRankedPage = useCallback\(async \(localRequestId: number\)/.test(useFeedTs) && /const loadChronologicalPage = useCallback\(async \(localRequestId: number\)/.test(useFeedTs));

  ok('usePost.ts\'s post document is now a live onSnapshot listener (gives live likesCount + live status), not a one-shot getDoc', /const unsubscribe = onSnapshot\(\s*doc\(firestoreDb, postPath\(postId\)\),/.test(usePostTs));
  ok('comments pagination itself stays exactly the one-shot cursor model (fetchCommentsPage\\/loadMoreComments untouched)', /const fetchCommentsPage = async \(/.test(usePostTs) && /const loadMoreComments = useCallback/.test(usePostTs));
  ok('a SEPARATE comments-tail live listener exists, gated so it can only ever attach once commentsHasMore is false (never while more already-existing, not-yet-paginated comments remain)', /if \(commentsState\.hasMore\) return undefined;/.test(usePostTs) && /tailAttachedGenerationRef/.test(usePostTs));
  ok('the tail listener queries the FULL comment thread (not startAfter(cursor)) specifically so a like on an ALREADY-loaded comment can ride along too, not just brand-new comments', /where\('status', '==', 'active'\),\s*orderBy\('createdAt', 'asc'\),\s*limit\(COMMENTS_TAIL_SAFETY_LIMIT\),\s*\);/.test(usePostTs));
  ok('the tail listener attaches at most once per postId generation (tailAttachedGenerationRef guard), even though its effect re-runs on every loading/hasMore/error change during normal pagination', /if \(tailAttachedGenerationRef\.current === myGeneration\) return undefined;/.test(usePostTs));

  ok('HomeView.tsx threads `screen.name === \'feed\'` into useFeed as the active flag', /useFeed\(category, screen\.name === 'feed'\)/.test(homeViewTsx));

  ok('the test-only real-time harness (RealtimeHarness.tsx) exists and is never imported by any real application entry point', existsSync(join(ROOT, 'src/components/Community/testHelpers/RealtimeHarness.tsx')) &&
    !homeViewTsx.includes('RealtimeHarness') && !communityHomeTsx.includes('RealtimeHarness'));
  ok('scripts/testCommunityRealtime.ts exists as a permanent live-browser regression suite for this feature', existsSync(join(ROOT, 'scripts/testCommunityRealtime.ts')));
}

console.log('\n[28] Admin dashboard (Phase 2) — reports review, user ban/unban, announcement creation');
{
  ok('types.ts declares ReportWithId', typesTs.includes('interface ReportWithId extends Report'));

  ok('firestore.rules opens reports read to isModerator() only (no longer allow read: if false)',
    /match \/reports\/\{reportId\} \{[\s\S]*?allow read: if isModerator\(\);/.test(rulesTxt));
  ok('firestore.rules scopes the reports update to a resolved-only, true-only flip',
    rulesTxt.includes("request.resource.data.diff(resource.data).affectedKeys().hasOnly(['resolved'])") &&
    rulesTxt.includes('request.resource.data.resolved == true'));
  ok('firestore.rules adds a status-only isModerator() branch to users/{uid} update, excluding self-targeting and role',
    rulesTxt.includes('isModerator()\n                      && uid != request.auth.uid') &&
    rulesTxt.includes("request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status'])") &&
    rulesTxt.includes("request.resource.data.status in ['active', 'banned']"));
  ok('firestore.indexes.json adds the resolved+createdAt composite index for reports',
    indexesJson.includes('"collectionGroup": "reports"') && indexesJson.includes('"fieldPath": "resolved"'));

  ok('useIsModerator.ts reads the caller\'s OWN users/{uid} doc (no Rules change needed — already publicly readable)',
    useIsModeratorTs.includes('userPath(currentUser.uid)'));
  ok('useIsModerator.ts derives isModerator/loading by comparing fetched-for uid against the current identity — no synchronous setState-to-reset in its effect',
    useIsModeratorTs.includes('state.uid === currentUid'));

  ok('ProfileSheet.tsx renders the لوحة الإشراف row only when isModerator is true',
    profileSheetTsx.includes('لوحة الإشراف') && /isModerator && onOpenAdmin/.test(profileSheetTsx));

  ok('HomeView.tsx adds an \'admin\' screen to the Screen union', homeViewTsx.includes("{ name: 'admin' }"));
  ok('HomeView.tsx wires a SEPARATE useIsModerator() instance for the ProfileSheet gate (AdminDashboard calls its own)',
    homeViewTsx.includes('useIsModerator()'));
  ok('AdminDashboard.tsx independently calls useIsModerator() itself rather than trusting a passed-down boolean',
    adminDashboardTsx.includes('useIsModerator()') &&
    adminDashboardTsx.includes('!loading && !isModerator'));

  ok('useReportsQueue.ts queries reports where resolved==false ordered by createdAt asc, paginated like existing hooks',
    useReportsQueueTs.includes("where('resolved', '==', false)") &&
    useReportsQueueTs.includes("orderBy('createdAt', 'asc')") &&
    useReportsQueueTs.includes('PAGE_SIZE'));
  ok('useReportsQueue.ts marks resolved via the resolved-only Rules path, never any other field',
    useReportsQueueTs.includes("updateDoc(doc(firestoreDb, REPORTS_COLLECTION, reportId), { resolved: true })"));
  ok('useReportsQueue.ts hides the reported post OR comment depending on targetType, reusing the existing isModerator() hide paths',
    useReportsQueueTs.includes("report.targetType === 'post'") &&
    useReportsQueueTs.includes('commentPath(report.postId, report.targetId)') &&
    useReportsQueueTs.includes("{ status: 'hidden' }"));
  ok('ReportsReviewScreen.tsx opens every report (post or comment) via the existing PostDetail navigation — no standalone comment screen',
    reportsReviewScreenTsx.includes('onOpenPost(report.postId)'));

  ok('UserManagementScreen.tsx reuses useUserSearch.ts for search/list (imported, not reimplemented)',
    userManagementScreenTsx.includes("from '../hooks/useUserSearch'") && userManagementScreenTsx.includes('useUserSearch()'));
  ok('UserManagementScreen.tsx\'s detail view reuses the exact getDoc(userPath(uid)) pattern PublicProfile.tsx already uses',
    userManagementScreenTsx.includes('getDoc(doc(firestoreDb, userPath(uid)))'));
  ok('UserManagementScreen.tsx disables ban/unban for self and for another moderator, and shows promote-to-moderator as permanently disabled (console-only)',
    userManagementScreenTsx.includes('isSelf') &&
    userManagementScreenTsx.includes('isOtherModerator') &&
    userManagementScreenTsx.includes('ترقية إلى مشرف') &&
    /disabled\s*$/m.test(userManagementScreenTsx));
  ok('useUserStatus.ts writes ONLY the status field — its updateDoc payload has no other key',
    useUserStatusTs.includes('updateDoc(doc(firestoreDb, userPath(uid)), { status })'));

  ok('useAnnouncementCreate.ts writes directly into the existing announcements collection, matching its Rules-validated shape exactly',
    useAnnouncementCreateTs.includes('ANNOUNCEMENTS_COLLECTION') &&
    useAnnouncementCreateTs.includes('title, body, ctaLink, createdAt: serverTimestamp()'));
  ok('AnnouncementComposerScreen.tsx enforces the same 200/2000-char caps firestore.rules validates server-side',
    announcementComposerScreenTsx.includes('TITLE_MAX = 200') && announcementComposerScreenTsx.includes('BODY_MAX = 2000'));
}

console.log('\n[29] Announcement mirror mechanism (fills the gap found: Rules supported it, nothing ever called it)');
{
  ok('useAnnouncementMirror.ts queries recent announcements ordered by createdAt desc, bounded by a limit',
    useAnnouncementMirrorTs.includes("orderBy('createdAt', 'desc')") &&
    useAnnouncementMirrorTs.includes('RECENT_ANNOUNCEMENTS_LIMIT'));
  ok('useAnnouncementMirror.ts queries the CALLER\'S OWN existing announcement-type notifications (bare equality — no orderBy paired with it, so no new composite index is needed)',
    useAnnouncementMirrorTs.includes("where('type', '==', 'announcement')") &&
    useAnnouncementMirrorTs.includes('EXISTING_MIRRORS_SAFETY_LIMIT'));
  ok('useAnnouncementMirror.ts only mirrors announcements NOT already present in that existing-mirrors set',
    useAnnouncementMirrorTs.includes('alreadyMirroredIds') &&
    useAnnouncementMirrorTs.includes('!alreadyMirroredIds.has(d.id)'));
  ok('useAnnouncementMirror.ts writes the mirror at a DETERMINISTIC per-(uid, announcementId) doc id — a second write attempt to the same id is structurally blocked by the update rule\'s hasOnly([\'read\']) scope, not just by the pre-check',
    useAnnouncementMirrorTs.includes("mirrorNotificationId = (announcementId: string): string => `announcement-${announcementId}`"));
  ok('useAnnouncementMirror.ts writes the exact Rules-validated announcement-notification shape (type/actorId=null/targetType/targetId/postId=null/read=false/createdAt)',
    useAnnouncementMirrorTs.includes("type: 'announcement'") &&
    useAnnouncementMirrorTs.includes('actorId: null') &&
    useAnnouncementMirrorTs.includes("targetType: 'announcement'") &&
    useAnnouncementMirrorTs.includes('postId: null'));
  ok('useAnnouncementMirror.ts is best-effort — every error is caught, never rethrown, so a mirror failure can never break notifications loading itself',
    /catch \(err\) \{\s*console\.error\('\[mirrorUnseenAnnouncements\]'/.test(useAnnouncementMirrorTs));

  ok('useNotifications.ts imports and calls mirrorUnseenAnnouncements inside its own load() — the existing single refresh point for both the header badge and the notifications screen',
    useNotificationsTs.includes("import { mirrorUnseenAnnouncements } from './useAnnouncementMirror'") &&
    useNotificationsTs.includes('await mirrorUnseenAnnouncements(currentUid)'));
  ok('the mirror check runs BEFORE the list/unread queries in load(), so a newly-mirrored announcement is reflected in the SAME load that triggered it',
    useNotificationsTs.indexOf('await mirrorUnseenAnnouncements(currentUid)') < useNotificationsTs.indexOf('const listQuery'));

  ok('firestore.indexes.json required NO new entry for this fix — the announcement-mirror query is a bare single-field equality filter, the same automatic-single-field-index precedent already documented for useNotifications.ts\'s own unreadQuery',
    !indexesJson.includes('"collectionGroup": "notifications"'));
}

console.log('\n[16] Scope — only the expected Community/rules/index/migration/test files are dirty');
{
  const { execSync } = await import('node:child_process');
  const diffNames = execSync('git diff --name-only HEAD', { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);
  const untrackedNames = execSync('git ls-files --others --exclude-standard', { cwd: ROOT }).toString().trim().split('\n').filter(Boolean);
  const allChanged = [...diffNames, ...untrackedNames];
  const outOfScope = allChanged.filter(f =>
    !f.startsWith('src/components/Community/') &&
    !f.startsWith('src/contexts/AuthContext.tsx') && // read-only reference, expect untouched — verified below, not assumed
    f !== 'src/lib/firebase.ts' &&
    f !== 'firestore.rules' &&
    f !== 'firestore.indexes.json' &&
    f !== 'firebase.json' &&
    f !== 'storage.rules' && // Phase 9: uid-scoped media paths + exact MIME allow-list + owner-delete
    f !== 'vercel.json' && // Phase 7: CSP connect-src fix for the deployed comment-publish bug
    f !== 'src/views/HomeView.tsx' && // Phase 8: Home-screen-state reset on the bottom-nav Home press; Notifications Phase 1 wires the shared useNotifications() instance here too
    f !== 'src/components/BottomNavigation.tsx' && // Phase 8: centralized Home-reset navigation signal
    f !== 'src/utils/storageKeys.ts' && // Notifications Phase 1: LESSON_REMINDER_LAST_SHOWN throttle key
    f !== 'src/components/ProfileSheet.tsx' && // Admin dashboard Phase 2: adds the moderator-only "لوحة الإشراف" entry point
    f !== 'package.json' &&
    !f.startsWith('functions/') &&
    !f.startsWith('scripts/testCommunity') &&
    !f.startsWith('scripts/seedCommunityEmulator') &&
    f !== 'scripts/migrateDisplayNameNormalized.ts' &&
    f !== 'scripts/testMediaDeleteRetry.ts' && // correction pass: pure-Node unit test for deleteMedia's retry/classification state machine
    f !== 'scripts/testFeedRanking.ts' && // Phase 2: pure-Node unit tests for the feed ranking formula
    f !== 'scripts/testFeedDiversity.ts' && // Phase 2: pure-Node unit tests for the diversity/newest-post-guarantee page assembly
    f !== 'scripts/migrateFeedScoreBackfill.ts' && // Phase 2: one-time feedScore backfill, same emulator-only pattern as migrateDisplayNameNormalized.ts
    f !== 'scripts/testAdminDashboardE2E.ts' && // Admin dashboard Phase 2: live-browser proof for the moderator-only entry point + all 3 screens
    f !== 'docs/KNOWN_ISSUES.md' && // Phase 2: documents the pagination-mutation limitation
    f !== 'docs/PRE_LAUNCH_CHECKLIST.md' && // Phase 2: defers the pagination-mutation E2E test with an explicit trigger condition
    f !== 'realtime-harness.html' && // Phase 10: entry point for the test-only RealtimeHarness.tsx mount, never linked from the real app
    // "Four Safe Fixes" task — entirely unrelated to Community: Assembly's
    // drone-size/type selectors reusing the frames category icon, plus
    // three native Android/Capacitor fixes (splash-screen scaling,
    // adaptive-icon background color, minSdkVersion). None touch Community.
    !f.startsWith('android/') &&
    !f.startsWith('src/components/Assembly/') &&
    !f.startsWith('src/data/assembly/') &&
    !f.startsWith('scripts/testAssembly') &&
    f !== 'capacitor.config.ts' &&
    f !== 'package-lock.json' &&
    // Login/guest button contrast fix — the auth/splash screen, entirely
    // unrelated to Community.
    f !== 'src/views/SplashView.tsx' &&
    // Splash dead-space fix (.splash-frame class) — a global stylesheet
    // edit needed for the same unrelated auth/splash screen.
    f !== 'src/index.css' &&
    // Clean removal of the abandoned native Google Sign-In attempt +
    // email/password auth + preset avatar picker (Part A/B/C) — auth/
    // profile-scoped, entirely unrelated to Community's own features.
    // firestore.rules and ProfileSheet.tsx are already allow-listed above
    // (Admin dashboard Phase 2 / Community itself); AuthContext.tsx is
    // already allow-listed via the startsWith check above too.
    f !== 'src/data/avatars.ts' &&
    f !== 'src/utils/authErrorMessages.ts' &&
    !f.startsWith('src/components/Auth/') &&
    !f.startsWith('public/assets/avatars/') &&
    // AuthPanel architectural consolidation — extracts the auth entry
    // points found in SplashView.tsx/ProfileSheet.tsx (already allow-listed
    // above) into one shared component, adds forgot-password, and adds this
    // task's own structural test + emulator repro script. Auth-scoped,
    // unrelated to Community.
    f !== 'scripts/testAuthPanel.ts' &&
    f !== 'scripts/reproduceSignupError.ts' &&
    // User-requested standalone copy of firestore.rules for manual console
    // publishing — deliberately left untracked/uncommitted per instruction,
    // but still present in the working tree, so it needs to be excluded here.
    f !== 'RULES_FOR_PUBLISH.md',
  );
  ok('no file outside the expected Community/rules/index/migration/test scope is dirty', outOfScope.length === 0);
  if (outOfScope.length > 0) console.log('  OUT OF SCOPE:', outOfScope);
  // AuthContext.tsx used to be required to stay completely untouched by
  // every Community-scoped task. It now legitimately carries three
  // unrelated auth features (native Google Sign-In's clean removal,
  // email/password, and this same file's provider-agnostic signInWithGoogle
  // unchanged) — so this checks the content is exactly that, not merely
  // that the file exists on the allow-list above.
  const authContextTsx = readFileSync(join(ROOT, 'src/contexts/AuthContext.tsx'), 'utf8');
  ok('AuthContext.tsx has no leftover reference to the removed @capacitor-firebase/authentication plugin or Capacitor.isNativePlatform()', !authContextTsx.includes('capacitor-firebase') && !authContextTsx.includes('isNativePlatform'));
  ok('AuthContext.tsx\'s web sign-in path still calls signInWithPopup unchanged', /await signInWithPopup\(firebaseAuth, provider\);/.test(authContextTsx));
  ok('AuthContext.tsx exposes signUpWithEmail and signInWithEmail (Part B)', authContextTsx.includes('signUpWithEmail') && authContextTsx.includes('signInWithEmail'));
  ok('AuthContext.tsx\'s signUpWithEmail awaits updateProfile before returning — the ordering guarantee SplashView.tsx\'s "returning signed-in user" effect guard relies on', /await updateProfile\(result\.user, \{ displayName, photoURL \}\);\s*\n\s*return result\.user;/.test(authContextTsx));
  // Assembly is deliberately excluded from this specific check (unlike the
  // others below) only for the "Four Safe Fixes" task, which legitimately
  // touches src/data/assembly/ and src/components/Assembly/ alongside
  // unrelated native Android work in the same commit-to-be — already
  // accounted for, and independently verified, by testAssembly.ts's own
  // scope check and its new [17] section above.
  ok('no Betaflight/Programming/ExpressLRS/Build Roadmap/Lessons/Bot V2 file appears in the diff', !allChanged.some(f =>
    f.startsWith('src/data/betaflight/') || f.startsWith('src/components/betaflight/') || f === 'src/views/BetaflightView.tsx' ||
    f === 'src/views/ProgrammingView.tsx' || f.startsWith('src/views/ExpressLrs') || f.startsWith('src/data/expresslrs/') ||
    f.startsWith('src/views/BuildRoadmap') || f.startsWith('src/data/roadmap') || f.startsWith('src/data/lessonsData') ||
    f.startsWith('src/components/BotV2') || f.startsWith('src/views/BotV2'),
  ));
  // Only ADDED lines matter here — the unified diff's unchanged CONTEXT
  // lines legitimately include the "dependencies": { header near the
  // scripts-section edit; checking the whole diff text would false-positive
  // on that context line.
  const packageJsonAddedLines = execSync('git diff -- package.json', { cwd: ROOT }).toString()
    .split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++'));
  // "Four Safe Fixes" task (unrelated to Community) adds exactly one real
  // dependency — @capacitor/splash-screen, for the native splash-scaling
  // fix — allow-listed here by exact line, same as every other cross-task
  // exception in this file; any OTHER new dependency still fails this check.
  ok('package.json has no unexpected NEW dependency (only a new npm script entry and the known @capacitor/splash-screen addition)',
    packageJsonAddedLines.every(l => !/^[+]\s*"[^"]+":\s*"\^?\d/.test(l) || l.includes('"@capacitor/splash-screen"')));
}

console.log(`\nAll ${passed} assertions passed.`);
