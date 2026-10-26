import { animate, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'
import { formatPrice } from '../../lib/format'

function formatValue(n: number, price: boolean) {
  return price ? formatPrice(Math.round(n)) : Math.round(n).toLocaleString('fr-FR')
}

/** Montant qui « roule » vers sa nouvelle valeur (totaux du panier, points fidélité…). */
export function AnimatedNumber({ value, price = true }: { value: number; price?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null)
  const previous = useRef(value)
  const reduce = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const from = previous.current
    previous.current = value
    if (reduce || from === value) {
      node.textContent = formatValue(value, price)
      return
    }
    const controls = animate(from, value, {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => {
        node.textContent = formatValue(latest, price)
      },
    })
    return () => controls.stop()
  }, [value, reduce, price])

  return <span ref={ref}>{formatValue(value, price)}</span>
}
