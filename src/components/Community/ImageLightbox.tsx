import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ImageLightboxProps {
  src: string;
  onClose: () => void;
  // Meaningful by default (the lightbox IS the full-content view of the
  // image, unlike PostCard's decorative thumbnail) — callers with a real
  // caption/description available can override it; PostDetail currently has
  // none, so the default covers it.
  alt?: string;
}

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

// Full-screen image preview (Phase 9; correction pass adds real dialog
// semantics + focus management) — a portal to document.body, same
// convention as ReportButton/ProfileSheet's own fixed-position overlays,
// for the same reason: AppShell's <main> establishes its own stacking
// context, so a fixed-position element declared inside it can still end up
// visually trapped beneath siblings rendered outside that context (the
// bottom navigation bar in particular) unless it escapes via a portal.
// object-fit: contain (not cover) — this is the one place the FULL,
// undistorted, uncropped image is shown; PostCard's thumbnail and
// PostDetail's inline image both intentionally crop/fit for feed layout,
// but a full-screen preview exists specifically to show the whole photo.
export const ImageLightbox: React.FC<ImageLightboxProps> = ({ src, onClose, alt = 'صورة المنشور بحجمها الكامل' }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Captured BEFORE closeButtonRef steals focus below — at this point the
    // still-focused element is whatever the caller had focused when it
    // rendered this component (in practice, PostDetail's "فتح الصورة بحجمها
    // الكامل" button), so it survives as the exact focus-return target
    // regardless of which screen mounted the lightbox.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;

      // A minimal, dependency-free focus trap: recomputed on every Tab
      // press (not cached at mount) so it stays correct even if the
      // dialog's focusable contents ever change while open. With only the
      // close button currently focusable, this still correctly keeps focus
      // pinned there rather than letting Tab escape to the page behind the
      // (visually opaque but otherwise unprotected) backdrop.
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="معاينة الصورة بحجمها الكامل"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        background: 'rgba(10,15,20,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <button
        ref={closeButtonRef}
        onClick={onClose}
        aria-label="إغلاق المعاينة"
        style={{
          position: 'fixed', top: 16, insetInlineEnd: 16, width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', zIndex: 71,
        }}
      >
        <X size={18} color="#ffffff" />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 4 }}
      />
    </div>,
    document.body,
  );
};
