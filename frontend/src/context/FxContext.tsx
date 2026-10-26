/**
 * Effets visuels globaux :
 * - « éclat volant » : une étincelle dorée part du bouton « Ajouter au panier » et
 *   décrit une courbe jusqu'à l'icône du panier ;
 * - notifications (toasts) accessibles, annoncées aux lecteurs d'écran.
 */
import { AnimatePresence, motion } from 'motion/react'
import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Sparkle } from '../components/Icons'

interface Flight {
  id: number
  from: { x: number; y: number }
  to: { x: number; y: number }
}

interface Toast {
  id: number
  message: string
  action?: { label: string; to: string }
}

interface FxContextValue {
  flyToCart: (origin: HTMLElement | null) => void
  toast: (message: string, action?: Toast['action']) => void
  registerCartTarget: (element: HTMLElement | null) => void
}

const FxContext = createContext<FxContextValue | null>(null)
let nextId = 1

export function FxProvider({ children }: { children: ReactNode }) {
  const [flights, setFlights] = useState<Flight[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const cartTargets = useRef(new Set<HTMLElement>())

  const registerCartTarget = useCallback((element: HTMLElement | null) => {
    if (element) cartTargets.current.add(element)
    // Les éléments démontés sont nettoyés lors de la recherche de cible.
  }, [])

  const flyToCart = useCallback((origin: HTMLElement | null) => {
    if (!origin || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const target = [...cartTargets.current].find((el) => {
      if (!el.isConnected) {
        cartTargets.current.delete(el)
        return false
      }
      const rect = el.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    })
    if (!target) return
    const a = origin.getBoundingClientRect()
    const b = target.getBoundingClientRect()
    const flight = {
      id: nextId++,
      from: { x: a.left + a.width / 2, y: a.top + a.height / 2 },
      to: { x: b.left + b.width / 2, y: b.top + b.height / 2 },
    }
    setFlights((f) => [...f, flight])
  }, [])

  const toast = useCallback((message: string, action?: Toast['action']) => {
    const id = nextId++
    setToasts((t) => [...t.slice(-2), { id, message, action }])
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200)
  }, [])

  const value = useMemo(() => ({ flyToCart, toast, registerCartTarget }), [flyToCart, toast, registerCartTarget])

  return (
    <FxContext value={value}>
      {children}

      <div className="fx-layer" aria-hidden="true">
        <AnimatePresence>
          {flights.map((f) => {
            const midX = (f.from.x + f.to.x) / 2
            const midY = Math.min(f.from.y, f.to.y) - 160
            return (
              <motion.span
                key={f.id}
                className="fx-flight"
                initial={{ x: f.from.x, y: f.from.y, scale: 0.4, rotate: 0, opacity: 0 }}
                animate={{
                  x: [f.from.x, midX, f.to.x],
                  y: [f.from.y, midY, f.to.y],
                  scale: [0.6, 1.5, 0.5],
                  rotate: [0, 180, 360],
                  opacity: [0, 1, 1],
                }}
                transition={{ duration: 0.85, ease: [0.45, 0, 0.25, 1], times: [0, 0.45, 1] }}
                onAnimationComplete={() => setFlights((all) => all.filter((x) => x.id !== f.id))}
              >
                <Sparkle size={22} />
              </motion.span>
            )
          })}
        </AnimatePresence>
      </div>

      <div className="toasts" role="status" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              className="toast"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            >
              <motion.span
                className="toast__icon"
                initial={{ rotate: -90, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
              >
                <Sparkle size={18} />
              </motion.span>
              <span className="toast__msg">{t.message}</span>
              {t.action && (
                <Link className="toast__action" to={t.action.to}>
                  {t.action.label}
                </Link>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </FxContext>
  )
}

export function useFx() {
  const context = use(FxContext)
  if (!context) throw new Error('useFx doit être utilisé dans <FxProvider>')
  return context
}
