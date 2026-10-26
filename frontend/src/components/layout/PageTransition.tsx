import { motion } from 'motion/react'
import type { ReactNode } from 'react'

/**
 * Transition entre les pages : un voile prune traversé d'un fil d'or balaie l'écran,
 * puis le contenu monte en fondu.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <>
      <motion.div
        className="page-wipe"
        aria-hidden="true"
        initial={{ scaleY: 1, originY: 0 }}
        animate={{ scaleY: 0, transition: { duration: 0.55, ease: [0.76, 0, 0.24, 1], delay: 0.05 } }}
        exit={{ scaleY: 1, originY: 1, transition: { duration: 0.4, ease: [0.76, 0, 0.24, 1] } }}
      >
        <span className="page-wipe__line" />
      </motion.div>
      <motion.main
        id="contenu"
        className="page"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.25 } }}
        exit={{ opacity: 0, transition: { duration: 0.2 } }}
      >
        {children}
      </motion.main>
    </>
  )
}
