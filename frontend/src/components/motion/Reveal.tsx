import { motion, type HTMLMotionProps, type Variants } from 'motion/react'
import type { ReactNode } from 'react'

export const EASE_OUT = [0.22, 1, 0.36, 1] as const

const item: Variants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.7, ease: EASE_OUT } },
}

interface RevealProps extends HTMLMotionProps<'div'> {
  children: ReactNode
  delay?: number
  /** Décale l'apparition des enfants directs <RevealItem>. */
  stagger?: number
  as?: 'div' | 'section' | 'ul' | 'ol' | 'li' | 'article'
}

/** Apparition au défilement : montée + fondu + flou qui se dissipe. Une seule fois. */
export function Reveal({ children, delay = 0, stagger, as = 'div', ...rest }: RevealProps) {
  const Component = motion[as] as typeof motion.div
  return (
    <Component
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      variants={
        stagger
          ? { hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }
          : { ...item, show: { ...(item.show as object), transition: { duration: 0.7, ease: EASE_OUT, delay } } }
      }
      {...rest}
    >
      {children}
    </Component>
  )
}

export function RevealItem({ children, as = 'div', ...rest }: RevealProps) {
  const Component = motion[as] as typeof motion.div
  return (
    <Component variants={item} {...rest}>
      {children}
    </Component>
  )
}
