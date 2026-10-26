import { motion } from 'motion/react'
import { useMemo } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { Sparkle, WhatsAppIcon } from '../components/Icons'
import { Reveal, RevealItem } from '../components/motion/Reveal'
import { whatsappLink } from '../config'
import { useAsync } from '../hooks/useAsync'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { api } from '../lib/api'
import { formatPhone, formatPrice } from '../lib/format'
import { orderKeyFor } from '../lib/orderAccess'
import type { Order } from '../lib/types'

/** Gerbe d'étoiles dorées qui jaillit autour de la coche de validation. */
function StarBurst() {
  const stars = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * Math.PI * 2
        const distance = 90 + (i % 3) * 40
        return { i, x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, size: 10 + (i % 4) * 5 }
      }),
    [],
  )
  return (
    <span className="burst" aria-hidden="true">
      {stars.map((s) => (
        <motion.span
          key={s.i}
          className="burst__star"
          initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
          animate={{ x: s.x, y: s.y, scale: [0, 1.2, 0], opacity: [1, 1, 0], rotate: 180 }}
          transition={{ duration: 1.3, delay: 0.75 + (s.i % 4) * 0.04, ease: [0.22, 1, 0.36, 1] }}
        >
          <Sparkle size={s.size} />
        </motion.span>
      ))}
    </span>
  )
}

function SuccessMark() {
  return (
    <div className="success-mark">
      <StarBurst />
      <motion.svg width="96" height="96" viewBox="0 0 96 96" aria-hidden="true" initial="hidden" animate="show">
        <motion.circle
          cx="48"
          cy="48"
          r="44"
          fill="#1D1A19"
          stroke="#C9A24A"
          strokeWidth="2"
          variants={{ hidden: { scale: 0 }, show: { scale: 1, transition: { type: 'spring', stiffness: 180, damping: 14 } } }}
          style={{ originX: '50%', originY: '50%' }}
        />
        <motion.path
          d="M30 49 L43 62 L67 36"
          fill="none"
          stroke="#E3BA65"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { delay: 0.35, duration: 0.5, ease: 'easeOut' } } }}
        />
      </motion.svg>
    </div>
  )
}

export default function ConfirmationPage() {
  useDocumentTitle('Commande confirmée')
  const { number = '' } = useParams()
  const location = useLocation()
  const fromState = (location.state as { order?: Order } | null)?.order
  const { data: fetched, error } = useAsync(
    () =>
      fromState
        ? Promise.resolve(fromState)
        : api.get<Order>(`/orders/${encodeURIComponent(number)}/`, {
            headers: orderKeyFor(number) ? { 'X-Order-Key': orderKeyFor(number)! } : {},
          }),
    [number],
  )
  const order = fetched

  if (error) {
    return (
      <div className="container section confirm">
        <h1 className="h2">Commande introuvable</h1>
        <p className="muted">
          Connectez-vous à votre compte pour retrouver vos commandes, ou contactez-nous en indiquant le numéro {number}.
        </p>
        <Link to="/compte" className="btn btn--primary">
          Mon compte
        </Link>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="container section confirm" aria-busy="true">
        <div className="skeleton" style={{ width: 96, height: 96, borderRadius: '50%', margin: '0 auto' }} />
      </div>
    )
  }

  const itemsCount = order.items.reduce((s, i) => s + i.quantity, 0)
  const isDelivery = order.shipping_method === 'delivery_dakar'

  return (
    <div className="container confirm">
      <div className="confirm__hero">
        <SuccessMark />
        <motion.h1
          className="h1"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          Merci {order.first_name}, votre commande est enregistrée
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="lead">
          Commande n° <strong>{order.number}</strong> · Paiement {order.payment_method_label}{' '}
          <strong>{order.payment_status_label.toLowerCase()}</strong>
        </motion.p>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="muted">
          Un récapitulatif vous sera envoyé par <span className="placeholder-note">[SMS / WhatsApp / e-mail — canal à confirmer]</span>.
        </motion.p>
      </div>

      <section aria-labelledby="next-title" className="confirm__card">
        <h2 id="next-title" className="h3">
          Et maintenant ?
        </h2>
        <Reveal as="ol" stagger={0.15} className="timeline" role="list">
          {[
            { t: 'Préparation de votre commande', s: 'Notre équipe vérifie le stock et prépare vos articles.' },
            isDelivery
              ? { t: 'Prise de contact du livreur', s: `Il vous appelle au ${formatPhone(order.phone)} avant de passer.` }
              : { t: 'Commande prête en boutique', s: 'Nous vous prévenons dès que vos articles sont disponibles.' },
            isDelivery
              ? {
                  t: 'Livraison à Dakar',
                  s: `${order.address_line}, ${order.address_zone}${order.address_landmark ? ` · repère : ${order.address_landmark}` : ''}`,
                }
              : { t: 'Retrait en boutique', s: '[Adresse de la boutique] · [horaires]' },
          ].map((step, i) => (
            <RevealItem as="li" key={step.t} className="timeline__step">
              <span className="timeline__num">{i + 1}</span>
              <div>
                <strong>{step.t}</strong>
                <span className="muted">{step.s}</span>
              </div>
            </RevealItem>
          ))}
        </Reveal>
      </section>

      <section aria-labelledby="recap-title" className="confirm__card">
        <h2 id="recap-title" className="h3">
          Récapitulatif
        </h2>
        <ul role="list" className="confirm__items">
          {order.items.map((item) => (
            <li key={`${item.product_slug}-${item.variant_label}`}>
              <span>
                {item.quantity} × {item.product_name} <span className="muted">({item.variant_label})</span>
              </span>
              <span className="price">{formatPrice(item.line_total)}</span>
            </li>
          ))}
        </ul>
        <dl className="summary__rows">
          <div>
            <dt>
              {itemsCount} article{itemsCount > 1 ? 's' : ''}
            </dt>
            <dd className="price">{formatPrice(order.subtotal)}</dd>
          </div>
          {order.discount > 0 && (
            <div>
              <dt>Remise {order.promo_code}</dt>
              <dd className="price summary__discount">−{formatPrice(order.discount)}</dd>
            </div>
          )}
          <div>
            <dt>{order.shipping_method_label}</dt>
            <dd className="price">{order.shipping_fee ? formatPrice(order.shipping_fee) : 'Gratuit'}</dd>
          </div>
        </dl>
        <div className="summary__total">
          <span>{order.payment_status === 'paid' ? 'Total payé' : 'Total à régler'}</span>
          <span className="price">{formatPrice(order.total)}</span>
        </div>
        {order.loyalty_points_earned > 0 && (
          <div className="summary__loyalty">
            <Sparkle size={16} /> <span>+{order.loyalty_points_earned} points fidélité crédités sur votre compte.</span>
          </div>
        )}
      </section>

      <div className="confirm__actions">
        <Link to="/compte" className="btn btn--primary">
          Suivre ma commande
        </Link>
        <Link to="/boutique" className="btn btn--outline">
          Continuer mes achats
        </Link>
        <a href={whatsappLink(`Bonjour, une question sur ma commande ${order.number}.`)} className="btn btn--whatsapp-outline" rel="noopener noreferrer">
          <WhatsAppIcon size={18} strokeWidth={1.6} /> Une question ? WhatsApp
        </a>
      </div>
    </div>
  )
}
