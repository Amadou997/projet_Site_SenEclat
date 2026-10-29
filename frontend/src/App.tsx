import { AnimatePresence, MotionConfig } from 'motion/react'
import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { Analytics } from './components/layout/Analytics'
import { Footer } from './components/layout/Footer'
import { Header } from './components/layout/Header'
import { IntroLoader } from './components/layout/IntroLoader'
import { PageTransition } from './components/layout/PageTransition'
import { ScrollProgress } from './components/layout/ScrollProgress'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { FxProvider } from './context/FxContext'
import HomePage from './pages/HomePage'

// Découpage du code : chaque page secondaire est chargée à la demande.
const ShopPage = lazy(() => import('./pages/ShopPage'))
const ProductPage = lazy(() => import('./pages/ProductPage'))
const CartPage = lazy(() => import('./pages/CartPage'))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'))
const ConfirmationPage = lazy(() => import('./pages/ConfirmationPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const InfoPage = lazy(() => import('./pages/InfoPage'))
const AdminPage = lazy(() => import('./pages/admin/AdminPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname, hash])
  return null
}

function Shell({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  if (bare) return <>{children}</>
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  // La clé ne dépend que du chemin : changer de filtre (?category=…) n'anime pas toute la page.
  // Tunnel de commande et administration : sans en-tête ni pied de page publics.
  const isBare = location.pathname === '/commande' || location.pathname === '/admin'
  const page = (element: ReactNode) => <PageTransition>{element}</PageTransition>

  return (
    <Shell bare={isBare}>
      <Suspense fallback={<div className="page" />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={page(<HomePage />)} />
            <Route path="/boutique" element={page(<ShopPage />)} />
            <Route path="/produit/:slug" element={page(<ProductPage />)} />
            <Route path="/panier" element={page(<CartPage />)} />
            <Route path="/commande" element={page(<CheckoutPage />)} />
            <Route path="/commande/confirmation/:number" element={page(<ConfirmationPage />)} />
            <Route path="/compte" element={page(<AccountPage />)} />
            <Route path="/maison" element={page(<InfoPage />)} />
            <Route path="/admin" element={page(<AdminPage />)} />
            <Route path="*" element={page(<NotFoundPage />)} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </Shell>
  )
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <FxProvider>
              <a href="#contenu" className="skip-link">
                Aller au contenu
              </a>
              <IntroLoader />
              <ScrollProgress />
              <ScrollToTop />
              <Analytics />
              <AnimatedRoutes />
            </FxProvider>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </MotionConfig>
  )
}
