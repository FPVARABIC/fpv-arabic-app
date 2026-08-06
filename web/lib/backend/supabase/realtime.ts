import type { SupabaseClient } from '@supabase/supabase-js';

import type { RealtimePort } from '../ports';

/**
 * The realtime adapter — subscriptions, reduced to «something changed, here is
 * the id».
 *
 * WHY THE HANDLER RECEIVES AN ID AND NOT THE ROW
 * ==============================================
 * Postgres change events arrive from the WAL, and the WAL does not know about
 * row-level security in the way a query does. Realtime applies RLS to decide
 * WHETHER to deliver an event, but the payload it delivers is the raw row —
 * with whatever columns the publication carries, in database spelling, and with
 * an `old_record` on updates that is often just the primary key.
 *
 * Handing that to a component would mean the component knows column names, and
 * would mean a feed row rendered from a WAL payload could differ from the same
 * row rendered from a query. So this adapter deliberately throws the payload
 * away and reports only the id: the subscriber's job is to RE-READ through
 * `ReadPort`, which applies the same policies, the same mapping and the same
 * fallbacks as every other read. One code path renders a post, not two.
 *
 * WHY IT RETURNS A FUNCTION AND NOT A CHANNEL
 * ===========================================
 * A `RealtimeChannel` is an SDK type. Returning one would put `@supabase/*` in
 * the type signature of every component that subscribes, which is exactly the
 * coupling this layer exists to prevent — and it would leave each caller to
 * remember `removeChannel` rather than `unsubscribe()`. A leaked channel is not
 * a crash; it is a socket that stays open and a handler that fires against an
 * unmounted component, which is the kind of bug that only shows up as «the site
 * gets slower the longer you leave it open».
 *
 * WHEN THERE IS NO CLIENT
 * =======================
 * `subscribe` returns a no-op unsubscriber. A component that renders during
 * server rendering, or in a development checkout with no project attached,
 * calls this in an effect and cleans up in the same effect's teardown; giving
 * it `null` would make every caller write the same `?.()` guard.
 */

type ChangeKind = 'insert' | 'update' | 'delete';

function kindOf(eventType: unknown): ChangeKind {
  if (eventType === 'INSERT') return 'insert';
  if (eventType === 'DELETE') return 'delete';
  return 'update';
}

/**
 * The id of the row a change refers to.
 *
 * On DELETE, Postgres sends `old_record` and leaves `new` empty — and with the
 * default replica identity `old_record` contains ONLY the primary key. So both
 * halves are consulted, `new` first, and a payload carrying neither is dropped
 * rather than reported with an empty id: a subscriber that re-reads `''` gets
 * `null` and would blank a post that is perfectly fine.
 */
function idFrom(payload: { new?: unknown; old?: unknown }): string | null {
  for (const half of [payload.new, payload.old]) {
    if (half && typeof half === 'object') {
      const id = (half as Record<string, unknown>).id;
      if (typeof id === 'string' && id.length > 0) return id;
    }
  }
  return null;
}

const NOOP = () => { /* nothing was subscribed, so nothing needs unsubscribing */ };

export function makeRealtime(sb: SupabaseClient | null): RealtimePort {
  return {
    onPostsChanged(handler) {
      if (!sb) return NOOP;
      const channel = sb
        .channel('posts-feed')
        .on(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the
          // SDK types this overload against generated database types we do not
          // generate; the payload is validated by `idFrom` instead.
          'postgres_changes' as any,
          { event: '*', schema: 'public', table: 'posts' },
          (payload: { eventType?: unknown; new?: unknown; old?: unknown }) => {
            const postId = idFrom(payload);
            if (postId) handler({ kind: kindOf(payload.eventType), postId });
          },
        )
        .subscribe();

      return () => { void sb.removeChannel(channel); };
    },

    onCommentsChanged(postId, handler) {
      if (!sb) return NOOP;
      // Channel name carries the post id so two open threads do not share one
      // channel and re-render each other.
      const channel = sb
        .channel(`comments-${postId}`)
        .on(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above.
          'postgres_changes' as any,
          {
            event: '*',
            schema: 'public',
            table: 'comments',
            // Filtered SERVER-side. Filtering in the handler would mean every
            // browser with a thread open receives every comment on the
            // platform — bandwidth for a `if` statement, and a payload the
            // policies never intended that browser to see.
            filter: `post_id=eq.${postId}`,
          },
          (payload: { eventType?: unknown; new?: unknown; old?: unknown }) => {
            const commentId = idFrom(payload);
            if (commentId) handler({ kind: kindOf(payload.eventType), commentId });
          },
        )
        .subscribe();

      return () => { void sb.removeChannel(channel); };
    },
  };
}
