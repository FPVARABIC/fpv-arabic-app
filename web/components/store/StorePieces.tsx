import Link from 'next/link';
import type {
  ProductImage as ProductImageData, StoreProduct, StorePublicSettings, ChoiceAxis,
} from '@core/data/store/types';
import {
  AVAILABILITY_LABEL_AR, CHOICE_POSITION_LABEL_AR, isImagePublishable,
} from '@core/data/store/types';
import { webHref } from '@/lib/webRoutes';
import { priceState, productHref, isOrderable } from '@/lib/store';

/**
 * The store's shared pieces.
 *
 * Presentation only. Every judgement they render — what a product is for, who
 * it does not suit, whether it has a price — was made in `src/data/store/`, and
 * these decide only how it looks.
 */

/**
 * The commercial promise at the top of the shop.
 *
 * Rendered from settings rather than written here, because it will be edited
 * far more often than this component. Disabled settings render nothing at all
 * rather than an empty bar.
 */
export const StoreBanner: React.FC<{
  settings: StorePublicSettings;
  compact?: boolean;
}> = ({ settings, compact }) => {
  const b = settings.banner;
  if (!b.enabled) return null;
  const link = b.link ? webHref({ kind: b.link.kind, id: b.link.targetId } as Parameters<typeof webHref>[0]) : null;

  return (
    <aside
      data-testid="store-banner"
      className="card"
      style={{
        padding: compact ? '13px 16px' : '18px 20px',
        marginTop: compact ? 16 : 0,
        borderColor: 'rgba(52,211,153,0.32)',
        background: 'linear-gradient(135deg, rgba(52,211,153,0.10), rgba(52,211,153,0.02))',
      }}
    >
      <p style={{
        margin: 0, fontSize: compact ? 14 : 16, fontWeight: 900, color: '#6ee7b7',
      }}>
        {b.headlineAr}
      </p>
      <p style={{
        margin: '7px 0 0', fontSize: compact ? 12.5 : 13.5,
        color: 'var(--text-dim)', lineHeight: 1.95,
      }}>
        {b.bodyAr}
      </p>
      {link?.href && b.link && (
        <p style={{ margin: '10px 0 0' }}>
          <Link href={link.href} className="btn-ghost" data-testid="store-banner-link"
            style={{ fontSize: 12.5 }}>
            {b.link.label} ←
          </Link>
        </p>
      )}
    </aside>
  );
};

/**
 * A product's price, in one of its three honest states.
 *
 * The unpriced state is the one worth reading the code for: it renders as
 * «السعر قيد التحديث» with no order control, because a product whose supply
 * record is incomplete has no price — and a placeholder number would be one a
 * customer could act on.
 */
export const Price: React.FC<{ product: StoreProduct; large?: boolean }> = ({ product, large }) => {
  const state = priceState(product);
  const size = large ? 22 : 15;

  if (state.kind === 'priced') {
    return (
      <span style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span data-testid="product-price"
          style={{ fontSize: size, fontWeight: 900, color: 'var(--text)' }}>
          {state.textAr}
        </span>
        {state.compareTextAr && (
          <span style={{ fontSize: size * 0.62, color: 'var(--text-dimmer)', textDecoration: 'line-through' }}>
            {state.compareTextAr}
          </span>
        )}
      </span>
    );
  }

  return (
    <span data-testid={`product-price-${state.kind}`}
      style={{ fontSize: size * 0.72, fontWeight: 800, color: 'var(--text-dimmer)' }}>
      {state.textAr}
    </span>
  );
};

/**
 * The image, or an honest absence of one.
 *
 * No product photography is bundled: it belongs to its manufacturer, and using
 * it without permission was both forbidden by the brief and a real exposure. So
 * a product with no image renders a typed placeholder that says so, rather than
 * a broken frame or a stock photo of something else.
 */
