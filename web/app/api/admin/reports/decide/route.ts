import { adminRoute } from '@/lib/server/adminRoute';
import { decideReport, type ReportStatus } from '@/lib/server/admin';

/**
 * POST /api/admin/reports/decide — move a report through its lifecycle.
 *
 * `to` is restricted to the three states a decision can move TO. 'open' is
 * absent deliberately: a report becomes open by being filed, never by being
 * set back, and `canTransition` refuses the terminal states anyway.
 */
export const POST = adminRoute<{ reportId: string; to: ReportStatus; reasonAr: string }>(
  'community.resolveReports',
  {
    reportId: { type: 'string', required: true, maxLength: 128 },
    to: { type: 'string', required: true, oneOf: ['in_review', 'resolved', 'rejected'] },
    reasonAr: { type: 'string', required: true, maxLength: 500 },
  },
  async (input, ctx) => decideReport(ctx.session, ctx.requestId, {
    reportId: input.reportId, to: input.to, reasonAr: input.reasonAr,
  }),
);
