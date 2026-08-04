'use client';

import { useState } from 'react';
import { setProductPublished } from '@/app/admin/store/products/actions';

/**
 * Taking a product off the shop, or putting it back.
 *
 * This is the store's «delete», and the label says so plainly rather than
 * hiding behind «تعطيل». Orders reference product ids and freeze the name and
 * price they were placed at, so a real delete would leave somebody's order
 * pointing at nothing — which is why the operation is hiding, and why it is
 * reversible from the same button.
 */
export const PublishToggle: React.FC<{ productId: string; published: boolean }> = ({
  productId, published,
}) => {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        className={published ? 'admin-danger' : 'btn-ghost'}
        data-testid={`product-publish-${productId}`}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          const r = await setProductPublished(productId, !published);
          setPending(false);
          if (!r.ok) setError(r.errorAr);
        }}
        style={{ fontSize: 12 }}
      >
        {pending ? '…' : published ? 'أخفِ من المتجر' : 'أعد عرضه'}
      </button>
      {error && (
        <span role="alert" style={{ fontSize: 11.5, color: '#fca5a5' }}>{error}</span>
      )}
    </>
  );
};
