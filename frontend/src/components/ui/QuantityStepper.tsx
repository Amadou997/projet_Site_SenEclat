import { AnimatePresence, motion } from 'motion/react'
import { useRef } from 'react'

/** Sélecteur de quantité : le chiffre « roule » vers le haut ou le bas selon le sens. */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 50,
  size = 'md',
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  size?: 'md' | 'sm'
}) {
  const direction = useRef(1)
  const change = (delta: number) => {
    direction.current = delta
    onChange(Math.min(max, Math.max(min, value + delta)))
  }

  return (
    <div role="group" aria-label="Quantité" className={`qty qty--${size}`}>
      <button type="button" aria-label="Diminuer la quantité" onClick={() => change(-1)} disabled={value <= min}>
        −
      </button>
      <span className="qty__value" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            initial={{ y: direction.current > 0 ? 14 : -14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: direction.current > 0 ? -14 : 14, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </span>
      <button type="button" aria-label="Augmenter la quantité" onClick={() => change(1)} disabled={value >= max}>
        +
      </button>
    </div>
  )
}
