import { useEffect, useState } from 'react'
import type { CartLine } from '../context/CartContext'
import { api, ApiError } from '../lib/api'
import type { Quote, ShippingMethod } from '../lib/types'

/**
 * Demande au serveur le calcul exact du panier (prix en base, remise, livraison).
 * Les appels sont regroupés (250 ms) pour ne pas solliciter l'API à chaque clic sur « + ».
 */
export function useQuote(lines: CartLine[], shippingMethod: ShippingMethod | null, promoCode: string | null) {
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const key = JSON.stringify([lines.map((l) => [l.variantId, l.quantity]), shippingMethod, promoCode])

  useEffect(() => {
    if (lines.length === 0) {
      setQuote(null)
      return
    }
    let cancelled = false
    setLoading(true)
    const id = window.setTimeout(async () => {
      try {
        const result = await api.post<Quote>('/cart/quote/', {
          items: lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity })),
          shipping_method: shippingMethod,
          promo_code: promoCode,
        })
        if (!cancelled) {
          setQuote(result)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Calcul du panier impossible.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { quote, error, loading }
}
