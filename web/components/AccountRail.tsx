import Link from 'next/link';
import {
  Settings, Info, Shield, Mail, ShieldCheck, ChevronLeft, LogIn,
} from 'lucide-react';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { isStaff, ROLE_LABEL_AR, type PlatformRole } from '@core/data/auth/roles';

/**
 * The account rail — the phone app's profile sheet, unfolded onto a wide screen.
 *
 * WHY THIS EXISTS
 * ---------------
 * In the app, «who am I, how far have I got, and where are my settings» is one
 * gesture: the profile sheet slides up over the tab bar with a photo, a name,
 * three stats and four menu rows. On the web those answers were scattered — the
 * settings, contact and about pages did not exist at all, and the profile page
 * was a table of five fields. The shop's owner was explicit: a reader must not
 * have to hunt for them.
 *
 * So the same panel becomes a rail. It is deliberately NOT a new design: the
 * surfaces, the tile colour, the divider, the icon squares and the row geometry
 * are the sheet's own values, carried over as `--acct-*` tokens. Someone who
 * uses both should recognise this as the same panel, not as a web version of it.
 *
 * WHERE IT SITS
 * -------------
 * Beside the content on ≥1000px, and BELOW it on anything narrower. That
 * direction matters: on a phone, the thing the reader came for must not be
 * pushed under a profile card, and a rail that stacks above the feed is exactly
 * that mistake.
 *
 * WHAT IT DOES NOT DO
 * -------------------
 * It renders no progress it has not been given. The phone app computes lesson
 * and build progress from local storage that the web has no access to, so the
 * meter and the stats appear only when a caller passes real numbers. An empty
 * progress bar showing «0%» to somebody with thirty lessons finished on their
 * phone would be worse than no bar at all.
 */

export interface RailStats {
  /** Whole percent, 0–100. Omitted when the surface has no progress to show. */
  overallPercent?: number;
  /** Three short values, mirroring the app's «البناء · التقدّم · الدروس». */
  items?: { label: string; value: string }[];
}

export const AccountRail: React.FC<{
  signedIn: boolean;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
  role: PlatformRole;
  stats?: RailStats;
  /** Where to return after signing in, when signed out. */
  signInNext?: string;
}> = ({ signedIn, displayName, photoURL, email, role, stats, signInNext = '/community' }) => {
  const name = displayName?.trim() || 'حسابي';

  return (
    <aside className="rail" aria-label="حسابك وإعداداتك">
      <div className="rail-card" data-testid="account-rail">
        <div className="rail-head">
          {signedIn ? (
            <>
              {photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoURL}
                  alt="صورة الحساب"
                  width={64}
                  height={64}
                  style={{
                    width: 64, height: 64, borderRadius: '50%', objectFit: 'cover',
                    border: '2.5px solid var(--acct-blue-soft)', display: 'block', margin: '0 auto',
                  }}
                />
              ) : (
                <span
                  aria-hidden
                  style={{
                    width: 64, height: 64, borderRadius: '50%', margin: '0 auto',
                    background: 'var(--acct-blue)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, fontWeight: 800,
                    boxShadow: '0 2px 10px rgba(37,99,235,0.15)',
                  }}
                >
                  {name.charAt(0)}
                </span>
              )}
              <p className="rail-name" data-testid="rail-name">{name}</p>
              {role !== 'user' ? (
                <p className="rail-sub">{ROLE_LABEL_AR[role]}</p>
              ) : (
                <p className="rail-sub">عضو في المجتمع</p>
              )}
              {email && (
                <p
                  style={{
                    fontSize: 11, color: 'var(--text-dim)', margin: '3px 0 0',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {email}
                </p>
              )}
            </>
          ) : (
            <>
              <span
                aria-hidden
                style={{
                  width: 64, height: 64, borderRadius: '50%', margin: '0 auto',
                  background: '#dbeafe', border: '2px solid #93c5fd',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <LogIn size={26} color="var(--acct-blue)" />
              </span>
              <p className="rail-name">زائر</p>
              <p className="rail-sub">سجّل الدخول لتتابع تقدّمك</p>
            </>
          )}
        </div>

        {/* Progress, only when there is real progress to report. */}
        {signedIn && typeof stats?.overallPercent === 'number' && (
          <div className="rail-meter">
            <div
              style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 11.5, color: 'var(--acct-blue)', marginBottom: 5, fontWeight: 700,
              }}
            >
              <span>التقدّم الكلّي</span>
              <span className="ltr">{stats.overallPercent}%</span>
            </div>
            <div
              className="rail-meter-track"
              role="progressbar"
              aria-valuenow={stats.overallPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="التقدّم الكلّي"
            >
              <div className="rail-meter-fill" style={{ width: `${stats.overallPercent}%` }} />
            </div>
          </div>
        )}

        {signedIn && stats?.items && stats.items.length > 0 && (
          <div className="rail-stats" data-testid="rail-stats">
            {stats.items.map(s => (
              <div className="rail-stat" key={s.label}>
                <p className="rail-stat-value ltr">{s.value}</p>
                <p className="rail-stat-label">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* The menu. Same rows, same order, same icons as the app's sheet. */}
        <div className="rail-menu">
          {signedIn && isStaff(role) && (
            <Link href="/admin" className="rail-row" data-testid="rail-admin">
              <span className="rail-row-icon"><ShieldCheck size={16} /></span>
              <span className="rail-row-label">لوحة الإشراف</span>
              <ChevronLeft size={15} className="rail-row-chevron" aria-hidden />
            </Link>
          )}
          {signedIn && (
            <Link href="/profile" className="rail-row" data-testid="rail-profile">
              <span className="rail-row-icon"><Shield size={16} /></span>
              <span className="rail-row-label">ملفي</span>
              <ChevronLeft size={15} className="rail-row-chevron" aria-hidden />
            </Link>
          )}
          <Link href="/settings" className="rail-row" data-testid="rail-settings">
            <span className="rail-row-icon"><Settings size={16} /></span>
            <span className="rail-row-label">الإعدادات</span>
            <ChevronLeft size={15} className="rail-row-chevron" aria-hidden />
          </Link>
          <Link href="/contact" className="rail-row" data-testid="rail-contact">
            <span className="rail-row-icon"><Mail size={16} /></span>
            <span className="rail-row-label">اتصل بنا</span>
            <ChevronLeft size={15} className="rail-row-chevron" aria-hidden />
          </Link>
          <Link href="/about" className="rail-row" data-testid="rail-about">
            <span className="rail-row-icon"><Info size={16} /></span>
            <span className="rail-row-label">حول المنصّة</span>
            <ChevronLeft size={15} className="rail-row-chevron" aria-hidden />
          </Link>

          {signedIn ? (
            <>
              <div className="rail-divider" />
              <SignOutButton className="rail-row rail-row-danger" data-testid="rail-signout">
                <span className="rail-row-icon">
                  {/* The icon is inside the button so the whole row is one target. */}
                  <Shield size={16} />
                </span>
                <span className="rail-row-label">تسجيل الخروج</span>
                <ChevronLeft size={15} className="rail-row-chevron" aria-hidden />
              </SignOutButton>
            </>
          ) : (
            <>
              <div className="rail-divider" />
              <Link
                href={`/signin?next=${encodeURIComponent(signInNext)}`}
                className="rail-row"
                data-testid="rail-signin"
              >
                <span className="rail-row-icon"><LogIn size={16} /></span>
                <span className="rail-row-label">تسجيل الدخول</span>
                <ChevronLeft size={15} className="rail-row-chevron" aria-hidden />
              </Link>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
