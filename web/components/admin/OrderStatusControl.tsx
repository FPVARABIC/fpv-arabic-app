'use client';

import { useState } from 'react';
import { ORDER_STATUS_LABEL_AR, ORDER_STATUS_NEXT } from '@core/data/store/types';
import type { OrderStatus } from '@core/data/store/types';
import { setOrderStatus } from '@/app/admin/store/orders/actions';

/**
 * Moving an order to its next state.
 *
 * The buttons come from `ORDER_STATUS_NEXT`, so the panel can only offer
 * transitions the lifecycle declares. A delivered order renders no buttons at
 * all — not disabled ones, none — because there is nowhere for it to go and a
 * greyed-out control invites somebody to wonder why.
 *
 * The server checks the same table again. This is what the operator sees; that
 * is what is true.
 */
export const OrderStatusControl: React.FC<{ orderId: string; status: OrderStatus }> = ({
  orderId, status,
}) => {
  const [pending, setPending] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const next = ORDER_STATUS_NEXT[status] ?? [];

  if (next.length === 0) {
    return (
      <p style={{ margin: '12px 0 0', fontSize: 11.5, color: 'var(--text-dimmer)' }}>
        هذه الحالة نهائية.
      </p>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {next.map(s => (
          <button
            key={s}
            type="button"
            className={s === 'cancelled' ? 'admin-danger' : 'btn-ghost'}
            data-testid={`order-status-${orderId}-${s}`}
            disabled={pending !== null}
            onClick={async () => {
              setPending(s);
              setError(null);
              const r = await setOrderStatus(orderId, s);
              setPending(null);
              if (!r.ok) setError(r.errorAr);
            }}
            style={{ fontSize: 12 }}
          >
            {pending === s ? '…' : ORDER_STATUS_LABEL_AR[s]}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" style={{ margin: '8px 0 0', fontSize: 12, color: '#fca5a5' }}>{error}</p>
      )}
    </div>
  );
};
