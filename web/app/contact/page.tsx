import type { Metadata } from 'next';
import { Mail, MessageSquare, Bug, Handshake, HelpCircle } from 'lucide-react';
import { getSession } from '@/lib/server/session';
import { AccountRail } from '@/components/AccountRail';
import { ContactForm } from '@/components/contact/ContactForm';

export const metadata: Metadata = {
  title: 'اتصل بنا',
  description: 'اقتراح أو مشكلة أو سؤال أو تعاون — اكتب لنا.',
  alternates: { canonical: '/contact' },
};

/**
 * Contact — the phone app's screen, with the room a form deserves.
 *
 * WHAT WAS KEPT
 * -------------
 * The app's form asks for a name, an optional email, a message type from four
 * fixed choices — اقتراح · مشكلة · سؤال · تعاون — and the message. All four
 * types are here, in the same order, with the same names. The app is honest
 * that the message is stored locally rather than sent, and so is this: saying
 * «sent» when nothing left the browser is the one thing a contact form must
 * never do.
 *
 * WHAT THE BIGGER SCREEN BUYS
 * ---------------------------
 * The four types become a row of labelled cards with an icon each, rather than
 * a dropdown — on a wide screen there is room to SHOW the choice instead of
 * hiding it behind a control the reader has to open. And the form sits beside
 * an explanation of what happens next, which a 390px column has no space for.
 */

const TYPES = [
  { id: 'اقتراح', Icon: MessageSquare, hint: 'فكرة تحسّن المنصّة أو المتجر.' },
  { id: 'مشكلة', Icon: Bug, hint: 'شيء لا يعمل، أو معلومة تظنّها خاطئة.' },
  { id: 'سؤال', Icon: HelpCircle, hint: 'سؤال عن قطعة أو إعداد أو طلب.' },
  { id: 'تعاون', Icon: Handshake, hint: 'عرض شراكة أو محتوى أو توريد.' },
];

export default async function ContactPage() {
  const session = await getSession();

  return (
    <div className="shell" style={{ paddingTop: 34, paddingBottom: 48 }}>
      <div className="with-rail">
        <div style={{ minWidth: 0 }} className="fade-in">
          <header>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Mail size={26} color="var(--accent-ink)" aria-hidden />
              اتصل بنا
            </h1>
            <p className="page-lede">
              إن كان لديك اقتراح أو مشكلة أو فكرة تحسّن المنصّة، اكتب لنا. الرسائل التي
              تصف ما حدث بالضبط — أي صفحة، وأي قطعة، وماذا توقّعت — هي التي نستطيع
              التصرّف بناءً عليها فعلاً.
            </p>
          </header>

          <ContactForm
            types={TYPES.map(t => t.id)}
            defaultName={session?.displayName ?? ''}
            defaultEmail={session?.email ?? ''}
          />
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <section className="card" style={{ padding: '18px 20px' }}>
            <h2 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 12px' }}>أنواع الرسائل</h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
              {TYPES.map(t => (
                <li key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span
                    className="rail-row-icon"
                    style={{ width: 28, height: 28, borderRadius: 9 }}
                    aria-hidden
                  >
                    <t.Icon size={14} />
                  </span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13.5, fontWeight: 800 }}>{t.id}</span>
                    <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.8 }}>
                      {t.hint}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <AccountRail
            signedIn={!!session}
            displayName={session?.displayName ?? null}
            photoURL={session?.photoURL ?? null}
            email={session?.email ?? null}
            role={session?.role ?? 'user'}
            signInNext="/contact"
          />
        </div>
      </div>
    </div>
  );
}
