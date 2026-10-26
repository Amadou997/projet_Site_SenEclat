import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import logo from '../assets/brand/logo.webp'
import { ArrowRight, WhatsAppIcon } from '../components/Icons'
import { Reveal, RevealItem } from '../components/motion/Reveal'
import { SparkleField } from '../components/motion/SparkleField'
import { Accordion } from '../components/ui/Accordion'
import { WHATSAPP_DISPLAY, whatsappLink } from '../config'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { api, ApiError } from '../lib/api'

const FAQ = [
  ['Quels sont les délais de livraison à Dakar ?', '[Réponse à fournir : délais par zone et créneaux de livraison.]'],
  ['Combien coûte la livraison ?', 'Livraison à domicile à Dakar : 2 000 FCFA. Retrait en boutique gratuit. [Grille par zone et seuil de gratuité éventuel à confirmer.]'],
  ['Quels moyens de paiement acceptez-vous ?', 'Wave et Orange Money. La carte bancaire et le paiement à la livraison sont proposés selon les solutions retenues.'],
  ['Puis-je retirer ma commande en boutique ?', '[Réponse à fournir : adresse, horaires et délai de mise à disposition.]'],
  ['Livrez-vous en dehors de Dakar ?', '[Réponse à fournir : calendrier de l’extension progressive aux autres régions.]'],
  ['Comment retourner un produit ?', '[Réponse à fournir : conditions et délai de retour, produits exclus (hygiène, produits ouverts).]'],
]

const SUBJECTS = [
  { value: 'produit', label: 'Question sur un produit' },
  { value: 'suivi', label: 'Suivi de commande' },
  { value: 'livraison', label: 'Livraison' },
  { value: 'retour', label: 'Retour ou réclamation' },
  { value: 'autre', label: 'Autre' },
]

