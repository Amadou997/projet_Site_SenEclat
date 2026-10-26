import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CategorySlug, QuoteLine } from '../lib/types'

/**
 * Le panier est conservé côté navigateur (confort de l'utilisateur). Les prix stockés ne
 * sont qu'un aperçu : le serveur recalcule tout (/cart/quote/, /orders/) à partir de la base.
 */
export interface CartLine {
  variantId: number
  quantity: number
  slug: string
  name: string
  variantLabel: string
  unitPrice: number
  category: CategorySlug
}

interface CartContextValue {
  lines: CartLine[]
  count: number
  subtotal: number
  add: (line: Omit<CartLine, 'quantity'>, quantity?: number) => void
  setQuantity: (variantId: number, quantity: number) => void
  remove: (variantId: number) => void
  clear: () => void
  syncWithQuote: (lines: QuoteLine[]) => void
  /** Incrémenté à chaque ajout : déclenche l'animation du badge panier. */
  bump: number
  promoCode: string | null
  setPromoCode: (code: string | null) => void
}

const STORAGE_KEY = 'sen-eclat:cart:v1'
const MAX_QTY = 50

const CartContext = createContext<CartContextValue | null>(null)

function load(): CartLine[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((l) => Number.isInteger(l?.variantId) && l.quantity > 0) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load)
  const [bump, setBump] = useState(0)
  const [promoCode, setPromoCode] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      /* stockage indisponible (navigation privée) : le panier reste en mémoire */
    }
  }, [lines])

  // Synchronise le panier entre plusieurs onglets.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => event.key === STORAGE_KEY && setLines(load())
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const add = useCallback((line: Omit<CartLine, 'quantity'>, quantity = 1) => {
    setLines((current) => {
      const existing = current.find((l) => l.variantId === line.variantId)
      if (existing) {
        return current.map((l) =>
          l.variantId === line.variantId ? { ...l, ...line, quantity: Math.min(MAX_QTY, l.quantity + quantity) } : l,
        )
      }
      return [...current, { ...line, quantity: Math.min(MAX_QTY, quantity) }]
    })
    setBump((b) => b + 1)
  }, [])

  const setQuantity = useCallback((variantId: number, quantity: number) => {
    setLines((current) =>
      current.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.max(1, Math.min(MAX_QTY, quantity)) } : l)),
    )
  }, [])

  const remove = useCallback((variantId: number) => {
    setLines((current) => current.filter((l) => l.variantId !== variantId))
  }, [])

  const clear = useCallback(() => {
    setLines([])
    setPromoCode(null)
  }, [])

  const syncWithQuote = useCallback((quoteLines: QuoteLine[]) => {
    const byId = new Map(quoteLines.map((q) => [q.variant_id, q]))
    setLines((current) =>
      current.map((l) => {
        const q = byId.get(l.variantId)
        return q
          ? { ...l, unitPrice: q.unit_price, name: q.product_name, variantLabel: q.variant_label, slug: q.product_slug }
          : l
      }),
    )
  }, [])

  const value = useMemo(() => {
    const count = lines.reduce((sum, l) => sum + l.quantity, 0)
    const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0)
    return { lines, count, subtotal, add, setQuantity, remove, clear, syncWithQuote, bump, promoCode, setPromoCode }
  }, [lines, add, setQuantity, remove, clear, syncWithQuote, bump, promoCode])

  return <CartContext value={value}>{children}</CartContext>
}

export function useCart() {
  const context = use(CartContext)
  if (!context) throw new Error('useCart doit être utilisé dans <CartProvider>')
  return context
}
