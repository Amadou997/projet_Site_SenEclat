import { AnimatePresence, motion } from 'motion/react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Logo } from '../../components/layout/Logo'
import { useAuth } from '../../context/AuthContext'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import {
  BoxIcon,
  ChartIcon,
  DashboardIcon,
  MailIcon,
  ReceiptIcon,
  SettingsIcon,
  TagIcon,
  UsersIcon,
  IconBadge,
} from './AdminIcons'
import type { IconProps } from '../../components/Icons'
import type { ReactElement } from 'react'
import { Customers } from './Customers'
import { Orders } from './Orders'
import { Overview } from './Overview'
import { Products } from './Products'
import { Analytics, Messages, Promos, Settings } from './SiteAdmin'

export type AdminSection = 'overview' | 'products' | 'orders' | 'customers' | 'promos' | 'messages' | 'analytics' | 'settings'

const SECTIONS: { id: AdminSection; label: string; title: string; icon: (p: IconProps) => ReactElement }[] = [
  { id: 'overview', label: 'Vue d’ensemble', title: 'Vue d’ensemble', icon: DashboardIcon },
  { id: 'products', label: 'Produits', title: 'Catalogue produits', icon: BoxIcon },
  { id: 'orders', label: 'Commandes', title: 'Commandes', icon: ReceiptIcon },
  { id: 'customers', label: 'Clients', title: 'Clients', icon: UsersIcon },
  { id: 'promos', label: 'Codes promo', title: 'Codes promo', icon: TagIcon },
  { id: 'messages', label: 'Messages', title: 'Messages de contact', icon: MailIcon },
  { id: 'analytics', label: 'Statistiques', title: 'Statistiques d’audience', icon: ChartIcon },
  { id: 'settings', label: 'Paramètres du site', title: 'Paramètres du site', icon: SettingsIcon },
]

export default function AdminPage() {
  const { status, user, logout } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  // La section vit dans l'URL (?s=…) : rechargement et partage de lien conservent la vue.
  const current = SECTIONS.find((s) => s.id === params.get('s')) ?? SECTIONS[0]!
  useDocumentTitle(`Administration — ${current.title}`)

  if (status === 'checking') return <div className="container skeleton" style={{ height: 420, marginTop: 40 }} aria-busy="true" />
  if (status === 'anonymous') return <Navigate to="/compte" replace />
  if (!user?.is_staff) {
    return (
      <div className="container notfound">
        <h1 className="h1">Accès réservé</h1>
        <p className="muted">Cet espace est réservé à l’équipe Sen Éclat.</p>
        <Link to="/" className="btn btn--primary">
          Retour à la boutique
        </Link>
      </div>
    )
  }

  const go = (section: AdminSection) => setParams(section === 'overview' ? {} : { s: section })

  return (
    <div className="admin">
      <header className="admin-header">
        <div className="container admin-header__inner">
          <Logo compact />
          <span className="eyebrow">Administration</span>
          <span className="admin-header__spacer" />
          <Link to="/" className="link-btn">
            Voir la boutique
          </Link>
          <button
            type="button"
            className="link-btn admin-danger"
            onClick={async () => {
              await logout()
              navigate('/')
            }}
          >
            Se déconnecter
          </button>
        </div>
      </header>

      <div className="container dash admin-body">
        <nav aria-label="Administration" className="dash__nav">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`dash__link ${current.id === s.id ? 'dash__link--on' : ''}`}
              aria-current={current.id === s.id ? 'page' : undefined}
              onClick={() => go(s.id)}
            >
              {current.id === s.id && <motion.span layoutId="admin-pill" className="dash__pill" />}
              <span className="dash__label">
                <s.icon size={19} />
                {s.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="dash__main">
          <div className="admin-title">
            <IconBadge icon={current.icon} tone="prune" />
            <h1 className="h1">{current.title}</h1>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="dash__panel"
            >
              {current.id === 'overview' && <Overview go={go} />}
              {current.id === 'products' && <Products />}
              {current.id === 'orders' && <Orders />}
              {current.id === 'customers' && <Customers />}
              {current.id === 'promos' && <Promos />}
              {current.id === 'messages' && <Messages />}
              {current.id === 'analytics' && <Analytics />}
              {current.id === 'settings' && <Settings />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
