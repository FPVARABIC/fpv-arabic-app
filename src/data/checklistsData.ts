import type { ChecklistGroup } from '../types';

export const TOTAL_CHECKLIST_ITEMS = 28;

export const checklistsData: ChecklistGroup[] = [
  {
    id: 'pre-buy', title: 'قبل الشراء', icon: 'ShoppingCart',
    items: [
      { id: 'pb-1', text: 'هل اخترت حجم الدرون؟' },
      { id: 'pb-2', text: 'هل المحركات تناسب الفريم؟' },
      { id: 'pb-3', text: 'هل ESC يتحمل تيار المحركات؟' },
      { id: 'pb-4', text: 'هل FC يدعم المنافذ المطلوبة؟' },
      { id: 'pb-5', text: 'هل البطارية مناسبة للجهد والتيار؟' },
      { id: 'pb-6', text: 'هل لديك Receiver مناسب لجهاز التحكم؟' },
      { id: 'pb-7', text: 'هل لديك أدوات لحام كافية؟' },
      { id: 'pb-8', text: 'هل لديك Smoke Stopper؟' },
      { id: 'pb-9', text: 'هل لديك Multimeter؟' },
    ],
  },
  {
    id: 'pre-battery', title: 'قبل البطارية', icon: 'Battery',
    items: [
      { id: 'prb-1', text: 'لا توجد مراوح مركبة' },
      { id: 'prb-2', text: 'فحصت القطبية بالـ Multimeter' },
      { id: 'prb-3', text: 'فحصت continuity بين VBAT و GND' },
      { id: 'prb-4', text: 'Smoke Stopper جاهز' },
      { id: 'prb-5', text: 'تأكدت من عدم وجود solder bridge' },
      { id: 'prb-6', text: 'تأكدت أن FC مثبت جيدًا' },
      { id: 'prb-7', text: 'تأكدت أن GND مشترك بين جميع الأجهزة' },
      { id: 'prb-8', text: 'تأكدت أن TX/RX صحيح' },
      { id: 'prb-9', text: 'لا توجد أسلاك مكشوفة' },
    ],
  },
  {
    id: 'pre-flight', title: 'قبل أول طيران', icon: 'Plane',
    items: [
      { id: 'pf-1', text: 'المراوح مركبة بالاتجاه الصحيح' },
      { id: 'pf-2', text: 'Motor order صحيح ومختبر' },
      { id: 'pf-3', text: 'Motor direction صحيح' },
      { id: 'pf-4', text: 'Receiver يعمل وجميع القنوات تستجيب' },
      { id: 'pf-5', text: 'Failsafe مضبوط ومختبر' },
      { id: 'pf-6', text: 'البطارية مثبتة بأمان' },
      { id: 'pf-7', text: 'مكان الطيران مفتوح وآمن' },
      { id: 'pf-8', text: 'لا يوجد أشخاص في نطاق الخطر' },
      { id: 'pf-9', text: 'وضع Angle مفعّل' },
      { id: 'pf-10', text: 'جربت Arm/Disarm بنجاح' },
    ],
  },
];
