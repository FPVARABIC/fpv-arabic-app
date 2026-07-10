import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Video, X } from 'lucide-react';
import { VISIBLE_CATEGORY_IDS, CATEGORY_LABELS } from '../utils/categories';
import { useComposer } from '../hooks/useComposer';
import type { PostCategory } from '../types';

const IMAGE_UPLOADS_DISABLED_MESSAGE = 'رفع الصور غير متاح حالياً — سيتم تفعيله قريباً';

interface PostComposerProps {
  onPosted: (postId: string) => void;
  onCancel: () => void;
}

// Category picker uses VISIBLE_CATEGORY_IDS only (D7) — the same single
// source of truth CategoryChips uses for the feed filter. No default
// selection: the نشر button stays disabled until the user explicitly picks
// one (a category is meaningful metadata, not a formality).
export const PostComposer: React.FC<PostComposerProps> = ({ onPosted, onCancel }) => {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<PostCategory | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createPost, submitting, error } = useComposer();

  const canSubmit = text.trim().length > 0 && !submitting;

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
  };

  const submit = async () => {
    if (!canSubmit) return;
    const postId = await createPost({
      text: text.trim(),
      category,
      imageFile,
      onUploadProgress: (fullPct, thumbPct) => setUploadProgress(Math.round((fullPct + thumbPct) / 2)),
    });
    if (postId) onPosted(postId);
  };

  return (
    <div style={{ padding: 16, background: '#ffffff', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', color: '#5a6b7c', fontSize: 14, cursor: 'pointer' }}>إلغاء</button>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a2b3c', margin: 0 }}>منشور جديد</h2>
        <div style={{ width: 40 }} />
      </div>

      {error && <p style={{ fontSize: 13, color: '#dc2626', marginBottom: 10 }}>{error}</p>}

      <textarea
        value={text}
        onChange={e => setText(e.target.value.slice(0, 2000))}
        placeholder="بماذا تحتاج المساعدة اليوم؟"
        dir="auto"
        rows={5}
        style={{ width: '100%', border: '0.5px solid #e5eaf0', borderRadius: 12, padding: 12, fontSize: 14, color: '#1a2b3c', resize: 'none' }}
      />
      <p style={{ fontSize: 11, color: '#94a3b3', textAlign: 'left', margin: '4px 0 14px' }} dir="ltr">{text.length}/2000</p>

      {imagePreviewUrl && (
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <div style={{ width: '100%', aspectRatio: '16/10', borderRadius: 10, overflow: 'hidden', background: '#eef2f6' }}>
            <img src={imagePreviewUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <button
            onClick={removeImage}
            aria-label="إزالة الصورة"
            style={{
              position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(26,43,60,0.7)', border: 'none', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer',
            }}
          >
            <X size={14} color="#ffffff" />
          </button>
          {submitting && (
            <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, height: 4, background: 'rgba(255,255,255,0.5)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#0e7c86', transition: 'width 0.2s' }} />
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 12, color: '#5a6b7c', marginBottom: 8 }}>القسم</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {VISIBLE_CATEGORY_IDS.map(id => (
            <button
              key={id}
              onClick={() => setCategory(id)}
              style={{
                padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: category === id ? '1px solid #0e7c86' : '0.5px solid #e5eaf0',
                background: category === id ? '#0e7c86' : '#ffffff',
                color: category === id ? '#ffffff' : '#5a6b7c',
              }}
            >
              {CATEGORY_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImagePick} disabled style={{ display: 'none' }} />
        <button
          disabled
          aria-describedby="image-upload-disabled-message"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
            border: '0.5px solid #e5eaf0', background: '#f7f9fb', color: '#94a3b3', fontSize: 13,
            cursor: 'not-allowed', opacity: 0.7,
          }}
        >
          <ImageIcon size={16} /> صورة
        </button>

        {/* D4: reserved layout slot, disabled, never removed */}
        <button
          disabled
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
            border: '0.5px solid #e5eaf0', background: '#f7f9fb', color: '#94a3b3', fontSize: 13,
            cursor: 'not-allowed', position: 'relative',
          }}
        >
          <Video size={16} /> فيديو
          <span style={{
            position: 'absolute', top: -8, left: -6, fontSize: 9, fontWeight: 700,
            background: '#fbbf24', color: '#78350f', padding: '2px 6px', borderRadius: 999,
          }}>
            قريباً
          </span>
        </button>
      </div>
      <p id="image-upload-disabled-message" style={{ fontSize: 12, color: '#5a6b7c', margin: '-8px 0 18px', textAlign: 'right' }}>
        {IMAGE_UPLOADS_DISABLED_MESSAGE}
      </p>

      <button
        onClick={submit}
        disabled={!canSubmit}
        style={{
          width: '100%', padding: '13px', borderRadius: 12, border: 'none',
          background: canSubmit ? '#0e7c86' : '#e5eaf0',
          color: canSubmit ? '#ffffff' : '#94a3b3',
          fontSize: 15, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}
      >
        {submitting ? 'جارٍ النشر...' : 'نشر'}
      </button>
    </div>
  );
};
