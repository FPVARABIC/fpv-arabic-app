// Draft reference content preserved from the original (mis-sequenced) Phase 0
// buildStages.ts. Source material for the future full build-out of Stage 19
// "Assembly map" — not wired into the app yet.

export interface AssemblyMapReferenceNote {
  id: string;
  titleAr: string;
  descriptionAr: string;
}

export const assemblyMapReferenceNotes: AssemblyMapReferenceNote[] = [
  { id: 'ref-mount-motors',      titleAr: 'تركيب الإطار والمحركات',       descriptionAr: 'ثبّت المحركات على أذرع الإطار' },
  { id: 'ref-wiring-soldering',  titleAr: 'التوصيل واللحام',              descriptionAr: 'وصّل الأسلاك بين ESC وFC والمحركات' },
  { id: 'ref-betaflight-setup',  titleAr: 'الإعداد البرمجي (Betaflight)', descriptionAr: 'اضبط إعدادات الطيران عبر Betaflight' },
  { id: 'ref-first-flight-test', titleAr: 'الاختبار النهائي وأول طيران',   descriptionAr: 'افحص كل القطع وقم بأول اختبار طيران آمن' },
];
