import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BagIcon, PhoneIcon, StoreIcon, TruckIcon, WhatsAppIcon } from '../components/Icons'
import { Reveal, RevealItem } from '../components/motion/Reveal'
import { ProductBadge, ProductCard, useAddToCart } from '../components/product/ProductCard'
import { ProductVisual } from '../components/product/ProductVisual'
import { Accordion } from '../components/ui/Accordion'
import { QuantityStepper } from '../components/ui/QuantityStepper'
import { whatsappLink } from '../config'
import { useAsync } from '../hooks/useAsync'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { api, ApiError } from '../lib/api'
import { formatPrice } from '../lib/format'
import type { ProductDetail, ProductSummary } from '../lib/types'
import NotFoundPage from './NotFoundPage'

function StockLine({ stock }: { stock: number }) {
  if (stock <= 0) return <span className="status status--out">Rupture de stock</span>
  if (stock <= 5) return <span className="status status--low">Plus que {stock} en stock</span>
  return <span className="status status--ok">En stock — expédié depuis Dakar</span>
}

function Gallery({ product }: { product: ProductDetail }) {
  const [view, setView] = useState(0)
  const [direction, setDirection] = useState(1)
  const pick = (n: number) => {
    setDirection(n > view ? 1 : -1)
    setView(n)
  }
  return (
    <div className="gallery">
      <div className="gallery__main">
        <AnimatePresence mode="popLayout" custom={direction} initial={false}>
          <motion.div
            key={view}
            className="gallery__frame"
            custom={direction}
            initial={{ opacity: 0, x: direction * 60, scale: 1.04 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: direction * -60, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <ProductVisual
              category={product.category}
              imageUrl={product.image_url}
              view={view}
              label={`Photo produit officielle à fournir · Vue ${view + 1} / 4`}
            />
          </motion.div>
        </AnimatePresence>
        <span className="gallery__badge">
          <ProductBadge product={product} />
        </span>
      </div>
      <div role="group" aria-label="Choisir une vue" className="gallery__thumbs">
        {[0, 1, 2, 3].map((n) => (
          <button
            key={n}
            type="button"
            className={`gallery__thumb ${n === view ? 'gallery__thumb--on' : ''}`}
            aria-label={`Afficher la vue ${n + 1}`}
            aria-pressed={n === view}
            onClick={() => pick(n)}
          >
            <ProductVisual category={product.category} view={n} label="" />
            {n === view && <motion.span layoutId="thumb-ring" className="gallery__thumb-ring" />}
          </button>
        ))}
      </div>
    </div>
  )
}

function Purchase({ product }: { product: ProductDetail }) {
  const [variantIndex, setVariantIndex] = useState(0)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const addToCart = useAddToCart()
  const buttonRef = useRef<HTMLButtonElement>(null)
  // Produit importé sans prix : pas de format, donc commande uniquement via WhatsApp.
  const variant = product.variants[variantIndex] ?? product.variants[0]
  const hasPromo = variant?.compare_at_price && variant.compare_at_price > variant.price

  return (
    <div className="purchase">
      <div className="purchase__head">
        <span className="eyebrow">{product.category_label}</span>
        <h1 className="h1 purchase__title">{product.name}</h1>
        <span className="muted" style={{ fontSize: 14 }}>
          Réf. {product.reference}
        </span>
      </div>

      {!variant ? (
        <>
          <div className="purchase__prices">
            <span className="price purchase__price">Prix sur demande</span>
          </div>
          <p className="purchase__desc">{product.short_description}</p>
        </>
      ) : (
        <>
          <div className="purchase__prices">
            <AnimatePresence mode="wait">
              <motion.span
                key={variant.id}
                className="price purchase__price"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {formatPrice(variant.price)}
              </motion.span>
            </AnimatePresence>
            {hasPromo && <s className="purchase__was">{formatPrice(variant.compare_at_price!)}</s>}
          </div>

          <p className="purchase__desc">{product.short_description}</p>
          <StockLine stock={variant.stock} />

          <fieldset className="purchase__formats">
            <legend className="purchase__legend">
              Contenance : <span>{variant.label}</span>
            </legend>
            <div className="purchase__format-list">
              {product.variants.map((v, i) => {
                const on = i === variantIndex
                return (
                  <button
                    key={v.id}
                    type="button"
                    aria-pressed={on}
                    className={`format ${on ? 'format--on' : ''}`}
                    onClick={() => {
                      setVariantIndex(i)
                      setAdded(false)
                    }}
                  >
                    {on && <motion.span layoutId="format-ring" className="format__ring" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
                    <span className="format__label">{v.label}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <div className="purchase__actions">
            <QuantityStepper
              value={qty}
              max={Math.max(1, Math.min(50, variant.stock))}
              onChange={(n) => {
                setQty(n)
                setAdded(false)
              }}
            />
            <motion.button
              ref={buttonRef}
              type="button"
              className="btn btn--primary purchase__add"
              disabled={variant.stock <= 0}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                addToCart(product as ProductSummary, buttonRef.current, variantIndex, qty)
                setAdded(true)
              }}
            >
              <BagIcon size={20} strokeWidth={1.6} />
              {variant.stock <= 0 ? 'Indisponible' : 'Ajouter au panier'}
            </motion.button>
          </div>
        </>
      )}

      <AnimatePresence>
        {added && (
          <motion.div
            role="status"
            className="alert alert--success purchase__added"
            initial={{ opacity: 0, height: 0, marginTop: -12 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
            exit={{ opacity: 0, height: 0, marginTop: -12 }}
          >
            <span>
              {qty} article{qty > 1 ? 's' : ''} ajouté{qty > 1 ? 's' : ''} au panier.
            </span>
            <Link to="/panier" style={{ color: 'var(--vert-fonce)', fontWeight: 600 }}>
              Voir le panier
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <a
        href={whatsappLink(`Bonjour, je souhaite commander : ${product.name}${variant ? ` (${variant.label})` : ''}.`)}
        className="btn btn--whatsapp-outline btn--block"
        rel="noopener noreferrer"
      >
        <WhatsAppIcon size={20} strokeWidth={1.6} />
        Commander ou poser une question sur WhatsApp
      </a>

      <ul role="list" className="purchase__perks">
        <li>
          <TruckIcon size={22} strokeWidth={1.4} />
          <span>
            <strong>Livraison à Dakar</strong> — délai <span className="placeholder-note">[à confirmer]</span>
          </span>
        </li>
        <li>
          <StoreIcon size={22} strokeWidth={1.4} />
          <span>
            <strong>Retrait en boutique</strong> — <span className="placeholder-note">[adresse et horaires]</span>
          </span>
        </li>
        <li>
          <PhoneIcon size={22} strokeWidth={1.4} />
          <span>
            <strong>Paiement</strong> — Wave, Orange Money, carte ou à la livraison
          </span>
        </li>
      </ul>
    </div>
  )
}

export default function ProductPage() {
  const { slug = '' } = useParams()
  const { data: product, loading, error } = useAsync(() => api.get<ProductDetail>(`/products/${slug}/`), [slug])
  const { data: related } = useAsync(() => api.get<ProductSummary[]>(`/products/${slug}/related/`), [slug])
  useDocumentTitle(product?.name ?? 'Produit')

  if (error instanceof ApiError && error.status === 404) return <NotFoundPage />
  if (error) {
    return (
      <div className="container section">
        <p className="alert alert--error">Impossible de charger ce produit pour le moment.</p>
      </div>
    )
  }

  return (
    <div className="container product">
      <nav aria-label="Fil d'Ariane" className="breadcrumbs">
        <Link to="/">Accueil</Link>
        <span aria-hidden="true">/</span>
        {product ? (
          <>
            <Link to={`/boutique?category=${product.category}`}>{product.category_label}</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{product.name}</span>
          </>
        ) : (
          <span>…</span>
        )}
      </nav>

      {loading || !product ? (
        <div className="product__grid" aria-busy="true">
          <div className="skeleton" style={{ aspectRatio: '4 / 5' }} />
          <div className="stack" style={{ gap: 16 }}>
            <div className="skeleton" style={{ height: 14, width: '30%' }} />
            <div className="skeleton" style={{ height: 52, width: '80%' }} />
            <div className="skeleton" style={{ height: 30, width: '40%' }} />
            <div className="skeleton" style={{ height: 80 }} />
          </div>
        </div>
      ) : (
        <>
          <div className="product__grid">
            <Gallery product={product} />
            <Purchase key={product.id} product={product} />
          </div>

          <Reveal as="section" aria-label="Informations détaillées" className="product__details">
            <Accordion
              items={[
                { title: 'Description', content: product.description || product.short_description },
                { title: "Mode d'emploi", content: product.usage },
                { title: 'Composition', content: product.composition },
                { title: 'Précautions & conservation', content: product.precautions },
              ].filter((i) => i.content)}
            />
          </Reveal>
        </>
      )}

      {related && related.length > 0 && (
        <section aria-labelledby="rel-title" className="product__related">
          <h2 id="rel-title" className="h2" style={{ marginBottom: 28 }}>
            Vous aimerez aussi
          </h2>
          <Reveal stagger={0.08} className="product-grid">
            {related.map((p) => (
              <RevealItem key={p.id}>
                <ProductCard product={p} compact />
              </RevealItem>
            ))}
          </Reveal>
        </section>
      )}
    </div>
  )
}
