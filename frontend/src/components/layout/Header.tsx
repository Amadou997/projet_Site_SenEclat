import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { useEffect, useId, useState, type FormEvent } from 'react'
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { CATEGORIES } from '../../config'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import { useFx } from '../../context/FxContext'
import { useAsync } from '../../hooks/useAsync'
import { api } from '../../lib/api'
import type { StoreConfig } from '../../lib/types'
import { BagIcon, CloseIcon, MenuIcon, SearchIcon, Sparkle, UserIcon } from '../Icons'
import { Logo } from './Logo'

const DEFAULT_ANNOUNCEMENTS = ['Livraison à Dakar', 'Retrait en boutique', 'Conseil sur WhatsApp', 'Paiement Wave & Orange Money']

function AnnouncementBar() {
  // Annonces modifiables depuis l'administration ; la liste par défaut s'affiche pendant le chargement.
  const { data: config } = useAsync(() => api.get<StoreConfig>('/store/config/'), [])
  const announcements = config ? config.announcements : DEFAULT_ANNOUNCEMENTS
  if (announcements.length === 0) return null
  // Bandeau défilant : la liste est dupliquée pour une boucle sans couture.
  const items = [...announcements, ...announcements]
  return (
    <div className="announce" role="note" aria-label={announcements.join(' · ')}>
      <div className="announce__track" aria-hidden="true">
        {items.map((text, i) => (
          <span key={i} className="announce__item">
            {text}
            <Sparkle size={9} />
          </span>
        ))}
      </div>
    </div>
  )
}

function CartLink() {
  const { count, bump } = useCart()
  const { registerCartTarget } = useFx()
  return (
    <NavLink to="/panier" className="header__action" aria-label={`Panier, ${count} article${count > 1 ? 's' : ''}`}>
      <span className="header__cart" ref={registerCartTarget}>
        <motion.span
          key={bump}
          initial={bump ? { rotate: -18, scale: 1.25 } : false}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 12 }}
          style={{ display: 'flex' }}
        >
          <BagIcon />
        </motion.span>
        <AnimatePresence>
          {count > 0 && (
            <motion.span
              key={count}
              className="header__badge"
              initial={{ scale: 0.2, y: -6 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 600, damping: 14 }}
            >
              {count}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className="hide-sm">Panier</span>
    </NavLink>
  )
}

function SearchForm({ id, onDone }: { id: string; onDone?: () => void }) {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')

  function submit(event: FormEvent) {
    event.preventDefault()
    const query = q.trim()
    navigate(query ? `/boutique?q=${encodeURIComponent(query)}` : '/boutique')
    onDone?.()
  }

  return (
    <form role="search" className="search" onSubmit={submit}>
      <label htmlFor={id} className="sr-only">
        Rechercher un produit
      </label>
      <input
        id={id}
        type="search"
        className="search__input"
        placeholder="Rechercher un produit, un usage…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        maxLength={80}
        autoComplete="off"
      />
      <motion.button type="submit" className="search__btn" aria-label="Lancer la recherche" whileTap={{ scale: 0.88 }}>
        <SearchIcon size={18} strokeWidth={1.8} />
      </motion.button>
    </form>
  )
}

const NAV = [
  { to: '/boutique', label: 'Tous les produits', end: true },
  ...CATEGORIES.map((c) => ({ to: `/boutique?category=${c.slug}`, label: c.name, end: false })),
  { to: '/boutique?promo=true', label: 'Offres', end: false, accent: true },
]

export function Header() {
  const { status, user } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const searchId = useId()
  const { scrollY } = useScroll()

  useMotionValueEvent(scrollY, 'change', (y) => setScrolled(y > 40))
  useEffect(() => setMenuOpen(false), [location.pathname, location.search])
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const current = location.pathname + location.search

  return (
    <>
      <AnnouncementBar />
      <header className={`header ${scrolled ? 'header--scrolled' : ''}`}>
        <div className="container header__top">
          <button
            type="button"
            className="header__burger show-sm"
            aria-label="Ouvrir le menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon size={24} strokeWidth={1.6} />
          </button>
          <Logo />
          <div className="header__search hide-sm">
            <SearchForm id={searchId} />
          </div>
          <nav aria-label="Compte et panier" className="header__actions">
            {user?.is_staff && (
              <NavLink to="/admin" className="header__action hide-sm">
                <span>Administration</span>
              </NavLink>
            )}
            <NavLink to="/compte" className="header__action hide-sm">
              <UserIcon />
              <span>{status === 'authenticated' && user ? user.first_name : 'Mon compte'}</span>
            </NavLink>
            <CartLink />
          </nav>
        </div>
        <div className="container show-sm header__mobile-search">
          <SearchForm id={`${searchId}-m`} />
        </div>
        <nav aria-label="Catégories" className="header__cats hide-sm">
          <div className="container header__cats-inner">
            {NAV.map((item) => {
              const active = item.end ? current === '/boutique' : current === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`header__cat ${item.accent ? 'header__cat--accent' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                  {active && <motion.span layoutId="cat-underline" className="header__cat-line" />}
                </Link>
              )
            })}
            <span className="header__cats-spacer" />
            <Link to="/maison" className="header__cat">
              Notre maison
            </Link>
            <Link to="/maison#contact" className="header__cat">
              Aide &amp; contact
            </Link>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              className="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
            />
            <motion.nav
              id="mobile-menu"
              className="drawer"
              aria-label="Menu principal"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            >
              <div className="drawer__head">
                <Logo compact />
                <button type="button" className="header__burger" aria-label="Fermer le menu" onClick={() => setMenuOpen(false)}>
                  <CloseIcon size={24} />
                </button>
              </div>
              <motion.ul
                role="list"
                className="drawer__list"
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.12 } } }}
              >
                {[...NAV, ...(user?.is_staff ? [{ to: '/admin', label: 'Administration' }] : []), { to: '/compte', label: 'Mon compte' }, { to: '/maison', label: 'Notre maison' }, { to: '/maison#contact', label: 'Aide & contact' }].map(
                  (item) => (
                    <motion.li
                      key={item.to + item.label}
                      variants={{ hidden: { opacity: 0, x: -24 }, show: { opacity: 1, x: 0 } }}
                    >
                      <Link to={item.to} className="drawer__link">
                        {item.label}
                        <Sparkle size={10} />
                      </Link>
                    </motion.li>
                  ),
                )}
              </motion.ul>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
