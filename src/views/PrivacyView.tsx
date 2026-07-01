import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { Shield, Database, Eye, Trash2, Globe, Users, RefreshCw, Calendar } from 'lucide-react';

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="glass-card p-5 space-y-3">
    <div className="flex items-center gap-2">
      {icon}
      <h2 className="text-sm font-bold text-white">{title}</h2>
    </div>
    <div className="space-y-2 text-sm text-slate-300 leading-relaxed">
      {children}
    </div>
  </div>
);

export const PrivacyView: React.FC = () => {
  const navigate = useNavigate();

  return (
    <AppShell>
      <Header title="سياسة الخصوصية" />
      <div className="px-4 py-6 space-y-4 fade-in">

        {/* 1. مقدمة */}
        <div className="glass-card-sm p-4">
          <p className="text-sm text-slate-300 leading-relaxed">
            تطبيق FPV بالعربي يحترم خصوصيتك ويلتزم بحماية بياناتك وفق اللوائح الأوروبية لحماية البيانات (GDPR).
          </p>
        </div>

        {/* 2. المتحكم في البيانات */}
        <Section icon={<Shield size={16} className="text-cyan-400 flex-shrink-0" />} title="المتحكم في البيانات (Data Controller)">
          <p><span className="text-slate-400">الاسم:</span> FPV بالعربي</p>
          <p><span className="text-slate-400">البريد الإلكتروني:</span> melianeahmed93@gmail.com</p>
          <p className="text-slate-400 text-xs pt-1">لأي استفسار أو طلب متعلق بخصوصيتك، تواصل معنا عبر البريد الإلكتروني أعلاه.</p>
        </Section>

        {/* 3. البيانات التي نجمعها */}
        <Section icon={<Database size={16} className="text-cyan-400 flex-shrink-0" />} title="البيانات التي نجمعها">
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-white mb-1">أ) بيانات التقدم في التعلم</p>
              <p className="text-xs text-green-400 mb-2">لا تحتوي على معلومات شخصية</p>
              <ul className="space-y-1 text-xs text-slate-400">
                <li className="flex items-center gap-2"><span className="text-cyan-400">•</span>الدروس المكتملة</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">•</span>خطوات خريطة البناء المكتملة</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">•</span>حالة قوائم التحقق</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">•</span>آخر درس أو خطوة تم فتحها</li>
              </ul>
            </div>
            <div className="border-t border-white/5 pt-3">
              <p className="font-semibold text-white mb-1">ب) رسائل التواصل</p>
              <p className="text-xs text-amber-400 mb-2">قد تحتوي على معلومات شخصية</p>
              <ul className="space-y-1 text-xs text-slate-400">
                <li className="flex items-center gap-2"><span className="text-cyan-400">•</span>الاسم</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">•</span>البريد الإلكتروني (اختياري)</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">•</span>نوع الرسالة ومحتواها</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">•</span>تاريخ ووقت الإرسال</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* 4. الغرض والأساس القانوني */}
        <Section icon={<Eye size={16} className="text-cyan-400 flex-shrink-0" />} title="الغرض من جمع البيانات والأساس القانوني">
          <div className="space-y-3">
            <div className="glass-card-sm p-3 space-y-1">
              <p className="font-semibold text-white text-xs">بيانات التقدم</p>
              <p className="text-xs text-slate-400">تقديم الخدمة — GDPR Article 6(1)(b)</p>
              <p className="text-xs text-slate-500">لحفظ تقدمك في التعلم على جهازك فقط.</p>
            </div>
            <div className="glass-card-sm p-3 space-y-1">
              <p className="font-semibold text-white text-xs">رسائل التواصل</p>
              <p className="text-xs text-slate-400">المصلحة المشروعة — GDPR Article 6(1)(f)</p>
              <p className="text-xs text-slate-500">لتلقي ملاحظاتك واقتراحاتك.</p>
            </div>
          </div>
        </Section>

        {/* 5. التخزين والاحتفاظ */}
        <Section icon={<Database size={16} className="text-green-400 flex-shrink-0" />} title="التخزين والاحتفاظ بالبيانات">
          <p>
            جميع بياناتك تُخزَّن محليًا على جهازك فقط باستخدام localStorage. لا يتم إرسال أي بيانات إلى خوادم خارجية أو أطراف ثالثة.
          </p>
          <p>تبقى بيانات التقدم محفوظة حتى تقوم بمسحها يدويًا من إعدادات التطبيق.</p>
          <p>تبقى رسائل التواصل محفوظة محليًا حتى تقوم بحذفها من إعدادات التطبيق.</p>
        </Section>

        {/* 6. حقوقك */}
        <Section icon={<Eye size={16} className="text-purple-400 flex-shrink-0" />} title="حقوقك">
          <p>بموجب GDPR يحق لك:</p>
          <ul className="space-y-2 text-xs">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">•</span>
              <span>الاطلاع على بياناتك.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">•</span>
              <div>
                <span>حذف بياناتك (المادة 17): </span>
                <span className="text-slate-400">اذهب إلى الإعدادات ← مسح بيانات التطبيق لحذف جميع البيانات بما فيها رسائل التواصل، أو اختر حذف سجل التواصل فقط لحذف الرسائل دون التأثير على تقدمك.</span>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 mt-0.5">•</span>
              <div>
                <p>تقديم شكوى: يحق لك تقديم شكوى لدى هيئة حماية البيانات الهولندية:</p>
                <button
                  className="text-cyan-400 underline text-xs mt-0.5 text-right"
                  onClick={() => {}}
                  aria-label="autoriteitpersoonsgegevens.nl"
                >
                  autoriteitpersoonsgegevens.nl
                </button>
              </div>
            </li>
          </ul>
        </Section>

        {/* 7. عدم المشاركة مع أطراف ثالثة */}
        <Section icon={<Globe size={16} className="text-cyan-400 flex-shrink-0" />} title="عدم مشاركة البيانات مع أطراف ثالثة">
          <p>لا تُشارك أي بيانات مع أطراف ثالثة.</p>
          <ul className="space-y-1 text-xs text-slate-400">
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span>لا يوجد تتبع</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span>لا توجد إعلانات</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span>لا توجد تحليلات خارجية</li>
          </ul>
        </Section>

        {/* 8. الأطفال */}
        <Section icon={<Users size={16} className="text-cyan-400 flex-shrink-0" />} title="الأطفال">
          <p>هذا التطبيق غير مخصص للأطفال دون السن القانونية المحددة في بلدك.</p>
          <p>لا نجمع بيانات الأطفال عن قصد.</p>
          <p>
            إذا كنت تعتقد أن طفلًا قدّم بياناته، يرجى التواصل معنا على{' '}
            <span className="text-cyan-400">melianeahmed93@gmail.com</span>{' '}
            وسنحذفها فورًا.
          </p>
        </Section>

        {/* 9. التغييرات المستقبلية */}
        <Section icon={<RefreshCw size={16} className="text-cyan-400 flex-shrink-0" />} title="التغييرات المستقبلية">
          <p>في الإصدار الحالي، جميع بياناتك تُخزَّن محليًا على جهازك فقط ولا تُرسل إلى أي خادم.</p>
          <p>عند إطلاق نظام الحسابات مستقبلاً، سيتم تحديث سياسة الخصوصية لتوضيح كيفية تخزين البيانات سحابيًا ومزامنتها، وسيتم إخطارك بأي تغييرات جوهرية قبل تطبيقها.</p>
        </Section>

        {/* 10. تاريخ آخر تحديث */}
        <div className="glass-card-sm p-4 flex items-center gap-2">
          <Calendar size={14} className="text-slate-500 flex-shrink-0" />
          <p className="text-xs text-slate-400">آخر تحديث: يوليو 2026</p>
        </div>

        {/* Back button */}
        <button
          className="btn-secondary w-full"
          onClick={() => navigate(-1)}
        >
          العودة
        </button>

      </div>
    </AppShell>
  );
};
