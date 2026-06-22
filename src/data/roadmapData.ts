import type { RoadmapStep } from '../types';

export const TOTAL_ROADMAP_STEPS = 8;

export const roadmapData: RoadmapStep[] = [
  {
    id: 'step-1', number: 1, icon: 'Package',
    title: 'تجهيز القطع والأدوات',
    description: 'تأكد من توفر القطع الأساسية والأدوات قبل البدء.',
    checklist: ['الفريم','المحركات (4x)','Flight Controller','ESC','البطارية LiPo','Receiver','نظام الفيديو أو الكاميرا','Multimeter','Smoke Stopper','كاوي لحام','قصدير و Flux','مفكات مناسبة'],
  },
  {
    id: 'step-2', number: 2, icon: 'Wrench',
    title: 'تركيب الفريم والمحركات',
    description: 'تجميع هيكل الدرون وتثبيت المحركات الأربعة.',
    checklist: ['تأكدت من اتجاه الفريم','ركبت الأذرع بإحكام','ركبت المحركات بدون شد زائد','تأكدت أن مسامير المحركات لا تلمس ملفات الموتور','رتبت الأسلاك باتجاه ESC','لم أركب المراوح بعد'],
  },
  {
    id: 'step-3', number: 3, icon: 'Cpu',
    title: 'تثبيت FC و ESC',
    description: 'تثبيت القلب الإلكتروني للدرون بشكل صحيح.',
    checklist: ['ثبّت ESC في مكان يسمح بالتبريد','ثبّت FC باستخدام grommets','تأكدت من اتجاه سهم FC','تركت مساحة للأسلاك وUSB','تجنبت الضغط على الجيروسكوب','رتبت أسلاك الإشارة والطاقة'],
  },
  {
    id: 'step-4', number: 4, icon: 'Zap',
    title: 'اللحام والتوصيل',
    description: 'لحام الأسلاك وتوصيل جميع المكونات الكهربائية.',
    checklist: ['لحمت أسلاك البطارية بشكل صحيح','لحمت أسلاك المحركات','وصلت 5V و GND للـ Receiver','وصلت TX/RX بشكل متقاطع (صحيح)','استخدمت Flux','لا توجد solder bridges','الأسلاك مثبتة وغير مشدودة'],
  },
  {
    id: 'step-5', number: 5, icon: 'Shield',
    title: 'فحص قبل البطارية',
    description: 'التحقق الأمني الكامل قبل أول تشغيل.',
    checklist: ['لا توجد مراوح مركبة','فحصت القطبية بالـ Multimeter','فحصت continuity بين VBAT و GND','استعددت Smoke Stopper','تأكدت من عدم وجود solder bridge','تأكدت أن GND مشترك','تأكدت أن TX/RX صحيح'],
  },
  {
    id: 'step-6', number: 6, icon: 'Settings',
    title: 'إعداد Betaflight الأساسي',
    description: 'إعداد برنامج Betaflight للتحكم في الطائرة.',
    checklist: ['وصّلت FC بالكمبيوتر','فتحت Betaflight Configurator','تأكدت من حركة الحساسات','راجعت Ports','فعّلت Serial RX على UART الصحيح','راجعت Receiver وقنواته','أنشأت Modes أساسية (ARM/ANGLE)','ضغطت Save بعد كل تغيير'],
  },
  {
    id: 'step-7', number: 7, icon: 'Activity',
    title: 'اختبار المحركات',
    description: 'التحقق من عمل المحركات واتجاهها بدون مراوح.',
    checklist: ['المراوح غير مركبة','البطارية متصلة للاختبار فقط','وافقت على تحذير Motors في Betaflight','راجعت Motor order (1-4)','راجعت Motor direction','لم ألمس الدرون أثناء الاختبار','أوقفت الاختبار بعد الانتهاء'],
  },
  {
    id: 'step-8', number: 8, icon: 'Wind',
    title: 'أول طيران آمن',
    description: 'الخطوات النهائية لأول رحلة طيران ناجحة.',
    checklist: ['اخترت مكانًا مفتوحًا بعيدًا عن الناس','لا يوجد أشخاص في نطاق 30 متر','البطارية مشحونة ومثبتة جيدًا','المراوح مركبة بالاتجاه الصحيح','Receiver يعمل وجميع القنوات استجابت','Failsafe مضبوط ومختبر','Angle Mode مفعّل','جربت Arm/Disarm','بدأت بارتفاع منخفض'],
  },
];
