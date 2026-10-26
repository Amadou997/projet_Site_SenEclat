import { motion } from 'motion/react'
import { Fragment } from 'react'
import { EASE_OUT } from './Reveal'

/**
 * Titre révélé mot par mot : chaque mot monte depuis un masque, comme une gravure
 * qui se dévoile. Le texte complet reste lisible par les lecteurs d'écran.
 * `wordClassName` s'applique à chaque mot animé (ex. le dégradé doré, qui doit être
 * posé sur l'élément transformé lui-même pour rester visible).
 */
export function SplitText({
  text,
  className,
  wordClassName = '',
  delay = 0,
  stagger = 0.06,
}: {
  text: string
  className?: string
  wordClassName?: string
  delay?: number
  stagger?: number
}) {
  const words = text.split(' ')
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => (
          <Fragment key={`${word}-${i}`}>
            <span className="split-word">
              <motion.span
                className={`split-word__inner ${wordClassName}`}
                initial={{ y: '110%', rotate: 4 }}
                animate={{ y: '0%', rotate: 0 }}
                transition={{ duration: 0.9, ease: EASE_OUT, delay: delay + i * stagger }}
              >
                {word}
              </motion.span>
            </span>
            {/* L'espace reste hors du bloc masqué, sinon il serait absorbé. */}
            {i < words.length - 1 && ' '}
          </Fragment>
        ))}
      </span>
    </span>
  )
}
