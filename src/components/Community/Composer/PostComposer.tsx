import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Video, X } from 'lucide-react';
import { VISIBLE_CATEGORY_IDS, CATEGORY_LABELS } from '../utils/categories';
import { useComposer } from '../hooks/useComposer';
import {
  ALLOWED_IMAGE_MIME_TYPES, MAX_RAW_INPUT_BYTES, isAllowedImageMimeType, verifyImageDecodable,
} from './MediaUploader';
import type { PostCategory } from '../types';

interface PostComposerProps {
  onPosted: (postId: string) => void;
  onCancel: () => void;
}

// Temporarily disabled — same Firebase Blaze billing blocker documented in
// docs/KNOWN_ISSUES.md's Blaze-billing-bridge entries (Storage rules/upload
// pipeline still require billing to be enabled). The underlying upload path
// (MediaUploader, handleImagePick, the hidden file input, useComposer's
// imageFile plumbing) is untouched below — flipping this back to `false`
// restores the real button with no other changes needed. Exported so
// CommunityHome.tsx's own separate quick-prompt photo/video row (a second,
// independent entry point into this same composer) can gate its own photo
// button off the same single source of truth, instead of a second constant
// silently drifting out of sync with this one.
export const IMAGE_UPLOAD_TEMPORARILY_DISABLED = true;

