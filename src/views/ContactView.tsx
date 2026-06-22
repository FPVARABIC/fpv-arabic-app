import React, { useState } from 'react';
import { AppShell } from '../components/AppShell';
import { Header } from '../components/Header';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { STORAGE_KEYS } from '../utils/storageKeys';
import type { ContactMessage } from '../types';
import { CheckCircle2, Send } from 'lucide-react';

const messageTypes = ['اقتراح', 'مشكلة', 'سؤال', 'تعاون'];

export const ContactView: React.FC = () => {
  const [, setMessages] = useLocalStorage<ContactMessage[]>(STORAGE_KEYS.CONTACT_MESSAGES, []);
  const [form, setForm] = useState({ name: '', email: '', type: 'اقتراح', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'الاسم مطلوب';
    if (!form.message.trim()) e.message = 'نص الرسالة مطلوب';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const msg: ContactMessage = { id: Date.now().toString(), ...form, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, msg]);
    setSent(true);
    setForm({ name: '', email: '', type: 'اقتراح', message: '' });
  };

  return (
    <AppShell>
      <Header title="تواصل معنا"/>
      <div className="px-4 py-5 space-y-5 fade-in">
        <div className="glass-card-sm p-4 space-y-1">
          <p className="font-semibold text-white">FPV بالعربي</p>
          <p className="text-xs text-slate-400">تطبيق تعليمي عربي للمبتدئين في بناء الدرونات</p>
        </div>

        <p className="text-sm text-slate-400">إذا كان لديك اقتراح، مشكلة، أو فكرة لتحسين التطبيق يمكنك التواصل معنا.</p>

        {sent && (
          <div className="success-card flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-400"/>
            <p className="text-sm text-green-400">تم حفظ رسالتك محلياً كمثال. سيتم تفعيل الإرسال الحقيقي لاحقاً.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-slate-300 block mb-1">الاسم <span className="text-red-400">*</span></label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
              className={`w-full glass-card-sm px-3 py-2.5 text-sm text-white bg-transparent outline-none border ${errors.name ? 'border-red-400/50' : 'border-cyan-400/20 focus:border-cyan-400/50'} rounded-xl transition-all`}
              placeholder="اسمك"/>
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="text-sm text-slate-300 block mb-1">البريد الإلكتروني</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))}
              className="w-full glass-card-sm px-3 py-2.5 text-sm text-white bg-transparent outline-none border border-cyan-400/20 focus:border-cyan-400/50 rounded-xl transition-all"
              placeholder="email@example.com"/>
          </div>
          <div>
            <label className="text-sm text-slate-300 block mb-1">نوع الرسالة</label>
            <div className="flex flex-wrap gap-2">
              {messageTypes.map(type => (
                <button key={type} type="button" className={`px-3 py-1.5 rounded-full text-sm border transition-all ${form.type === type ? 'bg-cyan-400/20 border-cyan-400/50 text-cyan-400' : 'border-white/10 text-slate-400 hover:border-cyan-400/20'}`}
                  onClick={() => setForm(p => ({...p, type}))}>
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-slate-300 block mb-1">نص الرسالة <span className="text-red-400">*</span></label>
            <textarea value={form.message} onChange={e => setForm(p => ({...p, message: e.target.value}))} rows={4}
              className={`w-full glass-card-sm px-3 py-2.5 text-sm text-white bg-transparent outline-none border ${errors.message ? 'border-red-400/50' : 'border-cyan-400/20 focus:border-cyan-400/50'} rounded-xl transition-all resize-none`}
              placeholder="اكتب رسالتك هنا..."/>
            {errors.message && <p className="text-xs text-red-400 mt-1">{errors.message}</p>}
          </div>
          <button type="submit" className="btn-primary w-full"><Send size={16}/>إرسال الرسالة</button>
        </form>
      </div>
    </AppShell>
  );
};
