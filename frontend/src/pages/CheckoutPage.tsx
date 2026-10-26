import { AnimatePresence, LayoutGroup, motion, useAnimate } from 'motion/react'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AlertIcon, ArrowLeft, LockIcon } from '../components/Icons'
import { Logo } from '../components/layout/Logo'
import { AnimatedNumber } from '../components/motion/AnimatedNumber'
import { ProductVisual } from '../components/product/ProductVisual'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useAsync } from '../hooks/useAsync'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useQuote } from '../hooks/useQuote'
import { api, ApiError } from '../lib/api'
import { formatPrice } from '../lib/format'
import { rememberOrderKey } from '../lib/orderAccess'
import type { CreatedOrder, PaymentMethod, ShippingMethod, StoreConfig } from '../lib/types'

const SHIPPING: { id: ShippingMethod | 'regions'; title: string; desc: string; disabled?: boolean }[] = [
  { id: 'delivery_dakar', title: 'Livraison à domicile — Dakar', desc: 'Délai : [à confirmer]' },
  { id: 'pickup', title: 'Retrait en boutique', desc: '[Adresse de la boutique] · [horaires]' },
  { id: 'regions', title: 'Autres régions du Sénégal', desc: 'Bientôt disponible — extension progressive', disabled: true },
]

const PAYMENTS: { id: PaymentMethod; title: string; desc: string; note: string; cta: string }[] = [
  {
    id: 'wave',
    title: 'Wave',
    desc: 'Validation sur votre application Wave',
    note: 'Après confirmation, vous recevrez une demande de paiement Wave sur le numéro indiqué.',
    cta: 'Confirmer et payer avec Wave',
  },
  {
    id: 'orange_money',
    title: 'Orange Money',
    desc: 'Validation par code sur votre téléphone',
    note: 'Après confirmation, vous recevrez une demande de paiement Orange Money sur le numéro indiqué.',
    cta: 'Confirmer et payer avec Orange Money',
  },
  {
    id: 'card',
    title: 'Carte bancaire',
    desc: 'Visa / Mastercard [si retenue]',
    note: 'Vous serez redirigé vers la page sécurisée du prestataire de paiement par carte [à définir].',
    cta: 'Confirmer et payer par carte',
  },
  {
    id: 'cash_on_delivery',
    title: 'Paiement à la livraison',
    desc: 'Espèces ou mobile money',
    note: 'Vous réglerez la commande au moment de la livraison ou du retrait.',
    cta: 'Confirmer la commande',
  },
]

const SN_PHONE = /^(7[05678]|33)\d{7}$/

type Errors = Partial<Record<'first_name' | 'last_name' | 'phone' | 'email' | 'address_zone' | 'address_line' | 'accept_terms', string>>

function normalizePhone(value: string) {
  return value.replace(/[\s.\-()]/g, '').replace(/^(\+221|00221)/, '')
}

function validate(form: FormState): Errors {
  const errors: Errors = {}
  if (!form.first_name.trim()) errors.first_name = 'Indiquez votre prénom.'
  if (!form.last_name.trim()) errors.last_name = 'Indiquez votre nom.'
  if (!SN_PHONE.test(normalizePhone(form.phone)))
    errors.phone = 'Numéro incomplet : saisissez 9 chiffres, par exemple 77 123 45 67.'
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Adresse e-mail invalide.'
  if (form.shipping === 'delivery_dakar') {
    if (!form.address_zone) errors.address_zone = 'Choisissez votre commune.'
    if (!form.address_line.trim()) errors.address_line = 'Indiquez votre adresse.'
  }
  if (!form.accept_terms) errors.accept_terms = 'Veuillez accepter les conditions générales de vente.'
  return errors
}

interface FormState {
  first_name: string
  last_name: string
  phone: string
  email: string
  shipping: ShippingMethod
  address_zone: string
  address_line: string
  address_landmark: string
  payment: PaymentMethod
  accept_terms: boolean
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: ReactNode }) {
  return (
    <fieldset className="step">
      <legend className="step__legend">
        <motion.span
          className="step__num"
          animate={{ backgroundColor: done ? '#3F142D' : '#FFFFFF', color: done ? '#FAF6EE' : '#3F142D' }}
          transition={{ duration: 0.3 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={done ? 'done' : 'n'}
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
            >
              {done ? '✓' : n}
            </motion.span>
          </AnimatePresence>
        </motion.span>
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.span
          id={id}
          className="field__error"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          <AlertIcon size={16} style={{ flex: 'none', marginTop: 2 }} />
          {message}
        </motion.span>
      )}
    </AnimatePresence>
  )
}

