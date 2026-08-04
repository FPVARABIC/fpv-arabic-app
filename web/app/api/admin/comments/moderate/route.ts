import { adminRoute } from '@/lib/server/adminRoute';
import { hideComment } from '@/lib/server/admin';

/** POST /api/admin/comments/moderate — hide a comment. */
export const POST = adminRoute<{ postId: string; commentId: string; reasonAr: string; reportId: string | null }>(
  'community.hideComment',
  {
    postId: { type: 'string', required: true, maxLength: 128 },
    commentId: { type: 'string', required: true, maxLength: 128 },
    reasonAr: { type: 'string', required: true, maxLength: 500 },
    reportId: { type: 'string', maxLength: 128 },
  },
  async (input, ctx) => hideComment(ctx.session, ctx.requestId, {
    postId: input.postId, commentId: input.commentId,
    reasonAr: input.reasonAr, reportId: input.reportId,
  }),
);
