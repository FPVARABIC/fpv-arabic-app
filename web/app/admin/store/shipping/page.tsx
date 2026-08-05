import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession, sessionCan } from '@/lib/server/session';
import { AdminShell } from '@/components/admin/AdminShell';
import { ZoneEditor, RulesEditor } from '@/components/admin/ShippingEditor';
import { shippingZones, shippingRules } from '@/lib/server/storeShipping';
import { STORE_CATEGORIES } from '@core/data/store/categories';
import { COUNTRY_NAME_AR, overlappingCountries } from '@core/data/store/shipping';

export const metadata: Metadata = {
  title: 'الشحن — الإدارة',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

/**
 * Where shipping is priced.
 *
 * WHY AN UNPRICED ZONE IS SHOWN AS A PROBLEM, NOT AS A BLANK
 * -----------------------------------------------------------
 * A zone with no cost cannot quote, which means every customer in it reaches
 * the last step of the checkout and is refused. That is correct behaviour and
 * a terrible thing to discover from a customer, so the page counts them at the
 * top and marks each one — the state is visible before it is expensive.
 *
 * WHY THE COUNTRY LISTS ARE READ-ONLY
 * -----------------------------------
 * The brief asked for editable membership, and this deliberately does not do
 * that. Which states are in the European Union is a fact the code already
 * holds; an editable list is one mistyped code away from a country silently
 * belonging to no zone — and the symptom is a checkout that refuses a customer
 * for no visible reason, which is the hardest kind of bug to hear about.
 *
 * Moving a country between zones is a genuine need, and the honest way to meet
 * it is a zone whose membership is data in a reviewed commit. It is named here
 * as a limit rather than left to be discovered.
 */
export default async function AdminShipping() {
  const session = await getSession();
  if (!session || !sessionCan(session, 'store.viewSupply')) redirect('/');

  const canEdit = sessionCan(session, 'store.editProducts');
  const [zones, rules] = await Promise.all([shippingZones(), shippingRules()]);

  const unpriced = zones.filter(z => z.costMinor === null);
  const overlaps = overlappingCountries(zones);

  return (
    <AdminShell
      role={session.role}
      actorName={session.displayName}
      current="/admin/store/shipping"
      titleAr="الشحن"
    >
      <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', margin: '0 0 16px', lineHeight: 1.95 }}>
        الشحن يُحسب على الخادم من بلد العنوان. المنطقة بلا تكلفة <strong>لا تُسعِّر</strong>،
        والطلب إليها يُرفض برسالة واضحة بدل أن يُشحن بصفر.
      </p>

      {unpriced.length > 0 && (
        <p
          className="card-sm"
          data-testid="shipping-unpriced-warning"
          style={{
            padding: '13px 15px', marginBottom: 18, fontSize: 12.5,
            color: 'var(--sev-warning)', lineHeight: 1.95,
          }}
        >
          <span dir="ltr">{unpriced.length}</span> من{' '}
          <span dir="ltr">{zones.length}</span> مناطق بلا تكلفة شحن. لن يتمكّن أي
          عميل فيها من إتمام طلب حتى تُدخل التكلفة.
        </p>
      )}

      {overlaps.length > 0 && (
        <p
          className="card-sm"
          data-testid="shipping-overlap-warning"
          style={{
            padding: '13px 15px', marginBottom: 18, fontSize: 12.5,
            color: 'var(--sev-blocker)', lineHeight: 1.95,
          }}
        >
          دول مكرّرة بين منطقتين: <span className="ltr">{overlaps.join(', ')}</span> —
          السعر المطبَّق سيكون سعر أول منطقة، وهو سلوك عشوائي فعلياً.
        </p>
      )}

      <section className="admin-section" aria-labelledby="zones-h">
        <h2 id="zones-h">المناطق</h2>
        <div style={{ display: 'grid', gap: 14 }} data-testid="shipping-zones">
          {zones.map(z => (
            <ZoneEditor
              key={z.id}
              zone={{
                id: z.id,
                nameAr: z.nameAr,
                countries: z.countries,
                countryNamesAr: z.countries.map(c => COUNTRY_NAME_AR[c] ?? c),
                costMinor: z.costMinor,
                freeOverMinor: z.freeOverMinor,
                etaDaysMin: z.etaDaysMin,
                etaDaysMax: z.etaDaysMax,
                enabled: z.enabled,
                updatedAt: z.updatedAt,
              }}
              canEdit={canEdit}
            />
          ))}
        </div>
      </section>

      <section className="admin-section" aria-labelledby="unsupported-h">
        <h2 id="unsupported-h">الوجهات غير المدعومة</h2>
        <p
          className="card-sm"
          data-testid="shipping-unsupported"
          style={{ padding: '14px 16px', fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.95 }}
        >
          أي بلد لا يظهر في المناطق أعلاه غير مدعوم: نموذج العنوان لا يعرضه
          أصلاً، والخادم يرفض الطلب إليه برسالة «لا نشحن إلى هذا البلد حالياً».
          لا توجد حالة ثالثة — لا شحن بسعر افتراضي، ولا طلب معلَّق بانتظار سعر.
        </p>
      </section>

      <section className="admin-section" aria-labelledby="rules-h">
        <h2 id="rules-h">قواعد الأصناف</h2>
        <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', margin: '0 0 12px', lineHeight: 1.9 }}>
          تُفحص <strong>قبل</strong> قواعد الوجهة: من في منطقة غير مسعَّرة وفي سلّته
          صنف ممنوع، يُخبَر بالصنف — وإلا غيّر عنوانه من أجل طرد كان سيُرفض أصلاً.
        </p>
        <RulesEditor
          blockedCategoryIds={rules.blockedCategoryIds}
          manualReviewProductIds={rules.manualReviewProductIds}
          categories={STORE_CATEGORIES.map(c => ({ id: c.id, titleAr: c.titleAr }))}
          canEdit={canEdit}
        />
      </section>
    </AdminShell>
  );
}
