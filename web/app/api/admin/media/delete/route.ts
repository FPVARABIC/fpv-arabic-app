import { adminRoute } from '@/lib/server/adminRoute';
import { deletePostMedia } from '@/lib/server/admin';

/**
 * POST /api/admin/media/delete — remove the files attached to a post.
 *
 * The ONLY input is a post id. No path, no URL, no filename. What gets deleted
 * is read from that post's own `mediaPath` and re-derived from its author uid
 * before anything is removed, so a forged value has no way in.
 */
export const POST = adminRoute<{ postId: string; reasonAr: string; reportId: string | null }>(
  'community.deletePost',
  {
    postId: { type: 'string', required: true, maxLength: 128 },
    reasonAr: { type: 'string', required: true, maxLength: 500 },
    reportId: { type: 'string', maxLength: 128 },
  },
  async (input, ctx) => deletePostMedia(ctx.session, ctx.requestId, {
    postId: input.postId, reasonAr: input.reasonAr, reportId: input.reportId,
  }),
);
