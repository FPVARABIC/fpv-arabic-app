/**
 * Phase 1 evidence script: seeds realistic Community data into the LOCAL
 * Firestore emulator only — never the real project. Writes with rules
 * disabled (this is fixture setup, not a rules exercise; testCommunityRules.ts
 * covers rules behavior).
 *
 * Not application runtime code — a one-off harness, alongside
 * testCommunityRules.ts, to produce data for /community-preview screenshots.
 *
 * Run with:
 *   npx firebase emulators:exec --project demo-community-rules-test \
 *     "npx tsx scripts/seedCommunityEmulator.ts"
 * or: npm run seed:community-emulator
 */

import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { doc, setDoc, collection, serverTimestamp } from 'firebase/firestore';
import { generateSearchTokens } from '../src/components/Community/utils/searchSynonyms';
import type { PostCategory } from '../src/components/Community/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const PROJECT_ID = 'demo-community-rules-test';

// Minimal valid 1x1 JPEG, reused as both the full image and thumbnail for
// every seeded image post — deterministic, self-contained, zero network
// dependency for screenshot evidence.
const PLACEHOLDER_IMAGE_DATA_URI =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

interface Author {
  uid: string;
  displayName: string;
}

const AUTHORS: Author[] = [
  { uid: 'seed-uid-1', displayName: 'خالد الفهد' },
  { uid: 'seed-uid-2', displayName: 'سارة العتيبي' },
  { uid: 'seed-uid-3', displayName: 'ياسر القحطاني' },
  { uid: 'seed-uid-4', displayName: 'منى الزهراني' },
];

interface SeedPost {
  authorIndex: number;
  category: PostCategory;
  text: string;
  hasImage: boolean;
}

// Interleaved round-robin across categories (questions/parts/projects/flights),
// not grouped by category. Firestore createdAt follows insertion order, and
// the feed sorts newest-first — a grouped seed order would put only the LAST
// category seeded at the top of "all", defeating the "3+ posts across
// categories" evidence requirement. Interleaving means the most recent page
// naturally contains all four categories, same as a real community would
// look after a normal mix of activity.
const SEED_POSTS: SeedPost[] = [
  { authorIndex: 0, category: 'questions', text: 'الـ ESC عندي بيسخن بسرعة بعد كل طيران، هل فيه حل؟', hasImage: false },
  { authorIndex: 1, category: 'parts', text: 'أفضل موتور KV للفريستايل 5 بوصة؟', hasImage: true },
  { authorIndex: 3, category: 'projects', text: 'بدأت بناء أول درون Long Range باستخدام DJI O4', hasImage: true },
  { authorIndex: 2, category: 'flights', text: 'أول رحلة لي فوق الوادي كانت تجربة رهيبة', hasImage: true },

  { authorIndex: 1, category: 'questions', text: 'ايش الفرق بين GPS و ELRS من ناحية الاستخدام؟', hasImage: true },
  { authorIndex: 0, category: 'parts', text: 'أبحث عن فريم خفيف لبناء درون سباق جديد', hasImage: false },
  { authorIndex: 1, category: 'projects', text: 'مشروعي الجديد: درون سينمائي بكاميرا خفيفة', hasImage: false },
  { authorIndex: 0, category: 'flights', text: 'جربت وضع Failsafe اليوم وضبط تلقائياً، ممتاز', hasImage: false },

  { authorIndex: 2, category: 'questions', text: 'بطاريتي ليبو 6S توصل درجة حرارة عالية جداً بعد الشحن السريع، طبيعي؟', hasImage: false },
  { authorIndex: 2, category: 'parts', text: 'هل جربتوا مكثف Smoke Stopper قبل التركيب الأول؟', hasImage: true },
  { authorIndex: 0, category: 'projects', text: 'لسه أواجه مشكلة لحام في توصيل الـ FC بالـ ESC', hasImage: true },
  { authorIndex: 3, category: 'flights', text: 'رحلة مسائية مع إضاءة LED، الفيديو قريباً', hasImage: true },

  { authorIndex: 3, category: 'questions', text: 'الدرون ما يستقر في الهواء ويهتز، وش السبب المحتمل؟', hasImage: true },
  { authorIndex: 3, category: 'parts', text: 'وين ألقى مراوح تناسب موتورات 2306؟', hasImage: false },
  { authorIndex: 2, category: 'projects', text: 'خلصت تركيب الفلايت كنترولر وبيتافلايت شغال تمام', hasImage: false },
  { authorIndex: 1, category: 'flights', text: 'تجربة أول طيران بعد تركيب VTX جديد', hasImage: false },
];

