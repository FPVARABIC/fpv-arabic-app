import { adminRoute } from '@/lib/server/adminRoute';
import { assignRole } from '@/lib/server/admin';
import { PLATFORM_ROLES, type PlatformRole } from '@core/data/auth/roles';

/**
 * POST /api/admin/users/role — change a role.
 *
 * `oneOf: PLATFORM_ROLES` only checks that the value is A role. WHICH roles
 * this particular actor may grant is decided in `assignRole` against
 * `canAssignRole`, because that answer depends on who is asking and a schema
 * cannot know that. Notably 'owner' passes this schema and is then refused for
 * every actor — including an owner — since no application path may mint one.
 */
export const POST = adminRoute<{ uid: string; role: PlatformRole; reasonAr: string }>(
  'users.assignRole',
  {
    uid: { type: 'string', required: true, maxLength: 128 },
    role: { type: 'string', required: true, oneOf: PLATFORM_ROLES },
    reasonAr: { type: 'string', required: true, maxLength: 500 },
  },
  async (input, ctx) => assignRole(ctx.session, ctx.requestId, {
    uid: input.uid, role: input.role, reasonAr: input.reasonAr,
  }),
);
