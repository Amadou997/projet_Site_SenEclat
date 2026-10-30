import { AnimatePresence, motion } from 'motion/react'
import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { AlertIcon, Sparkle } from '../components/Icons'
import { AnimatedNumber } from '../components/motion/AnimatedNumber'
import { SparkleField } from '../components/motion/SparkleField'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { api, ApiError } from '../lib/api'
import { formatDate, formatPhone, formatPrice, ORDER_STATUS_CLASS } from '../lib/format'
import type { Order, StoreConfig } from '../lib/types'

/* ------------------------------------------------------------------ */
/* Connexion / inscription                                             */
/* ------------------------------------------------------------------ */

/** Page où revenir après connexion (`/compte?next=/commande`). Chemins internes uniquement : pas de redirection ouverte. */
function useNextPath(): string | null {
  const [params] = useSearchParams()
  const next = params.get('next')
  return next && next.startsWith('/') && !next.startsWith('//') ? next : null
}

function AuthPanel() {
  const { login, register } = useAuth()
  const fromCheckout = useNextPath() === '/commande'
  const [tab, setTab] = useState<'login' | 'signup'>(fromCheckout ? 'signup' : 'login')
  const [form, setForm] = useState({ first_name: '', last_name: '', identifier: '', password: '', confirm: '' })
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const isSignup = tab === 'signup'

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (isSignup && form.password !== form.confirm) {
      setError('Les deux mots de passe ne sont pas identiques.')
      return
    }
    setPending(true)
    try {
      if (isSignup) {
        const id = form.identifier.trim()
        await register({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          password: form.password,
          ...(id.includes('@') ? { email: id } : { phone: id }),
        })
      } else {
        await login(form.identifier.trim(), form.password)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Connexion impossible. Vérifiez votre réseau.')
    } finally {
      setPending(false)
    }
  }

  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <section aria-labelledby="auth-title" className="auth">
      <div className="auth__intro">
        <SparkleField count={10} seed={5} />
        <span className="eyebrow eyebrow--light">Espace client</span>
        <h1 id="auth-title" className="h1">
          {fromCheckout ? 'Un compte est nécessaire pour commander' : 'Retrouvez vos commandes et vos avantages'}
        </h1>
        {fromCheckout && (
          <p className="auth__lead">
            Créez votre compte en quelques secondes ou connectez-vous : votre panier est conservé et vous reprendrez votre
            commande juste après.
          </p>
        )}
        <ul role="list" className="auth__perks">
          {[
            'Suivi de vos commandes en temps réel',
            'Adresses et points de repère enregistrés',
            'Programme de fidélité : 1 point par tranche de 1 000 FCFA',
          ].map((perk, i) => (
            <motion.li key={perk} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }}>
              <Sparkle size={14} />
              {perk}
            </motion.li>
          ))}
        </ul>
      </div>

      <div className="auth__card">
        <div role="tablist" aria-label="Connexion ou inscription" className="tabs">
          {(['login', 'signup'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className="tabs__tab"
              onClick={() => {
                setTab(t)
                setError(null)
              }}
            >
              {t === 'login' ? 'Se connecter' : 'Créer un compte'}
              {tab === t && <motion.span layoutId="auth-tab" className="tabs__line" />}
            </button>
          ))}
        </div>

        <form className="auth__form" onSubmit={submit} noValidate={false}>
          <AnimatePresence initial={false}>
            {isSignup && (
              <motion.div
                className="grid-2 auth__names"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <label className="field">
                  Prénom
                  <input className="input" autoComplete="given-name" placeholder="Ex. : Awa" required maxLength={80} value={form.first_name} onChange={set('first_name')} />
                </label>
                <label className="field">
                  Nom
                  <input className="input" autoComplete="family-name" placeholder="Ex. : Diop" required maxLength={80} value={form.last_name} onChange={set('last_name')} />
                </label>
              </motion.div>
            )}
          </AnimatePresence>
          <label className="field">
            Téléphone ou e-mail
            <input className="input" autoComplete="username" placeholder="Ex. : 77 123 45 67 ou awa@exemple.com" required maxLength={254} value={form.identifier} onChange={set('identifier')} />
          </label>
          <label className="field">
            <span>
              Mot de passe {isSignup && <span className="field__hint">(8 caractères minimum, pas uniquement des chiffres)</span>}
            </span>
            <input
              className="input"
              type="password"
              placeholder={isSignup ? 'Choisissez un mot de passe' : 'Votre mot de passe'}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              required
              minLength={isSignup ? 8 : 1}
              maxLength={128}
              value={form.password}
              onChange={set('password')}
            />
          </label>
          <AnimatePresence initial={false}>
            {isSignup && (
              <motion.div
                className="auth__names"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <label className="field">
                  Confirmer le mot de passe
                  <input
                    className="input"
                    type="password"
                    placeholder="Saisissez-le une seconde fois"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={128}
                    value={form.confirm}
                    onChange={set('confirm')}
                  />
                </label>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {error && (
              <motion.p
                role="alert"
                className="alert alert--error"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: [10, -6, 4, 0] }}
                exit={{ opacity: 0 }}
              >
                <AlertIcon size={16} style={{ display: 'inline', verticalAlign: '-3px', marginRight: 6 }} />
                {error}
              </motion.p>
            )}
          </AnimatePresence>
          <button type="submit" className="btn btn--primary btn--block" disabled={pending}>
            {pending ? 'Un instant…' : isSignup ? 'Créer mon compte' : 'Se connecter'}
          </button>
          {!isSignup && (
            <Link to="/maison#contact" className="auth__forgot">
              Mot de passe oublié ?
            </Link>
          )}
        </form>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Tableau de bord                                                     */
