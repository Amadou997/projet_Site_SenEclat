import { motion } from 'motion/react'
import { useMemo } from 'react'
import { Sparkle } from '../Icons'

/** Ciel d'étoiles dorées qui scintillent, positionnées de façon déterministe (pas de saut au rendu). */
export function SparkleField({ count = 14, seed = 7, className = '' }: { count?: number; seed?: number; className?: string }) {
  const stars = useMemo(() => {
    let s = seed
    const rand = () => {
      s = (s * 9301 + 49297) % 233280
      return s / 233280
    }
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: rand() * 100,
      top: rand() * 100,
      size: 6 + rand() * 14,
      delay: rand() * 4,
      duration: 2.4 + rand() * 2.6,
    }))
  }, [count, seed])

  return (
    <div className={`sparkle-field ${className}`} aria-hidden="true">
      {stars.map((star) => (
        <motion.span
          key={star.id}
          className="sparkle-field__star"
          style={{ left: `${star.left}%`, top: `${star.top}%` }}
          animate={{ opacity: [0, 1, 0], scale: [0.3, 1, 0.3], rotate: [0, 90] }}
          transition={{ duration: star.duration, delay: star.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Sparkle size={star.size} />
        </motion.span>
      ))}
    </div>
  )
}