export const ProductImage: React.FC<{ product: StoreProduct; height?: number }> = ({
  product, height = 170,
}) => {
  // Only a licensed image is ever shown. Not «the first image» — the first
  // image somebody can defend. An unlicensed file sitting in the database
  // renders as the placeholder, which is the honest answer and also the one
  // that keeps it from being published by accident.
  const img = publishableImages(product)[0];
  if (!img) {
    return (
      <div
        data-testid="product-image-placeholder"
        aria-label={`لا توجد صورة لـ${product.nameEn} بعد`}
        style={{
          height, borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)',
          border: '1px dashed var(--border)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center',
          padding: 12,
        }}
      >
        <span aria-hidden style={{ fontSize: 22, opacity: 0.5 }}>▣</span>
        <span style={{ fontSize: 11, color: 'var(--text-dimmer)', lineHeight: 1.7 }}>
          صورة المنتج تُضاف بإذن الشركة الصانعة
        </span>
      </div>
    );
  }
  return (
    /*
     * A plain <img>, deliberately.
     *
     * `next/image` needs every image host declared in the build config, which
     * would make changing a supplier a code change and a deployment — exactly
     * what the requirement that images stay easy to swap rules out. Width and
     * height are fixed by the layout, so the layout-shift the optimizer usually
     * prevents cannot happen here either.
     */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={img.url}
      alt={img.altAr}
      loading="lazy"
      style={{ width: '100%', height, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
    />
  );
};

/** One product, as it appears in a section. */
export const ProductCard: React.FC<{ product: StoreProduct; axis: ChoiceAxis }> = ({
  product, axis,
}) => (
  <Link
    href={productHref(product.id)}
    className="card-sm"
    data-testid={`product-card-${product.id}`}
    style={{ display: 'block', padding: 14, minWidth: 0 }}
  >
    <ProductImage product={product} />

    <span style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 11 }}>
      {/* Where it sits on the section's axis — the thing that makes three
          products read as a choice instead of as a list. */}
      <span className="admin-badge" data-testid={`product-position-${product.id}`}
        style={{ color: 'var(--accent)' }}>
        {CHOICE_POSITION_LABEL_AR[axis][product.choicePosition]}
      </span>
      <span className="admin-badge">{AVAILABILITY_LABEL_AR[product.availability]}</span>
    </span>

    <span className="ltr" style={{
      display: 'block', fontSize: 13.5, fontWeight: 900, marginTop: 9,
    }}>
      {product.nameEn}
    </span>
    <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-dim)', marginTop: 3 }}>
      {product.titleAr}
    </span>

    <span style={{ display: 'block', marginTop: 10 }}>
      <Price product={product} />
    </span>

    {!isOrderable(product) && (
      <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dimmer)', marginTop: 6 }}>
        لا يمكن طلبه الآن
      </span>
    )}
  </Link>
);


/**
 * Every image we may actually show, in gallery order.
 *
 * One function, used by the card, the gallery and the admin count, so «has an
 * image» means the same thing in all three. The card and the page disagreeing
 * about that is how an unlicensed photo ends up on a listing page while the
 * product page correctly refuses it.
 */
export function publishableImages(product: StoreProduct): ProductImageData[] {
  return product.images
    .filter(isImagePublishable)
    .slice()
    .sort((a, b) => a.order - b.order);
}

/**
 * The product gallery.
 *
 * A server component with no JavaScript: the first image is large, the rest are
 * thumbnails that are also anchors into the same page. Somebody on a slow
 * connection sees the main photograph and can reach the others; nobody waits
 * for a carousel library to decide.
 *
 * `loading="lazy"` on everything but the first. The first is what the page is
 * about and lazy-loading it is how a product page renders empty for a moment;
 * the rest are below the fold by construction.
 */
export const ProductGallery: React.FC<{ product: StoreProduct }> = ({ product }) => {
  const images = publishableImages(product);
  if (images.length === 0) return <ProductImage product={product} height={300} />;

  return (
    <div data-testid="product-gallery">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        id={`img-${product.id}-0`}
        src={images[0].url}
        alt={images[0].altAr}
        width={600}
        height={450}
        /* Explicit dimensions and a fixed aspect box: the browser reserves the
           space before the bytes arrive, so nothing below jumps when they do. */
        style={{
          width: '100%', height: 'auto', aspectRatio: '4 / 3', objectFit: 'cover',
          borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)',
        }}
      />
      {images.length > 1 && (
        <div data-testid="product-thumbs" style={{
          display: 'flex', gap: 8, marginTop: 9, flexWrap: 'wrap',
        }}>
          {images.map((img, i) => (
            <a key={i} href={`#img-${product.id}-${i}`} data-testid={`product-thumb-${i}`}
              aria-label={`صورة ${i + 1}: ${img.altAr}`}
              style={{ display: 'block', lineHeight: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                id={i === 0 ? undefined : `img-${product.id}-${i}`}
                src={img.url}
                alt=""
                width={68}
                height={51}
                loading="lazy"
                style={{
                  width: 68, height: 51, objectFit: 'cover',
                  borderRadius: 8, border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                }}
              />
            </a>
          ))}
        </div>
      )}
      {/* Attribution, quietly. The manufacturer owns the photograph and saying
          so costs one line and settles the question before it is asked. */}
      {images[0].credit && (
        <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--text-dimmer)' }}>
          الصور: {images[0].credit.ownerAr}
        </p>
      )}
    </div>
  );
};
