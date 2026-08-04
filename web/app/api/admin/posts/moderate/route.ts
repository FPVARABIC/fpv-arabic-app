import { adminRoute } from '@/lib/server/adminRoute';
import { hidePost, unhidePost, deletePostAdmin } from '@/lib/server/admin';

/**
 * POST /api/admin/posts/moderate — hide, restore or administratively remove.
 *
 * The declared capability is the WEAKEST of the three (`community.hidePost`),
 * so a community moderator reaches the endpoint at all; `deletePostAdmin` then
 * requires `community.deletePost`, which a moderator does not hold. The gate
 * that matters is the one in the operation, not the one on the door.
 */
export const POST = adminRoute<{ postId: string; action: string; reasonAr: string; reportId: string | null }>(
  'community.hidePost',
  {
    postId: { type: 'string', required: true, maxLength: 128 },
    action: { type: 'string', required: true, oneOf: ['hide', 'unhide', 'delete'] },
    reasonAr: { type: 'string', required: true, maxLength: 500 },
    reportId: { type: 'string', maxLength: 128 },
  },
  async (input, ctx) => {
    const args = { postId: input.postId, reasonAr: input.reasonAr, reportId: input.reportId };
    if (input.action === 'hide') return hidePost(ctx.session, ctx.requestId, args);
    if (input.action === 'unhide') return unhidePost(ctx.session, ctx.requestId, args);
    return deletePostAdmin(ctx.session, ctx.requestId, args);
  },
);