/* ------------------------------------------------------------------ */

type Section = 'dashboard' | 'orders' | 'addresses' | 'profile'
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'dashboard', label: 'Tableau de bord' },
  { id: 'orders', label: 'Mes commandes' },
  { id: 'addresses', label: 'Mes adresses' },
  { id: 'profile', label: 'Mon profil' },
]

function OrdersTable({ orders }: { orders: Order[] }) {
  const [open, setOpen] = useState<string | null>(null)
  if (orders.length === 0) {
    return (
      <div className="empty">
        <strong>Aucune commande pour le moment</strong>
        <Link to="/boutique" className="btn btn--outline btn--sm">
          Découvrir nos produits
        </Link>
      </div>
    )
  }
  return (
    <div className="table-wrap">
      <table className="table">
        <caption className="table__caption">Historique des commandes</caption>
        <thead>
          <tr>
            <th scope="col">Commande</th>
            <th scope="col">Date</th>
            <th scope="col">Statut</th>
            <th scope="col">Total</th>
            <th scope="col">
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o, i) => (
            <motion.tr
              key={o.number}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <td className="table__strong">{o.number}</td>
              <td>{formatDate(o.created_at)}</td>
              <td>
                <span className={`status ${ORDER_STATUS_CLASS[o.status]}`}>{o.status_label}</span>
              </td>
              <td className="price">{formatPrice(o.total)}</td>
              <td>
                <button
                  type="button"
                  className="link-btn"
                  aria-expanded={open === o.number}
                  onClick={() => setOpen(open === o.number ? null : o.number)}
                >
                  Détails
                </button>
                <AnimatePresence>
                  {open === o.number && (
                    <motion.ul
                      role="list"
                      className="table__details"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {o.items.map((item) => (
                        <li key={item.product_slug + item.variant_label}>
                          {item.quantity} × {item.product_name} ({item.variant_label})
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AddressForm() {
  const { user, updateProfile } = useAuth()
  const { data: config } = useAsync(() => api.get<StoreConfig>('/store/config/'), [])
  const [form, setForm] = useState({
    address_zone: user?.address_zone ?? '',
    address_line: user?.address_line ?? '',
    address_landmark: user?.address_landmark ?? '',
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await updateProfile(form)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Enregistrement impossible.')
    }
  }

  return (
    <form className="stack" style={{ gap: 16, maxWidth: 560 }} onSubmit={save}>
      <label className="field">
        Commune / quartier
        <select className="select" value={form.address_zone} onChange={(e) => setForm({ ...form, address_zone: e.target.value })}>
          <option value="">Choisir…</option>
          {config?.delivery_zones.map((z) => (
            <option key={z}>{z}</option>
          ))}
        </select>
      </label>
      <label className="field">
        Adresse
        <input className="input" maxLength={200} value={form.address_line} onChange={(e) => setForm({ ...form, address_line: e.target.value })} />
      </label>
      <label className="field">
        Point de repère
        <input className="input" maxLength={200} value={form.address_landmark} onChange={(e) => setForm({ ...form, address_landmark: e.target.value })} />
      </label>
      <div>
        <button type="submit" className="btn btn--primary">
          Enregistrer l’adresse
        </button>
      </div>
      <AnimatePresence>
        {saved && (
          <motion.p role="status" className="alert alert--success" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            Adresse enregistrée.
          </motion.p>
        )}
      </AnimatePresence>
      {error && <p className="alert alert--error">{error}</p>}
    </form>
  )
}

function ProfileForm() {
  const { user, updateProfile } = useAuth()
  const [form, setForm] = useState({ first_name: user?.first_name ?? '', last_name: user?.last_name ?? '' })
  const [saved, setSaved] = useState(false)

  async function save(event: FormEvent) {
    event.preventDefault()
    await updateProfile(form)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 3000)
  }

  return (
    <form className="stack" style={{ gap: 16, maxWidth: 560 }} onSubmit={save}>
      <div className="grid-2">
        <label className="field">
          Prénom
          <input className="input" required maxLength={80} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        </label>
        <label className="field">
          Nom
          <input className="input" required maxLength={80} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        </label>
      </div>
      <dl className="profile-facts">
        <dt>E-mail</dt>
        <dd>{user?.email ?? '—'}</dd>
        <dt>Téléphone</dt>
        <dd>{user?.phone ? formatPhone(user.phone) : '—'}</dd>
      </dl>
      <div>
        <button type="submit" className="btn btn--primary">
          Enregistrer
        </button>
      </div>
      <AnimatePresence>
        {saved && (
          <motion.p role="status" className="alert alert--success" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            Profil mis à jour.
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  )
}

function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>('dashboard')
  const { data: orders, loading } = useAsync(() => api.get<Order[]>('/orders/'), [user?.id])
  if (!user) return null

  const current = orders?.find((o) => o.status === 'preparing' || o.status === 'shipping')

  return (
    <section aria-labelledby="dash-title" className="dash">
      <nav aria-label="Mon compte" className="dash__nav">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`dash__link ${section === s.id ? 'dash__link--on' : ''}`}
            aria-current={section === s.id ? 'page' : undefined}
            onClick={() => setSection(s.id)}
          >
            {section === s.id && <motion.span layoutId="dash-pill" className="dash__pill" />}
            <span className="dash__label">{s.label}</span>
          </button>
        ))}
        {user.is_staff && (
          <Link to="/admin" className="dash__link dash__admin">
            <span className="dash__label">Administration du site</span>
          </Link>
        )}
        <button
          type="button"
          className="dash__link dash__logout"
          onClick={async () => {
            await logout()
            navigate('/')
          }}
        >
          Se déconnecter
        </button>
      </nav>

      <div className="dash__main">
        <h1 id="dash-title" className="h1">
          Bonjour {user.first_name}
        </h1>
        <AnimatePresence mode="wait">
          <motion.div
            key={section}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="dash__panel"
          >
            {section === 'dashboard' && (
              <>
                <div className="dash__cards">
                  <motion.div className="loyalty" whileHover={{ y: -4 }}>
                    <SparkleField count={8} seed={2} />
                    <span className="eyebrow eyebrow--light">Fidélité Sen Éclat</span>
                    <span className="loyalty__points">
                      <AnimatedNumber value={user.loyalty_points} price={false} /> points
                    </span>
                    <span className="loyalty__rule">
                      1 point par tranche de 1 000 FCFA. <span className="placeholder-note">[Paliers et utilisation à définir]</span>
                    </span>
                  </motion.div>
                  <div className="current-order">
                    <span className="eyebrow">Commande en cours</span>
                    {current ? (
                      <>
                        <span className="current-order__num">N° {current.number}</span>
                        <span className={`status ${ORDER_STATUS_CLASS[current.status]}`}>{current.status_label}</span>
                        <button type="button" className="link-btn" onClick={() => setSection('orders')}>
                          Voir le détail
                        </button>
                      </>
                    ) : (
                      <span className="muted">Aucune commande en cours.</span>
                    )}
                  </div>
                </div>
                {loading ? <div className="skeleton" style={{ height: 160 }} /> : <OrdersTable orders={(orders ?? []).slice(0, 5)} />}
              </>
            )}
            {section === 'orders' && (loading ? <div className="skeleton" style={{ height: 160 }} /> : <OrdersTable orders={orders ?? []} />)}
            {section === 'addresses' && <AddressForm />}
            {section === 'profile' && <ProfileForm />}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  )
}

export default function AccountPage() {
  const { status } = useAuth()
  const next = useNextPath()
  useDocumentTitle(status === 'authenticated' ? 'Mon compte' : 'Connexion')

  if (status === 'authenticated' && next) return <Navigate to={next} replace />

  return (
    <div className="container account">
      {status === 'checking' ? (
        <div className="skeleton" style={{ height: 420 }} aria-busy="true" />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
          >
            {status === 'authenticated' ? <Dashboard /> : <AuthPanel />}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
