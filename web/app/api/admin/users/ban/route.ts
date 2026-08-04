import { adminRoute } from '@/lib/server/adminRoute';
import { banUser, unbanUser } from '@/lib/server/admin';

/**
 * POST /api/admin/users/ban — suspend or restore an account.
 *
 * One endpoint for both directions because they are the same decision with a
 * different target state, and splitting them would duplicate the identical
 * capability, target-loading and owner-protection preflight.
 *
 * `users.ban` is the declared capability; `unbanUser` re-checks `users.unban`
 * itself. Every role that holds one holds the other, and the operation layer
 * checking again is what makes that true regardless of what this line says.
 */
export const POST = adminRoute<{ uid: string; action: string; reasonAr: string }>(
  'users.ban',
  {
    uid: { type: 'string', required: true, maxLength: 128 },
    action: { type: 'string', required: true, oneOf: ['ban', 'unban'] },
    reasonAr: { type: 'string', required: true, maxLength: 500 },
  },
  async (input, ctx) => {
    const fn = input.action === 'ban' ? banUser : unbanUser;
    return fn(ctx.session, ctx.requestId, { uid: input.uid, reasonAr: input.reasonAr });
  },
);