async function main() {
  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(join(ROOT, 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
    storage: {
      rules: readFileSync(join(ROOT, 'storage.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 9199,
    },
  });

  let postsCreated = 0;
  let commentsCreated = 0;

  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();

    for (const author of AUTHORS) {
      await setDoc(doc(db, 'users', author.uid), {
        displayName: author.displayName,
        photoURL: null,
        joinedAt: serverTimestamp(),
        postsCount: 0,
        role: 'user',
        status: 'active',
        lastPostAt: null,
        lastCommentAt: null,
      });
    }

    const postIds: string[] = [];

    for (const seedPost of SEED_POSTS) {
      const author = AUTHORS[seedPost.authorIndex];
      const postRef = doc(collection(db, 'posts'));
      const postId = postRef.id;

      await setDoc(postRef, {
        authorId: author.uid,
        authorName: author.displayName,
        authorPhoto: null,
        text: seedPost.text,
        category: seedPost.category,
        mediaType: seedPost.hasImage ? 'image' : 'none',
        mediaURL: seedPost.hasImage ? PLACEHOLDER_IMAGE_DATA_URI : null,
        thumbnailURL: seedPost.hasImage ? PLACEHOLDER_IMAGE_DATA_URI : null,
        mediaSize: seedPost.hasImage ? 150 * 1024 : null,
        mediaDuration: null,
        mediaPath: seedPost.hasImage ? `community/posts/${postId}` : null,
        commentsCount: 0,
        createdAt: serverTimestamp(),
        status: 'active',
        searchTokens: generateSearchTokens(seedPost.text),
      });

      postIds.push(postId);
      postsCreated++;
    }

    // A handful of read-only comments, so PostDetail evidence has something
    // real to show. postIndex 6 ("سينمائي") is deliberately among the 10 most
    // recent posts so it's reachable without scrolling in evidence captures.
    const commentFixtures: Array<{ postIndex: number; authorIndex: number; text: string }> = [
      { postIndex: 0, authorIndex: 1, text: 'جربت تغيير الفريكونسي؟ عندي نفس المشكلة صارت أقل بعدها.' },
      { postIndex: 0, authorIndex: 2, text: 'تأكد من نوعية الـ ESC، بعضها يسخن أكثر من غيره.' },
      { postIndex: 4, authorIndex: 0, text: 'GPS للموقع والعودة التلقائية، ELRS للتحكم فقط.' },
      { postIndex: 6, authorIndex: 2, text: 'وش نوع الكاميرا اللي بتستخدمها؟ وزنها مهم فعلاً للتحليق السينمائي.' },
    ];

    for (const fixture of commentFixtures) {
      const author = AUTHORS[fixture.authorIndex];
      const postId = postIds[fixture.postIndex];
      await setDoc(doc(collection(db, 'posts', postId, 'comments')), {
        authorId: author.uid,
        authorName: author.displayName,
        authorPhoto: null,
        text: fixture.text,
        createdAt: serverTimestamp(),
        status: 'active',
      });
      commentsCreated++;
    }
  });

  console.log(`\n=== Seed complete: ${AUTHORS.length} users, ${postsCreated} posts, ${commentsCreated} comments ===\n`);

  await testEnv.cleanup();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