// Category picker uses VISIBLE_CATEGORY_IDS only (D7) — the same single
// source of truth CategoryChips uses for the feed filter. No default
// selection: the نشر button stays disabled until the user explicitly picks
// one (a category is meaningful metadata, not a formality).
export const PostComposer: React.FC<PostComposerProps> = ({ onPosted, onCancel }) => {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<PostCategory | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [validatingImage, setValidatingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { createPost, submitting, error } = useComposer();

  // Correction pass: the image-only publish flow must be independently
  // publishable — an image and a non-empty text body are two SEPARATE ways
  // to satisfy "this post has content," not one mandatory field plus an
  // optional attachment. The rule is deliberately `hasValidText ||
  // hasValidImage`, not `hasValidText` alone. `imageFile` only ever holds a
  // value that has already passed the MIME/size/decode pipeline in
  // handleImagePick below, so its mere presence here is itself proof of a
  // valid, ready-to-upload image — no separate "is it valid" recheck is
  // needed at this call site.
  const hasValidText = text.trim().length > 0;
  const hasValidImage = imageFile !== null;
  const canSubmit = (hasValidText || hasValidImage) && !submitting;

  // Pre-upload validation pipeline (Phase 9) — every check runs BEFORE the
  // file is accepted into state/preview, so an invalid pick never gets as
  // far as a preview or a wasted compression pass. Order matters: cheap
  // synchronous checks (type, size) first, the more expensive async decode
  // check last — no reason to spend a createImageBitmap() call on a file
  // that's already rejected on its declared MIME type or size.
  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input's own value so picking the SAME file again after a
    // rejection still fires a change event (the browser otherwise treats
    // "same file selected again" as a no-op change).
    e.target.value = '';
    if (!file) return;

    setImageError(null);

    if (!isAllowedImageMimeType(file.type)) {
      setImageError('صيغة الصورة غير مدعومة. الصيغ المسموحة: JPEG وPNG وWebP فقط.');
      return;
    }
    if (file.size > MAX_RAW_INPUT_BYTES) {
      setImageError('حجم الصورة كبير جداً. الحد الأقصى 20 ميجابايت.');
      return;
    }

    setValidatingImage(true);
    const decodable = await verifyImageDecodable(file);
    setValidatingImage(false);
    if (!decodable) {
      setImageError('تعذّر قراءة هذه الصورة. جرب ملفاً آخر.');
      return;
    }

    // Replacing an already-selected image — revoke the OLD preview URL
    // before minting a new one, so a rapid pick→replace→replace sequence
    // never leaks object URLs.
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setImageError(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
  };

  const submit = async () => {
    if (!canSubmit) return;
    // Reset before this attempt — a retry after a previous failed
    // image-post submission must not show a stale 100% progress bar left
    // over from that earlier attempt.
    setUploadProgress(0);
    const postId = await createPost({
      text: text.trim(),
      category,
      imageFile,
      onUploadProgress: (fullPct, thumbPct) => setUploadProgress(Math.round((fullPct + thumbPct) / 2)),
    });
    if (postId) onPosted(postId);
  };

  // Three honest, distinct phases while submitting an image post — the app
  // must never claim "published" before Storage AND Firestore both
  // succeed, and must never claim "uploading" for a text-only post (which
  // has no Storage step at all, so onUploadProgress is never called and
  // uploadProgress stays 0 for the whole, brief Firestore-only write).
  const submitLabel = !submitting
    ? 'نشر'
    : imageFile && uploadProgress < 100
      ? 'جارٍ رفع الصورة...'
      : 'جارٍ نشر المنشور...';

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
        placeholder={imageFile ? 'أضف وصفًا أو سؤالًا للصورة — اختياري' : 'بماذا تحتاج المساعدة اليوم؟'}
        dir="auto"
        rows={5}
        style={{ width: '100%', border: '0.5px solid #e5eaf0', borderRadius: 12, padding: 12, fontSize: 14, color: '#1a2b3c', resize: 'none' }}
      />
      <p style={{ fontSize: 11, color: '#94a3b3', textAlign: 'left', margin: '4px 0 14px' }} dir="ltr">{text.length}/2000</p>

      {/* Single aria-live region for every readiness/validation/error state
          below — a screen-reader user gets each transition announced
          (rejected pick, "ready to publish", upload/publish phase) without
          needing to poll the DOM themselves. Visual state is never
          color-only: each status is also a distinct, readable Arabic
          sentence. */}
      <div aria-live="polite">
        {imageError && <p style={{ fontSize: 12, color: '#dc2626', marginBottom: 10 }}>{imageError}</p>}
        {validatingImage && <p style={{ fontSize: 12, color: '#94a3b3', marginBottom: 10 }}>جارٍ التحقق من الصورة...</p>}
        {imageFile && !validatingImage && !submitting && (
          <p style={{ fontSize: 12, color: '#0e7c86', fontWeight: 600, marginBottom: 10 }}>الصورة جاهزة للنشر</p>
        )}
        {submitting && imageFile && (
          <p style={{ fontSize: 12, color: '#5a6b7c', marginBottom: 10 }}>{submitLabel}</p>
        )}
      </div>

      {imagePreviewUrl && (
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <div style={{ width: '100%', aspectRatio: '16/10', borderRadius: 10, overflow: 'hidden', background: '#eef2f6' }}>
            <img src={imagePreviewUrl} alt="معاينة الصورة المختارة قبل النشر" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <button
            onClick={removeImage}
            disabled={submitting}
            aria-label="إزالة الصورة"
            style={{
              position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(26,43,60,0.7)', border: 'none', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1,
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
        {IMAGE_UPLOAD_TEMPORARILY_DISABLED ? (
          // Same قريباً disabled treatment as the video slot below, not a
          // new pattern. The real button + hidden file input are still
          // defined further down (unreached while this constant is true) —
          // see IMAGE_UPLOAD_TEMPORARILY_DISABLED's own comment above.
          <button
            disabled
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
              border: '0.5px solid #e5eaf0', background: '#f7f9fb', color: '#94a3b3', fontSize: 13,
              cursor: 'not-allowed', position: 'relative',
            }}
          >
            <ImageIcon size={16} /> صورة
            <span style={{
              position: 'absolute', top: -8, left: -6, fontSize: 9, fontWeight: 700,
              background: '#fbbf24', color: '#78350f', padding: '2px 6px', borderRadius: 999,
            }}>
              قريباً
            </span>
          </button>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_IMAGE_MIME_TYPES.join(',')}
              onChange={handleImagePick}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={validatingImage || submitting}
              aria-label={imageFile ? 'استبدال الصورة' : 'إضافة صورة'}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10,
                border: imageFile ? '1px solid #0e7c86' : '0.5px solid #e5eaf0',
                background: imageFile ? '#e6f4f3' : '#ffffff',
                color: imageFile ? '#0e7c86' : '#5a6b7c', fontSize: 13,
                cursor: (validatingImage || submitting) ? 'not-allowed' : 'pointer', opacity: (validatingImage || submitting) ? 0.7 : 1,
              }}
            >
              <ImageIcon size={16} /> {imageFile ? 'استبدال الصورة' : 'صورة'}
            </button>
          </>
        )}

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
        {submitLabel}
      </button>
    </div>
  );
};
