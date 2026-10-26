import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, BagIcon, LockIcon, Sparkle, WhatsAppIcon } from '../components/Icons'
import { AnimatedNumber } from '../components/motion/AnimatedNumber'
import { Magnetic } from '../components/motion/Magnetic'
import { ProductVisual } from '../components/product/ProductVisual'
import { QuantityStepper } from '../components/ui/QuantityStepper'
import { whatsappLink } from '../config'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useQuote } from '../hooks/useQuote'
import { api, ApiError } from '../lib/api'
import { formatPrice } from '../lib/format'
import type { Quote } from '../lib/types'

function EmptyCart() {
  return (
    <motion.div className="empty empty--large" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <motion.span
        animate={{ y: [0, -8, 0], rotate: [0, -4, 4, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ color: 'var(--or-profond)' }}
      >
        <BagIcon size={48} strokeWidth={1.2} />
      </motion.span>
      <h2 className="h3" style={{ fontSize: 30 }}>
        Votre panier est vide
      </h2>
      <p className="muted">Découvrez nos gammes beauté, cosmétiques, lessive et nettoyage.</p>
      <Magnetic>
        <Link to="/boutique" className="btn btn--primary">
          Découvrir nos produits
        </Link>
      </Magnetic>
    </motion.div>
  )
}

function PromoForm() {
  const { lines, promoCode, setPromoCode } = useCart()
  const [code, setCode] = useState(promoCode ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function apply(event: FormEvent) {
    event.preventDefault()
    const value = code.trim().toUpperCase()
    if (!value) return
    setPending(true)
    setError(null)
    try {
      // Validation côté serveur avant d'enregistrer le code.
      await api.post<Quote>('/cart/quote/', {
        items: lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity })),
        promo_code: value,
      })
      setPromoCode(value)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Code impossible à vérifier.')
    } finally {
      setPending(false)
    }
  }

  if (promoCode) {
    return (
      <motion.div className="promo-applied" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <Sparkle size={14} />
        <span>
          Code <strong>{promoCode}</strong> appliqué
        </span>
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setPromoCode(null)
            setCode('')
          }}
        >
          Retirer
        </button>
      </motion.div>
    )
  }

  return (
    <form className="field" onSubmit={apply} noValidate>
      <label htmlFor="promo">Code promo</label>
      <motion.div className="promo-form" animate={error ? { x: [0, -8, 8, -5, 5, 0] } : {}} transition={{ duration: 0.4 }}>
        <input
          id="promo"
          className="input"
          type="text"
          autoComplete="off"
          placeholder="Saisissez votre code"
          value={code}
          maxLength={40}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'promo-err' : undefined}
          onChange={(e) => setCode(e.target.value)}
        />
        <button type="submit" className="btn btn--outline btn--sm" disabled={pending}>
          Appliquer
        </button>
      </motion.div>
      {error && (
        <span id="promo-err" className="field__error" role="alert">
          {error}
        </span>
      )}
    </form>
  )
}