function ContactForm() {
  const [form, setForm] = useState({ full_name: '', phone: '', subject: 'produit', message: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<ApiError | null>(null)

  async function send(event: FormEvent) {
    event.preventDefault()
    setState('sending')
    setError(null)
    try {
      await api.post('/contact/', form)
      setState('sent')
      setForm({ full_name: '', phone: '', subject: 'produit', message: '' })
    } catch (err) {
      setState('idle')
      setError(err instanceof ApiError ? err : new ApiError(0, 'Envoi impossible. Vérifiez votre réseau.'))
    }
  }

  return (
    <form className="contact__form" onSubmit={send}>
      <label className="field">
        Nom complet
        <input className="input" autoComplete="name" required minLength={2} maxLength={160} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      </label>
      <label className="field">
        Téléphone
        <input
          className="input"
          type="tel"
          autoComplete="tel"
          placeholder="+221"
          required
          maxLength={20}
          value={form.phone}
          aria-invalid={error?.fieldError('phone') ? true : undefined}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        {error?.fieldError('phone') && <span className="field__error">{error.fieldError('phone')}</span>}
      </label>
      <label className="field">
        Sujet
        <select className="select" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
          {SUBJECTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Message
        <textarea className="textarea" rows={5} required minLength={10} maxLength={2000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      </label>
      <button type="submit" className="btn btn--primary" disabled={state === 'sending'}>
        {state === 'sending' ? 'Envoi…' : 'Envoyer le message'}
      </button>
      <AnimatePresence>
        {state === 'sent' && (
          <motion.p role="status" className="alert alert--success" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            Merci, votre message a bien été envoyé. Nous vous répondons sous <span className="placeholder-note">[délai à confirmer]</span>.
          </motion.p>
        )}
        {error && !error.fieldError('phone') && (
          <motion.p role="alert" className="alert alert--error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {error.message}
          </motion.p>
        )}
      </AnimatePresence>
    </form>
  )
}

export default function InfoPage() {
  useDocumentTitle('Notre maison, aide et contact')
  const { hash } = useLocation()

  // Fait défiler vers l'ancre (#faq, #contact, #legal) après la transition de page.
  useEffect(() => {
    if (!hash) return
    const id = window.setTimeout(() => document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth' }), 450)
    return () => window.clearTimeout(id)
  }, [hash])

  return (
    <>
      <section id="apropos" aria-labelledby="about-title" className="maison-hero">
        <SparkleField count={16} seed={9} />
        <div className="container maison-hero__grid">
          <Reveal className="stack" style={{ gap: 22 }}>
            <span className="eyebrow eyebrow--light">Notre maison</span>
            <h1 id="about-title" className="display">
              Le savoir-faire espagnol <em className="gold-shimmer">au Sénégal</em>
            </h1>
            <p className="lead" style={{ color: '#D9CDB8' }}>
              Sen Éclat réunit quatre univers — beauté, cosmétiques, lessive et nettoyage — autour d’une même idée :
              apporter au quotidien sénégalais l’exigence de qualité du savoir-faire espagnol.
            </p>
            <p style={{ color: '#CDBFA6' }}>
              <span className="placeholder-note">[Histoire de la marque à fournir : fondatrice / fondateur, date de création, origine et sélection des produits, engagements.]</span>
            </p>
          </Reveal>
          <motion.img
            src={logo}
            alt="Logo Sen Éclat"
            className="maison-hero__logo"
            initial={{ opacity: 0, scale: 0.85, rotate: -6 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </section>

      <section aria-labelledby="values-title" className="container section">
        <h2 id="values-title" className="h2" style={{ marginBottom: 32 }}>
          Nos engagements
        </h2>
        <Reveal stagger={0.12} className="values">
          {['Qualité sélectionnée', 'Conseil de proximité', 'Livraison soignée'].map((title, i) => (
            <RevealItem key={title} className="value">
              <span className="value__num">0{i + 1}</span>
              <span className="h3">{title}</span>
              <span className="muted">[Texte à fournir par Sen Éclat.]</span>
            </RevealItem>
          ))}
        </Reveal>
      </section>

      <section id="faq" aria-labelledby="faq-title" className="container section faq">
        <span className="eyebrow">Aide</span>
        <h2 id="faq-title" className="h2" style={{ margin: '10px 0 28px' }}>
          Questions fréquentes
        </h2>
        <Accordion headingLevel={3} variant="compact" items={FAQ.map(([q, a]) => ({ title: q!, content: a }))} />
      </section>

      <section id="contact" aria-labelledby="contact-title" className="contact">
        <div className="container contact__grid">
          <Reveal className="stack" style={{ gap: 22 }}>
            <span className="eyebrow eyebrow--light">Contact &amp; assistance</span>
            <h2 id="contact-title" className="h2">
              Parlons de votre besoin
            </h2>
            <div>
              <a href={whatsappLink()} className="btn btn--whatsapp" rel="noopener noreferrer">
                <WhatsAppIcon size={20} strokeWidth={1.6} /> Écrire sur WhatsApp
              </a>
            </div>
            <dl className="contact__facts">
              <dt>Boutique</dt>
              <dd>Parcelle Croisement 22, Dakar</dd>
              <dt>Téléphone</dt>
              <dd>77 989 35 35</dd>
              <dd>
                <a href={whatsappLink()} rel="noopener noreferrer">
                  {WHATSAPP_DISPLAY}
                </a>
              </dd>
              <dt>E-mail</dt>
              <dd>seneclat22@gmail.com</dd>
              <dt>Horaires</dt>
              <dd>Tous les jours de 08h à 21h</dd>
            </dl>
          </Reveal>
          <ContactForm />
        </div>
      </section>

      <section id="legal" aria-labelledby="legal-title" className="container section">
        <h2 id="legal-title" className="h2" style={{ marginBottom: 24 }}>
          Informations légales
        </h2>
        <div className="legal">
          {['Conditions générales de vente', 'Politique de confidentialité', 'Livraison & retours', 'Mentions légales'].map((t) => (
            <motion.div key={t} className="legal__item" whileHover={{ x: 6 }}>
              {t}
              <ArrowRight size={18} />
            </motion.div>
          ))}
        </div>
        <p className="muted" style={{ marginTop: 16, fontSize: 14 }}>
          Contenus juridiques à rédiger et valider par Sen Éclat avant la mise en ligne.{' '}
          <Link to="/maison#contact">Une question ?</Link>
        </p>
      </section>
    </>
  )
}
