import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useState } from 'react'
import logotype from '../../assets/brand/logotype.jpg'
import { CATEGORIES } from '../../config'
import { Sparkle } from '../Icons'

const KEY = 'sen-eclat:intro-seen'
const FROM = [
  { x: -140, y: -120, rotate: -35 },
  { x: 140, y: -120, rotate: 35 },
  { x: -140, y: 120, rotate: 35 },
  { x: 140, y: 120, rotate: -35 },
]

function alreadySeen() {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return true
  }
}

/**
 * Ouverture de marque (une fois par session) : les quatre univers du logo convergent
 * pour former le trèfle Sen Éclat, une étoile scintille, puis le rideau se lève.
 */
export function IntroLoader() {
  const reduce = useReducedMotion()
  const [visible, setVisible] = useState(() => !alreadySeen())

  useEffect(() => {
    if (!visible) return
    try {
      sessionStorage.setItem(KEY, '1')
    } catch {
      /* ignoré */
    }
    const id = window.setTimeout(() => setVisible(false), reduce ? 300 : 2300)
    return () => window.clearTimeout(id)
  }, [visible, reduce])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="intro"
          role="presentation"
          onClick={() => setVisible(false)}
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="intro__clover">
            {CATEGORIES.map((c, i) => (
              <motion.img
                key={c.slug}
                src={c.image}
                alt=""
                className="intro__petal"
                initial={reduce ? false : { opacity: 0, scale: 0.4, ...FROM[i] }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 110, damping: 14, delay: 0.15 + i * 0.12 }}
              />
            ))}
            <motion.span
              className="intro__flare"
              initial={{ scale: 0, rotate: -90, opacity: 0 }}
              animate={{ scale: [0, 1.6, 1], rotate: 0, opacity: [0, 1, 0.9] }}
              transition={{ delay: 0.95, duration: 0.7 }}
            >
              <Sparkle size={42} />
            </motion.span>
          </div>
          <motion.img
            src={logotype}
            alt=""
            className="intro__type"
            initial={{ clipPath: 'inset(0 100% 0 0)', opacity: 0 }}
            animate={{ clipPath: 'inset(0 0% 0 0)', opacity: 1 }}
            transition={{ delay: 1.05, duration: 0.8, ease: [0.65, 0, 0.35, 1] }}
          />
          <motion.p
            className="intro__tagline"
            initial={{ opacity: 0, letterSpacing: '0.6em' }}
            animate={{ opacity: 1, letterSpacing: '0.28em' }}
            transition={{ delay: 1.45, duration: 0.8 }}
          >
            Le savoir-faire espagnol au Sénégal
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
