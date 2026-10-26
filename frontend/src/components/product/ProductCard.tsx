import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react'
import { useRef, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../../context/CartContext'
import { useFx } from '../../context/FxContext'
import { formatPrice } from '../../lib/format'
import type { ProductSummary } from '../../lib/types'
import { PlusIcon } from '../Icons'
import { ProductVisual } from './ProductVisual'

export function ProductBadge({ product }: { product: ProductSummary }) {
  if (product.discount_percent) return <span className="badge badge--promo">Promo −{product.discount_percent} %</span>
  if (product.is_new) return <span className="badge badge--new">Nouveau</span>
  if (product.is_bestseller) return <span className="badge badge--best">Meilleure vente</span>
  return null
}

export function useAddToCart() {
  const { add } = useCart()
  const { flyToCart, toast } = useFx()
  return (product: ProductSummary, origin: HTMLElement | null, variantIndex = 0, quantity = 1) => {
    const variant = product.variants[variantIndex]
    if (!variant) return
    add(
      {
        variantId: variant.id,
        slug: product.slug,
        name: product.name,
        variantLabel: variant.label,
        unitPrice: variant.price,
        category: product.category,
      },
      quantity,
    )
    flyToCart(origin)
    toast(`${quantity > 1 ? `${quantity} articles ajoutés` : 'Ajouté au panier'} — ${product.name}`, {
      label: 'Voir',
      to: '/panier',
    })
  }
}

/**
 * Carte produit : inclinaison 3D qui suit le pointeur, reflet doré qui glisse sur le
 * visuel, médaillon qui flotte, et ajout au panier avec étincelle volante.
 */
export function ProductCard({ product, compact = false }: { product: ProductSummary; compact?: boolean }) {
  const addToCart = useAddToCart()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const firstVariant = product.variants[0]
  const out = !product.in_stock

  const px = useMotionValue(0.5)
  const py = useMotionValue(0.5)
  const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), { stiffness: 200, damping: 20 })
  const rotateY = useSpring(useTransform(px, [0, 1], [-7, 7]), { stiffness: 200, damping: 20 })
  const glareX = useTransform(px, [0, 1], ['0%', '100%'])
  const glareY = useTransform(py, [0, 1], ['0%', '100%'])
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,243,207,0.55), transparent 55%)`

  function onMove(event: PointerEvent<HTMLAnchorElement>) {
    if (event.pointerType !== 'mouse') return
    const rect = event.currentTarget.getBoundingClientRect()
    px.set((event.clientX - rect.left) / rect.width)
    py.set((event.clientY - rect.top) / rect.height)
  }
  function onLeave() {
    px.set(0.5)
    py.set(0.5)
  }

  return (
    <article className={`pcard ${compact ? 'pcard--compact' : ''}`}>
      <motion.div className="pcard__media-wrap" style={{ rotateX, rotateY, transformPerspective: 900 }}>
        <Link
          to={`/produit/${product.slug}`}
          className="pcard__media"
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          aria-label={product.name}
          tabIndex={-1}
        >
          <ProductVisual category={product.category} imageUrl={product.image_url} />
          <motion.span className="pcard__glare" style={{ background: glare }} aria-hidden="true" />
          <span className="pcard__badge">
            <ProductBadge product={product} />
          </span>
        </Link>
      </motion.div>
      <div className="pcard__body">
        <span className="pcard__cat">{product.category_label}</span>
        <Link to={`/produit/${product.slug}`} className="pcard__name">
          {product.name}
        </Link>
        {!compact && firstVariant && (
          <span className="pcard__format">
            {product.variants.length > 1 ? product.variants.map((v) => v.label).join(' · ') : firstVariant.label}
          </span>
        )}
        <div className="pcard__prices">
          {firstVariant ? (
            <span className="price pcard__price">
              {product.variants.length > 1 && <small>dès </small>}
              {formatPrice(product.price)}
            </span>
          ) : (
            <span className="pcard__price pcard__price--none">Prix sur demande</span>
          )}
          {product.compare_at_price && product.discount_percent ? (
            <s className="pcard__was">{formatPrice(product.compare_at_price)}</s>
          ) : null}
        </div>
      </div>
      {compact ? null : !firstVariant ? (
        <Link to={`/produit/${product.slug}`} className="btn btn--outline btn--sm">
          Voir le produit
        </Link>
      ) : out ? (
        <button type="button" className="btn btn--sm" disabled>
          Rupture de stock
        </button>
      ) : (
        <motion.button
          ref={buttonRef}
          type="button"
          className="btn btn--outline btn--sm pcard__add"
          whileTap={{ scale: 0.95 }}
          onClick={() => addToCart(product, buttonRef.current)}
        >
          <PlusIcon size={16} />
          Ajouter au panier
        </motion.button>
      )}
    </article>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="pcard" aria-hidden="true">
      <div className="skeleton" style={{ aspectRatio: '4 / 5', borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 12, width: '40%', marginTop: 16 }} />
      <div className="skeleton" style={{ height: 22, width: '80%', marginTop: 10 }} />
      <div className="skeleton" style={{ height: 16, width: '30%', marginTop: 10 }} />
    </div>
  )
}
