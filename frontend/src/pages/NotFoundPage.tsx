import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { Sparkle } from '../components/Icons'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

export default function NotFoundPage() {
  useDocumentTitle('Page introuvable')
  return (
    <div className="container notfound">
      <motion.span
        className="notfound__star"
        animate={{ rotate: 360, scale: [1, 1.15, 1] }}
        transition={{ rotate: { duration: 12, repeat: Infinity, ease: 'linear' }, scale: { duration: 3, repeat: Infinity } }}
        aria-hidden="true"
      >
        <Sparkle size={64} />
      </motion.span>
      <h1 className="display">404</h1>
      <p className="lead muted">Cette page s’est évaporée… comme une goutte d’eau de Javel parfumée.</p>
      <Link to="/" className="btn btn--primary">
        Retour à l’accueil
      </Link>
    </div>
  )
}