export default function CartPage() {
  const { lines, count, subtotal, setQuantity, remove, promoCode, syncWithQuote } = useCart()
  const { quote, error } = useQuote(lines, null, promoCode)
  const { status } = useAuth()
  const needsAccount = status === 'anonymous'
  useDocumentTitle('Panier')

  // Rafraîchit les libellés/prix locaux avec les valeurs du serveur.
  useEffect(() => {
    if (quote) syncWithQuote(quote.lines)
  }, [quote, syncWithQuote])

  const available = new Map(quote?.lines.map((l) => [l.variant_id, l.available]))
  const hasStockIssue = lines.some((l) => (available.get(l.variantId) ?? Infinity) < l.quantity)

  return (
    <div className="container cart">
      <h1 className="h1 cart__title">
        Votre panier{' '}
        <span className="cart__count">
          ({count} article{count > 1 ? 's' : ''})
        </span>
      </h1>

      {lines.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="cart__layout">
          <div className="cart__lines">
            <AnimatePresence initial={false}>
              {lines.map((line) => {
                const stock = available.get(line.variantId)
                return (
                  <motion.div
                    key={line.variantId}
                    layout
                    className="cart-line"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 80, height: 0, paddingTop: 0, paddingBottom: 0, transition: { duration: 0.35 } }}
                  >
                    <Link to={`/produit/${line.slug}`} className="cart-line__media" tabIndex={-1} aria-hidden="true">
                      <ProductVisual category={line.category} label="" />
                    </Link>
                    <div className="cart-line__info">
                      <Link to={`/produit/${line.slug}`} className="cart-line__name">
                        {line.name}
                      </Link>
                      <span className="muted" style={{ fontSize: 14 }}>
                        {line.variantLabel} · {formatPrice(line.unitPrice)} l’unité
                      </span>
                      {stock !== undefined && stock < line.quantity ? (
                        <span className="status status--out">
                          {stock === 0 ? 'Épuisé' : `Plus que ${stock} disponible${stock > 1 ? 's' : ''}`}
                        </span>
                      ) : (
                        <span className="status status--ok">En stock</span>
                      )}
                    </div>
                    <QuantityStepper
                      size="sm"
                      value={line.quantity}
                      max={Math.max(1, Math.min(50, stock ?? 50))}
                      onChange={(q) => setQuantity(line.variantId, q)}
                    />
                    <div className="cart-line__total">
                      <span className="price">
                        <AnimatedNumber value={line.unitPrice * line.quantity} />
                      </span>
                      <button type="button" className="link-btn" onClick={() => remove(line.variantId)}>
                        Retirer
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
            <Link to="/boutique" className="cart__continue">
              <ArrowLeft size={16} /> Continuer mes achats
            </Link>
          </div>

          <motion.aside
            aria-labelledby="sum-title"
            className="summary"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <h2 id="sum-title" className="h3 summary__title">
              Récapitulatif
            </h2>
            <dl className="summary__rows">
              <div>
                <dt>Sous-total</dt>
                <dd className="price">
                  <AnimatedNumber value={quote?.subtotal ?? subtotal} />
                </dd>
              </div>
              <AnimatePresence>
                {quote && quote.discount > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <dt>Remise {quote.promo_code}</dt>
                    <dd className="price summary__discount">
                      −<AnimatedNumber value={quote.discount} />
                    </dd>
                  </motion.div>
                )}
              </AnimatePresence>
              <div>
                <dt>Livraison</dt>
                <dd className="muted">Calculée à l’étape suivante</dd>
              </div>
            </dl>
            <PromoForm />
            <hr className="summary__sep" />
            <div className="summary__total">
              <span>Total</span>
              <span className="price">
                <AnimatedNumber value={quote ? quote.subtotal - quote.discount : subtotal} />
              </span>
            </div>
            {quote && quote.loyalty_points > 0 && (
              <div className="summary__loyalty">
                <Sparkle size={16} />
                <span>
                  Cette commande vous rapporte <strong>{quote.loyalty_points} points</strong> fidélité.
                </span>
              </div>
            )}
            {error && !promoCode && <p className="alert alert--warn">{error}</p>}
            {hasStockIssue && (
              <p className="alert alert--warn">Ajustez les quantités signalées avant de passer commande.</p>
            )}
            {needsAccount && (
              <p className="summary__account muted">Un compte client est nécessaire pour commander.</p>
            )}
            <Link
              to={needsAccount ? '/compte?next=/commande' : '/commande'}
              className="btn btn--primary btn--block"
              aria-disabled={hasStockIssue}
              onClick={(e) => hasStockIssue && e.preventDefault()}
            >
              {needsAccount ? 'Se connecter pour commander' : 'Passer la commande'}
            </Link>
            <a href={whatsappLink('Bonjour, je souhaite finaliser ma commande avec un conseiller.')} className="btn btn--whatsapp-outline btn--block btn--sm" rel="noopener noreferrer">
              <WhatsAppIcon size={18} strokeWidth={1.6} />
              Finaliser avec un conseiller WhatsApp
            </a>
            <p className="summary__secure">
              <LockIcon size={16} strokeWidth={1.6} /> Paiement sécurisé · Wave · Orange Money
            </p>
          </motion.aside>
        </div>
      )}
    </div>
  )
}
