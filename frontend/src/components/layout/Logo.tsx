import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import emblem from '../../assets/brand/emblem.webp'
import logotype from '../../assets/brand/logotype.jpg'

/** En-tête : emblème + logotype extraits du fichier officiel, toujours sur fond Ébène. */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className={`logo ${compact ? 'logo--compact' : ''}`} aria-label="Sen Éclat — accueil">
      <motion.img
        src={emblem}
        alt=""
        className="logo__emblem"
        whileHover={{ rotate: [0, -6, 6, 0], scale: 1.06 }}
        transition={{ duration: 0.6 }}
      />
      <img src={logotype} alt="Sen Éclat" className="logo__type" />
    </Link>
  )
}
