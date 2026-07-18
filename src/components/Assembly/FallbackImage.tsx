import React, { useState } from 'react';

interface FallbackImageProps {
  imagePath?: string;
  alt?: string;
  fallback: React.ReactNode;
  style?: React.CSSProperties;
}

// Shared "real image with graceful fallback" logic — extracted so
// OptionCard (BuildFlow.tsx) and FinalReportScreen.tsx's summary rows don't
// each reimplement the same imagePath/onError/fallback-state pattern already
// independently established by AssemblyHome.tsx's TypeImage and
// PartCard.tsx. A missing imagePath or a failed load both render the
// caller's own fallback content (typically the existing emoji) instead of a
// broken-image icon. Callers should pass `key={imagePath}` at the call site
// so a genuinely different image path (not just a re-render) always gets a
// fresh load attempt rather than reusing a prior failure.
export const FallbackImage: React.FC<FallbackImageProps> = ({ imagePath, alt = '', fallback, style }) => {
  const [failed, setFailed] = useState(false);
  if (!imagePath || failed) {
    return <>{fallback}</>;
  }
  return (
    <img
      src={imagePath}
      alt={alt}
      onError={() => setFailed(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover', ...style }}
    />
  );
};
