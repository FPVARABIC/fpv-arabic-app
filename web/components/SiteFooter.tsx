import Link from 'next/link';
import { NAV_ITEMS } from '@/lib/siteNav';

/**
 * The footer, which doubles as the site's internal-link map.
 *
 * Internal links are not decoration here: they are how a crawler discovers the
 * encyclopedia's sections, and how a reader who landed on one article from a
 * search engine finds out the rest of the platform exists at all.
 */
export const SiteFooter: React.FC = () => {
  const groups: { id: string; titleAr: string }[] = [
    { id: 'learn', titleAr: 'التعلّم' },
    { id: 'software', titleAr: 'البرامج' },
    { id: 'build', titleAr: 'البناء' },
    { id: 'community', titleAr: 'المجتمع' },
  ];

  return (
    <footer
      style={{
        borderTop: '1px solid var(--border-soft)',
        marginTop: 64, paddingTop: 36, paddingBottom: 40,
      }}
    >
      <div className="shell">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 28,
          }}
        >
          {groups.map(g => {
            const items = NAV_ITEMS.filter(i => i.group === g.id && !i.requiresRole);
            if (items.length === 0) return null;
            return (
              <nav key={g.id} aria-label={g.titleAr}>
                <h2 style={{ fontSize: 12, fontWeight: 900, color: 'var(--accent)', margin: '0 0 10px' }}>
                  {g.titleAr}
                </h2>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 7 }}>
                  {items.map(i => (
                    <li key={i.id}>
                      <Link href={i.href} style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                        {i.labelAr}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            );
          })}
        </div>

        <p
          style={{
            marginTop: 32, paddingTop: 18, borderTop: '1px solid var(--border-soft)',
            fontSize: 12, color: 'var(--text-dimmer)', lineHeight: 1.9,
          }}
        >
          FPV بالعربي — المحتوى نفسه الموجود في تطبيق الهاتف، بالمصادر وتواريخ المراجعة نفسها.
          المعلومات التقنية مرجعية ولا تُغني عن دليل الشركة المصنّعة لجهازك، والطيران مسؤوليتك
          والتزام أنظمة بلدك واجب.
        </p>
      </div>
    </footer>
  );
};
