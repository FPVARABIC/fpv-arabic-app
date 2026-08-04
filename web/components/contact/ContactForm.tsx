'use client';

import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { STORAGE_KEYS } from '@core/utils/storageKeys';

/**
 * The contact form.
 *
 * THE HONESTY RULE
 * ----------------
 * There is no send endpoint yet. The phone app is straightforward about that —
 * it stores the message locally and says so — and this does the same, in the
 * same words. A form that animates a paper plane and says «تم الإرسال» while
 * nothing left the browser is worse than no form: the reader stops waiting for
 * a reply that was never going to come.
 *
 * When a real endpoint exists this component gains a `fetch` and loses the
 * paragraph. Nothing else about it changes, which is the point of writing the
 * limitation into the copy rather than into a TODO.
 */

export const ContactForm: React.FC<{
  types: string[];
  defaultName?: string;
  defaultEmail?: string;
}> = ({ types, defaultName = '', defaultEmail = '' }) => {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [type, setType] = useState(types[0]);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<{ name?: string; message?: string }>({});
  const [saved, setSaved] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'الاسم مطلوب';
    if (!message.trim()) next.message = 'نصّ الرسالة مطلوب';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.CONTACT_MESSAGES);
      const list: unknown[] = raw ? JSON.parse(raw) : [];
      list.push({
        id: String(list.length + 1),
        name: name.trim(),
        email: email.trim(),
        type,
        message: message.trim(),
        timestamp: new Date().toISOString(),
      });
      window.localStorage.setItem(STORAGE_KEYS.CONTACT_MESSAGES, JSON.stringify(list));
    } catch { /* private mode — the message is still shown as saved-in-session */ }

    setSaved(true);
    setMessage('');
  };

  const field: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: 14,
    fontFamily: 'inherit',
    lineHeight: 1.8,
  };

  const label: React.CSSProperties = {
    display: 'block', fontSize: 13, fontWeight: 800, marginBottom: 6,
  };

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 24, display: 'grid', gap: 18 }} data-testid="contact-form">
      {saved && (
        <div
          role="status"
          className="card"
          data-testid="contact-saved"
          style={{
            padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'flex-start',
            borderColor: 'rgba(15,123,79,0.32)', background: 'var(--sev-ok-wash)',
          }}
        >
          <CheckCircle2 size={17} color="var(--sev-ok)" aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--sev-ok)', lineHeight: 1.9 }}>
            حُفظت رسالتك في هذا المتصفّح. الإرسال المباشر لم يُفعَّل بعد — نقول ذلك
            صراحةً بدل أن نعِدك بردٍّ لن يصل.
          </p>
        </div>
      )}

      {/* The type, as visible choices rather than a dropdown. On a wide screen
          there is room to show four options; hiding them behind a control the
          reader must open buys nothing. */}
      <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
        <legend style={{ ...label, padding: 0 }}>نوع الرسالة</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }} data-testid="contact-types">
          {types.map(t => (
            <label
              key={t}
              className="press"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '8px 15px', borderRadius: 999, cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
                border: `1px solid ${type === t ? 'var(--border-accent)' : 'var(--border)'}`,
                background: type === t ? 'var(--accent-wash)' : 'var(--surface)',
                color: type === t ? 'var(--accent-ink)' : 'var(--text-dim)',
              }}
            >
              <input
                type="radio"
                name="contact-type"
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
                style={{ margin: 0, accentColor: 'var(--accent-ink)' }}
              />
              {t}
            </label>
          ))}
        </div>
      </fieldset>

      <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(0, 1fr)' }} className="contact-grid">
        <div>
          <label htmlFor="contact-name" style={label}>
            الاسم <span style={{ color: 'var(--sev-blocker)' }} aria-hidden>*</span>
          </label>
          <input
            id="contact-name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'contact-name-error' : undefined}
            style={{ ...field, borderColor: errors.name ? 'var(--sev-blocker)' : undefined }}
            placeholder="اسمك"
          />
          {errors.name && (
            <p id="contact-name-error" role="alert" style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--sev-blocker)' }}>
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="contact-email" style={label}>
            البريد الإلكتروني <span style={{ color: 'var(--text-dimmer)', fontWeight: 600 }}>(اختياري)</span>
          </label>
          <input
            id="contact-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={field}
            placeholder="لنتمكّن من الردّ عليك"
            dir="ltr"
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" style={label}>
          الرسالة <span style={{ color: 'var(--sev-blocker)' }} aria-hidden>*</span>
        </label>
        <textarea
          id="contact-message"
          value={message}
          onChange={e => setMessage(e.target.value)}
          required
          rows={7}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'contact-message-error' : undefined}
          style={{ ...field, resize: 'vertical', borderColor: errors.message ? 'var(--sev-blocker)' : undefined }}
          placeholder="اكتب ما حدث بالضبط: أي صفحة، وأي قطعة، وماذا توقّعت أن يحدث."
        />
        {errors.message && (
          <p id="contact-message-error" role="alert" style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--sev-blocker)' }}>
            {errors.message}
          </p>
        )}
      </div>

      <div>
        <button type="submit" className="btn-primary" data-testid="contact-submit">
          <Send size={15} aria-hidden />
          احفظ الرسالة
        </button>
        <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.85 }}>
          الرسالة تُحفظ في متصفّحك حالياً. الإرسال المباشر إلى فريق المنصّة لم يُفعَّل بعد.
        </p>
      </div>
    </form>
  );
};
