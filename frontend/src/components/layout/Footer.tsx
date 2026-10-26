import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import logo from '../../assets/brand/logo.webp'
import orangeMoneyLogo from '../../assets/payments/orange-money.svg'
import waveLogo from '../../assets/payments/wave.png'
import { CATEGORIES } from '../../config'
import { Sparkle } from '../Icons'

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <motion.div
          className="footer__brand"
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <img src={logo} alt="Sen Éclat — Beauté, cosmétiques, lessive, nettoyage" width={168} height={168} loading="lazy" />
        </motion.div>
        <nav aria-label="Boutique" className="footer__col">
          <span className="footer__title">Boutique</span>
          {CATEGORIES.map((c) => (
            <Link key={c.slug} to={`/boutique?category=${c.slug}`} className="footer__link">
              {c.name}
            </Link>
          ))}
          <Link to="/boutique?promo=true" className="footer__link">
            Offres
          </Link>
        </nav>
        <nav aria-label="Aide" className="footer__col">
          <span className="footer__title">Aide</span>
          <Link to="/compte" className="footer__link">
            Suivre ma commande
          </Link>
          <Link to="/maison#faq" className="footer__link">
            Livraison &amp; retours
          </Link>
          <Link to="/maison#faq" className="footer__link">
            FAQ
          </Link>
          <Link to="/maison#contact" className="footer__link">
            Contact
          </Link>
          <Link to="/maison" className="footer__link">
            Notre maison
          </Link>
        </nav>
        <nav aria-label="Informations légales" className="footer__col">
          <span className="footer__title">Légal</span>
          <Link to="/maison#legal" className="footer__link">
            Conditions générales de vente
          </Link>
          <Link to="/maison#legal" className="footer__link">
            Politique de confidentialité
          </Link>
          <Link to="/maison#legal" className="footer__link">
            Mentions légales
          </Link>
        </nav>
        <div className="footer__col">
          <span className="footer__title">Nous trouver</span>
          <span>Parcelle Croisement 22 en face Auchan Dakar,13007</span>
          <span>77 989 35 35</span>
          <span>seneclat22@gmail.com</span>
          <span>7jours/7 de 08h à 21h</span>
        </div>
      </div>
      <div className="container footer__divider" aria-hidden="true">
        <span />
        <motion.span
          className="footer__star"
          initial={{ rotate: -180, scale: 0 }}
          whileInView={{ rotate: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 120, damping: 12 }}
        >
          <Sparkle size={16} />
        </motion.span>
        <span />
      </div>
      <div className="container footer__bottom">
        <span>© {new Date().getFullYear()} Sen Éclat. Tous droits réservés.</span>
        <div className="footer__pay">
          <span>Paiements :</span>
          <span className="footer__chip footer__chip--logo">
            <img src={waveLogo} alt="Wave" width={57} height={25} loading="lazy" />
          </span>
          <span className="footer__chip footer__chip--logo">
            <img src={orangeMoneyLogo} alt="Orange Money" width={94} height={25} loading="lazy" />
          </span>
        </div>
      </div>
    </footer>
  )
}