export default function CheckoutPage() {
  useDocumentTitle('Finaliser ma commande')
  const navigate = useNavigate()
  const { user, status } = useAuth()
  const { lines, promoCode, clear } = useCart()
  const { data: config } = useAsync(() => api.get<StoreConfig>('/store/config/'), [])

  const [form, setForm] = useState<FormState>({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    shipping: 'delivery_dakar',
    address_zone: '',
    address_line: '',
    address_landmark: '',
    payment: 'wave',
    accept_terms: false,
  })
  const [errors, setErrors] = useState<Errors>({})
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [formScope, animateForm] = useAnimate<HTMLFormElement>()
  const shake = () => {
    if (formScope.current) void animateForm(formScope.current, { x: [0, -10, 10, -6, 6, 0] }, { duration: 0.45 })
  }

  // Pré-remplissage avec le profil du client connecté.
  useEffect(() => {
    if (!user) return
    setForm((f) => ({
      ...f,
      first_name: f.first_name || user.first_name,
      last_name: f.last_name || user.last_name,
      phone: f.phone || (user.phone ?? ''),
      email: f.email || (user.email ?? ''),
      address_zone: f.address_zone || user.address_zone,
      address_line: f.address_line || user.address_line,
      address_landmark: f.address_landmark || user.address_landmark,
    }))
  }, [user])

  const { quote } = useQuote(lines, form.shipping, promoCode)

  useEffect(() => {
    if (submitted) setErrors(validate(form))
  }, [form, submitted])

  if (lines.length === 0 && !pending) return <Navigate to="/panier" replace />
  // Commander nécessite un compte : le visiteur revient ici automatiquement après connexion.
  if (status === 'anonymous') return <Navigate to="/compte?next=/commande" replace />
  if (status === 'checking') return <div className="container skeleton" style={{ height: 420, marginTop: 40 }} aria-busy="true" />

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))
  const payment = PAYMENTS.find((p) => p.id === form.payment)!
  const contactDone = Boolean(form.first_name && form.last_name && SN_PHONE.test(normalizePhone(form.phone)))
  const shippingDone = form.shipping === 'pickup' || Boolean(form.address_zone && form.address_line)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    setServerError(null)
    const found = validate(form)
    setErrors(found)
    if (Object.keys(found).length > 0) {
      shake()
      const first = Object.keys(found)[0]
      document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    setPending(true)
    try {
      const order = await api.post<CreatedOrder>('/orders/', {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone,
        email: form.email || null,
        shipping_method: form.shipping,
        address_zone: form.shipping === 'delivery_dakar' ? form.address_zone : '',
        address_line: form.shipping === 'delivery_dakar' ? form.address_line : '',
        address_landmark: form.shipping === 'delivery_dakar' ? form.address_landmark : '',
        payment_method: form.payment,
        promo_code: promoCode,
        accept_terms: form.accept_terms,
        items: lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity })),
      })
      rememberOrderKey(order.number, order.access_key)
      clear()
      navigate(`/commande/confirmation/${order.number}`, { replace: true, state: { order } })
    } catch (err) {
      setPending(false)
      shake()
      if (err instanceof ApiError) {
        const fieldErrors: Errors = {}
        for (const key of ['phone', 'email', 'address_zone', 'address_line'] as const) {
          const message = err.fieldError(key)
          if (message) fieldErrors[key] = message
        }
        setErrors(fieldErrors)
        setServerError(err.message)
      } else {
        setServerError('Connexion impossible. Vérifiez votre réseau puis réessayez.')
      }
    }
  }

  const inputProps = (key: keyof Errors) => ({
    name: key,
    'aria-invalid': errors[key] ? true : undefined,
    'aria-describedby': errors[key] ? `${key}-err` : undefined,
  })

  return (
    <div className="checkout">
      <header className="checkout__header">
        <div className="container checkout__header-inner">
          <Logo />
          <span className="checkout__secure">
            <LockIcon size={18} strokeWidth={1.6} /> Commande sécurisée
          </span>
        </div>
      </header>

      <div className="container checkout__body">
        <Link to="/panier" className="cart__continue">
          <ArrowLeft size={16} /> Retour au panier
        </Link>
        <h1 className="h1">Finaliser ma commande</h1>
        <p className="muted">Une seule page, trois étapes. Vos coordonnées sont pré-remplies depuis votre compte.</p>

        <div className="checkout__layout">
          <form ref={formScope} className="checkout__form" onSubmit={submit} noValidate>
            <Step n={1} title="Vos coordonnées" done={contactDone}>
              <div className="grid-2">
                <div className="field">
                  <label className="field__label">
                  Prénom
                  <input className="input" autoComplete="given-name" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} maxLength={80} {...inputProps('first_name')} />
                  </label>
                  <FieldError id="first_name-err" message={errors.first_name} />
                </div>
                <div className="field">
                  <label className="field__label">
                  Nom
                  <input className="input" autoComplete="family-name" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} maxLength={80} {...inputProps('last_name')} />
                  </label>
                  <FieldError id="last_name-err" message={errors.last_name} />
                </div>
                <div className="field grid-2__full">
                  <label htmlFor="tel">Téléphone (pour la livraison et le paiement mobile)</label>
                  <div className="phone-input">
                    <span className="phone-input__prefix">+221</span>
                    <input id="tel" className="input" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="77 123 45 67" value={form.phone} onChange={(e) => set('phone', e.target.value)} maxLength={20} {...inputProps('phone')} />
                  </div>
                  <FieldError id="phone-err" message={errors.phone} />
                </div>
                <div className="field grid-2__full">
                  <label className="field__label">
                  <span>
                    E-mail <span className="field__hint">(facultatif, pour recevoir la facture)</span>
                  </span>
                  <input className="input" type="email" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} maxLength={254} {...inputProps('email')} />
                  </label>
                  <FieldError id="email-err" message={errors.email} />
                </div>
              </div>
            </Step>

            <Step n={2} title="Mode de réception" done={shippingDone}>
              <LayoutGroup id="ship">
                <div className="options">
                  {SHIPPING.map((s) => {
                    const on = s.id === form.shipping
                    const price =
                      s.id === 'delivery_dakar' ? (config ? formatPrice(config.delivery_fee_dakar) : '…') : s.id === 'pickup' ? 'Gratuit' : '—'
                    return (
                      <label key={s.id} className={`option ${on ? 'option--on' : ''} ${s.disabled ? 'option--disabled' : ''}`}>
                        {on && <motion.span layoutId="ship-ring" className="option__ring" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                        <input
                          type="radio"
                          name="shipping"
                          checked={on}
                          disabled={s.disabled}
                          onChange={() => !s.disabled && set('shipping', s.id as ShippingMethod)}
                        />
                        <span className="option__text">
                          <span className="option__title">{s.title}</span>
                          <span className="option__desc">{s.desc}</span>
                        </span>
                        <span className="option__price">{price}</span>
                      </label>
                    )
                  })}
                </div>
              </LayoutGroup>

              <AnimatePresence initial={false}>
                {form.shipping === 'delivery_dakar' && (
                  <motion.div
                    className="address"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="address__inner">
                      <div className="field">
                        <label className="field__label">
                        Commune / quartier
                        <select className="select" value={form.address_zone} onChange={(e) => set('address_zone', e.target.value)} {...inputProps('address_zone')}>
                          <option value="">Choisir…</option>
                          {config?.delivery_zones.map((zone) => (
                            <option key={zone} value={zone}>
                              {zone}
                            </option>
                          ))}
                        </select>
                        </label>
                        <FieldError id="address_zone-err" message={errors.address_zone} />
                      </div>
                      <div className="field">
                        <label className="field__label">
                        Adresse
                        <input className="input" autoComplete="street-address" placeholder="Rue, villa, immeuble…" value={form.address_line} onChange={(e) => set('address_line', e.target.value)} maxLength={200} {...inputProps('address_line')} />
                        </label>
                        <FieldError id="address_line-err" message={errors.address_line} />
                      </div>
                      <label className="field">
                        <span>
                          Point de repère <span className="field__hint">(aide le livreur à vous trouver)</span>
                        </span>
                        <input className="input" placeholder="Ex. : près de la pharmacie, en face de la mosquée…" value={form.address_landmark} onChange={(e) => set('address_landmark', e.target.value)} maxLength={200} />
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Step>

            <Step n={3} title="Paiement" done={false}>
              <LayoutGroup id="pay">
                <div className="options options--grid">
                  {PAYMENTS.map((p) => {
                    const on = p.id === form.payment
                    return (
                      <label key={p.id} className={`option ${on ? 'option--on' : ''}`}>
                        {on && <motion.span layoutId="pay-ring" className="option__ring" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                        <input type="radio" name="payment" checked={on} onChange={() => set('payment', p.id)} />
                        <span className="option__text">
                          <span className="option__title">{p.title}</span>
                          <span className="option__desc">{p.desc}</span>
                        </span>
                      </label>
                    )
                  })}
                </div>
              </LayoutGroup>
              <AnimatePresence mode="wait">
                <motion.p
                  key={payment.id}
                  className="checkout__note"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  {payment.note}
                </motion.p>
              </AnimatePresence>
            </Step>

            <div className="field">
              <label className="check">
                <input type="checkbox" name="accept_terms" checked={form.accept_terms} onChange={(e) => set('accept_terms', e.target.checked)} />
                <span>
                  J’accepte les <Link to="/maison#legal">conditions générales de vente</Link> et la{' '}
                  <Link to="/maison#legal">politique de confidentialité</Link>.
                </span>
              </label>
              <FieldError id="accept_terms-err" message={errors.accept_terms} />
            </div>

            {serverError && (
              <div className="alert alert--error" role="alert">
                <strong>Commande non enregistrée.</strong> {serverError} Aucun montant n’a été débité.
              </div>
            )}

            <button type="submit" className="btn btn--primary btn--block show-sm" disabled={pending}>
              {pending ? 'Envoi en cours…' : payment.cta}
            </button>
          </form>

          <aside aria-labelledby="order-sum" className="summary checkout__summary">
            <h2 id="order-sum" className="h3 summary__title">
              Votre commande
            </h2>
            <ul role="list" className="mini-lines">
              {lines.map((l) => (
                <li key={l.variantId} className="mini-line">
                  <span className="mini-line__media">
                    <ProductVisual category={l.category} label="" />
                    <span className="mini-line__qty">{l.quantity}</span>
                  </span>
                  <span className="mini-line__info">
                    <strong>{l.name}</strong>
                    <span className="muted">{l.variantLabel}</span>
                  </span>
                  <span className="price">{formatPrice(l.unitPrice * l.quantity)}</span>
                </li>
              ))}
            </ul>
            <hr className="summary__sep" />
            <dl className="summary__rows">
              <div>
                <dt>Sous-total</dt>
                <dd className="price">{quote ? <AnimatedNumber value={quote.subtotal} /> : '…'}</dd>
              </div>
              {quote && quote.discount > 0 && (
                <div>
                  <dt>Remise {quote.promo_code}</dt>
                  <dd className="price summary__discount">
                    −<AnimatedNumber value={quote.discount} />
                  </dd>
                </div>
              )}
              <div>
                <dt>{form.shipping === 'delivery_dakar' ? 'Livraison Dakar' : 'Retrait en boutique'}</dt>
                <dd className="price">{quote ? quote.shipping_fee ? <AnimatedNumber value={quote.shipping_fee} /> : 'Gratuit' : '…'}</dd>
              </div>
            </dl>
            <hr className="summary__sep" />
            <div className="summary__total">
              <span>Total</span>
              <span className="price">{quote ? <AnimatedNumber value={quote.total} /> : '…'}</span>
            </div>
            <button type="button" className="btn btn--primary btn--block hide-sm" disabled={pending} onClick={submit}>
              <AnimatePresence mode="wait">
                <motion.span key={pending ? 'p' : payment.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                  {pending ? 'Envoi en cours…' : payment.cta}
                </motion.span>
              </AnimatePresence>
            </button>
            <p className="summary__fine">
              Les données de paiement sont traitées par le prestataire choisi ; Sen Éclat ne les conserve pas.
            </p>
          </aside>
        </div>
      </div>
    </div>
  )
}
