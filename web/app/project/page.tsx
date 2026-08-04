import type { Metadata } from 'next';
import Link from 'next/link';
import { ProjectClient } from '@/components/project/ProjectClient';

export const metadata: Metadata = {
  title: 'مشروعي',
  description: 'قطعك وإعداداتك وأحكام التوافق المحسوبة منها، مع ما ينقص وما يمنع.',
  // A project is private and lives only in this browser. There is nothing here
  // for a crawler to index, and a robots directive says so rather than relying
  // on the page happening to be empty for an anonymous fetch.
  robots: { index: false, follow: false },
};

/**
 * The project workspace's page shell.
 *
 * A SERVER SHELL AROUND A CLIENT ISLAND
 * -------------------------------------
 * The project lives in localStorage — the existing storage contract, which this
 * batch deliberately does not replace — so it can only be read in the browser.
 * The heading, the explanation, the breadcrumb and the metadata are
 * server-rendered; the workspace itself loads on the client through
 * `ProjectClient`, which is where the `ssr: false` boundary lives.
 */

export default function ProjectPage() {
  return (
    <div className="shell" style={{ paddingTop: 30, paddingBottom: 44, maxWidth: 1100 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span> مشروعي
      </nav>

      <h1 style={{ fontSize: 27, fontWeight: 900, margin: '14px 0 8px' }}>مشروعي</h1>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 2, margin: '0 0 22px', maxWidth: 760 }}>
        هذه ليست قائمة قطع. المنصة تقرأ ما سجّلته وتحسب منه أحكام التوافق نفسها
        التي يحسبها التطبيق — بالسبب، والدليل، ودرجة الثقة، وما ينقص للحكم. حين
        لا تكفي البيانات تقول ذلك صراحةً بدل أن تفترض.
      </p>

      <ProjectClient />
    </div>
  );
}
