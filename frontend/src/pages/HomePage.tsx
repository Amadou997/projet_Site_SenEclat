import { motion, useMotionValue, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react'
import { useRef, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/brand/logo.webp'
import { ArrowRight, PhoneIcon, Sparkle, TruckIcon, WhatsAppIcon } from '../components/Icons'
import { Magnetic } from '../components/motion/Magnetic'
import { Reveal, RevealItem } from '../components/motion/Reveal'
import { SparkleField } from '../components/motion/SparkleField'
import { SplitText } from '../components/motion/SplitText'
import { ProductCard, ProductCardSkeleton } from '../components/product/ProductCard'
import { SectionHead } from '../components/ui/SectionHead'
import { CATEGORIES, WHATSAPP_DISPLAY, whatsappLink } from '../config'
import { useAsync } from '../hooks/useAsync'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { api } from '../lib/api'
import type { ProductPage } from '../lib/types'

/** Trèfle de l'emblème recomposé à partir des quatre univers, avec parallaxe au pointeur. */
function HeroEmblem() {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 60, damping: 18 })
  const sy = useSpring(my, { stiffness: 60, damping: 18 })
  const depth = [1.2, 0.7, 0.9, 1.4]

  function onMove(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    mx.set((event.clientX - rect.left) / rect.width - 0.5)
    my.set((event.clientY - rect.top) / rect.height - 0.5)
  }

  return (
    <div
      className="hero__visual"
      onPointerMove={onMove}
      onPointerLeave={() => {
        mx.set(0)
        my.set(0)
      }}
    >
      <motion.div
        className="hero__ring"
        aria-hidden="true"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="hero__ring hero__ring--inner"
        aria-hidden="true"
        animate={{ rotate: -360 }}
        transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
      />
      <div className="hero__clover" role="img" aria-label="Emblème Sen Éclat : beauté, cosmétiques, lessive et nettoyage">
        {CATEGORIES.map((c, i) => (
          <HeroPetal key={c.slug} src={c.image} index={i} sx={sx} sy={sy} depth={depth[i]!} />
        ))}
      </div>
      <SparkleField count={12} seed={3} className="hero__sparkles" />
    </div>
  )
}

function HeroPetal({
  src,
  index,
  sx,
  sy,
  depth,
}: {
  src: string
  index: number
  sx: MotionValue<number>
  sy: MotionValue<number>
  depth: number
}) {
  const x = useTransform(sx, (v) => v * 36 * depth)
  const y = useTransform(sy, (v) => v * 36 * depth)
  return (
    <motion.div className="hero__petal-wrap" style={{ x, y }}>
      <motion.img
        src={src}
        alt=""
        className="hero__petal"
        initial={{ opacity: 0, scale: 0.6, rotate: index % 2 ? 20 : -20 }}
        animate={{ opacity: 1, scale: 1, rotate: 0, y: [0, -8, 0] }}
        transition={{
          opacity: { delay: 0.3 + index * 0.12, duration: 0.6 },
          scale: { delay: 0.3 + index * 0.12, type: 'spring', stiffness: 120, damping: 12 },
          rotate: { delay: 0.3 + index * 0.12, type: 'spring', stiffness: 120, damping: 12 },
          y: { delay: 1.2 + index * 0.4, duration: 5 + index, repeat: Infinity, ease: 'easeInOut' },
        }}
      />
    </motion.div>
  )
}

function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const textY = useTransform(scrollYProgress, [0, 1], [0, 120])
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0])

  return (
    <section ref={ref} aria-labelledby="hero-title" className="hero">
      <div className="hero__glow" aria-hidden="true" />
      <div className="container hero__grid">
        <motion.div className="hero__copy" style={{ y: textY, opacity: fade }}>
          <motion.div
            className="eyebrow eyebrow--light hero__eyebrow"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <motion.span animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}>
              <Sparkle size={14} />
            </motion.span>
            Le savoir-faire espagnol au Sénégal
          </motion.div>
          <h1 id="hero-title" className="display hero__title">
            <SplitText text="L'éclat au quotidien," delay={0.2} />{' '}
            <em>
              <SplitText text="de la peau au linge." delay={0.45} wordClassName="gold-shimmer" />
            </em>
          </h1>
          <motion.p
            className="lead hero__lead"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8 }}
          >
            Beauté, cosmétiques, lessive et nettoyage : des produits issus du savoir-faire espagnol, à commander en
            ligne et à recevoir à Dakar.
          </motion.p>
          <motion.div
            className="hero__ctas"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.95 }}
          >
            <Magnetic>
              <Link to="/boutique" className="btn btn--gold">
                Découvrir nos produits
                <ArrowRight size={18} />
              </Link>
            </Magnetic>
            <Magnetic strength={0.15}>
              <a href={whatsappLink()} className="btn btn--outline-light" rel="noopener noreferrer">
                <WhatsAppIcon size={18} strokeWidth={1.6} />
                Conseil sur WhatsApp
              </a>
            </Magnetic>
          </motion.div>
        </motion.div>
        <HeroEmblem />
      </div>
      <div className="container hero__divider" aria-hidden="true">
        <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.2, delay: 0.6 }} />
        <Sparkle size={16} />
        <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.2, delay: 0.6 }} />
      </div>
    </section>
  )
}

function Universes() {
  return (
    <section aria-labelledby="cat-title" className="container section universes">
      <SectionHead
        id="cat-title"
        eyebrow="Nos univers"
        title="Quatre gammes, une même exigence"
        action={
          <Link to="/boutique" className="fancy-link">
            Voir tout le catalogue
          </Link>
        }
      />
      <Reveal stagger={0.1} className="universes__grid">
        {CATEGORIES.map((c) => (
          <RevealItem key={c.slug}>
            <Link to={`/boutique?category=${c.slug}`} className="universe">
              <div className="universe__media">
                <img src={c.image} alt="" loading="lazy" />
                <span className="universe__shine" aria-hidden="true" />
              </div>
              <div className="universe__body">
                <div>
                  <span className="universe__name">{c.name}</span>
                  <span className="universe__hint">{c.hint}</span>
                </div>
                <span className="universe__arrow" aria-hidden="true">
                  <ArrowRight size={16} />
                </span>
              </div>
            </Link>
          </RevealItem>
        ))}
      </Reveal>
    </section>
  )
}

function ProductRail({
  id,
  eyebrow,
  title,
  linkLabel,
  linkTo,
  query,
}: {
  id: string
  eyebrow: string
  title: string
  linkLabel: string
  linkTo: string
  query: Record<string, string | number | boolean>
}) {
  const { data, loading, error } = useAsync(
    () => api.get<ProductPage>('/products/', { query: { ...query, page_size: 4 } }),
    [JSON.stringify(query)],
  )
  return (
    <section aria-labelledby={id} className="container section">
      <SectionHead
        id={id}
        eyebrow={eyebrow}
        title={title}
        action={
          <Link to={linkTo} className="fancy-link">
            {linkLabel}
          </Link>
        }
      />
      {error ? (
        <p className="alert alert--error">Impossible de charger les produits pour le moment.</p>
      ) : (
        <Reveal stagger={0.08} className="product-grid">
          {loading || !data
            ? Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)
            : data.items.map((p) => (
                <RevealItem key={p.id}>
                  <ProductCard product={p} />
                </RevealItem>
              ))}
        </Reveal>
      )}
    </section>
  )
}

function Promo() {
  return (
    <section aria-labelledby="promo-title" className="container promo-wrap">
      <Reveal className="promo">
        <div className="promo__copy">
          <span className="eyebrow" style={{ color: 'var(--or-lumiere)' }}>
            Offre du moment
          </span>
          <h2 id="promo-title" className="h2">
            Bienvenue chez Sen Éclat — <em className="gold-shimmer">−10 %</em> dès 10 000 FCFA
          </h2>
          <p className="promo__text">
            Avec le code <strong className="promo__code">ECLAT10</strong>, sur toutes les gammes.{' '}
            <span className="placeholder-note promo__note">[Conditions et date de fin à confirmer]</span>
          </p>
          <div>
            <Magnetic>
              <Link to="/boutique?promo=true" className="btn btn--gold">
                Profiter de l’offre
              </Link>
            </Magnetic>
          </div>
        </div>
        <div className="promo__visual" aria-hidden="true">
          <SparkleField count={18} seed={11} />
          <motion.div
            className="promo__medal"
            animate={{ rotate: [0, 6, -6, 0], y: [0, -10, 0] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="promo__pct">−10&nbsp;%</span>
            <span className="promo__medal-sub">ECLAT10</span>
          </motion.div>
        </div>
      </Reveal>
    </section>
  )
}

const PERKS = [
  {
    icon: <Sparkle size={30} />,
    title: 'Savoir-faire espagnol',
    text: 'Des formules et une exigence de qualité venues d’Espagne, pour votre quotidien au Sénégal.',
  },
  {
    icon: <TruckIcon size={34} strokeWidth={1.3} />,
    title: 'Livraison à Dakar',
    text: 'Livraison à domicile ou retrait en boutique. Délais : [à confirmer].',
  },
  {
    icon: <PhoneIcon size={34} strokeWidth={1.3} />,
    title: 'Paiement mobile',
    text: 'Wave et Orange Money. Carte et paiement à la livraison selon les solutions retenues.',
  },
  {
    icon: <WhatsAppIcon size={34} strokeWidth={1.3} />,
    title: 'Conseil sur WhatsApp',
    text: 'Une question sur un produit ou une commande ? Notre équipe vous répond directement.',
  },
]

function Perks() {
  return (
    <section aria-labelledby="why-title" className="perks">
      <div className="container">
        <h2 id="why-title" className="sr-only">
          Pourquoi Sen Éclat
        </h2>
        <Reveal stagger={0.1} className="perks__grid">
          {PERKS.map((perk) => (
            <RevealItem key={perk.title} className="perk">
              <motion.span className="perk__icon" whileHover={{ rotate: 12, scale: 1.1 }}>
                {perk.icon}
              </motion.span>
              <h3 className="h3 perk__title">{perk.title}</h3>
              <p className="muted">{perk.text}</p>
            </RevealItem>
          ))}
        </Reveal>
      </div>
    </section>
  )
}

function About() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const rotate = useTransform(scrollYProgress, [0, 1], [-8, 8])
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1, 0.95])

  return (
    <section aria-labelledby="about-title" className="container about">
      <div ref={ref} className="about__media">
        <motion.img src={logo} alt="Logo Sen Éclat" style={{ rotate, scale }} loading="lazy" />
      </div>
      <Reveal className="about__copy">
        <span className="eyebrow">Notre maison</span>
        <h2 id="about-title" className="h2">
          Le savoir-faire espagnol, au service du Sénégal
        </h2>
        <p className="lead" style={{ color: 'var(--texte-2)' }}>
          Sen Éclat réunit quatre univers autour d’une même idée : apporter au quotidien sénégalais l’exigence de
          qualité des produits espagnols.{' '}
          <span className="placeholder-note">[Histoire de la marque à fournir.]</span>
        </p>
        <div>
          <Link to="/maison" className="btn btn--primary">
            Découvrir notre histoire
          </Link>
        </div>
      </Reveal>
    </section>
  )
}

function WhatsAppBanner() {
  return (
    <section aria-labelledby="wa-title" className="container wa-wrap">
      <Reveal className="wa">
        <div>
          <h2 id="wa-title" className="h3" style={{ fontSize: 32 }}>
            Besoin d’un conseil avant de commander ?
          </h2>
          <p className="muted">
            Écrivez-nous sur WhatsApp au {WHATSAPP_DISPLAY} — <span className="placeholder-note">[horaires à confirmer]</span>.
          </p>
        </div>
        <Magnetic strength={0.2}>
          <a href={whatsappLink()} className="btn btn--whatsapp" rel="noopener noreferrer">
            <WhatsAppIcon size={20} strokeWidth={1.6} />
            Écrire sur WhatsApp
          </a>
        </Magnetic>
      </Reveal>
    </section>
  )
}

export default function HomePage() {
  useDocumentTitle('')
  return (
    <>
      <Hero />
      <Universes />
      <ProductRail
        id="best-title"
        eyebrow="Les plus demandés"
        title="Meilleures ventes"
        linkLabel="Voir les meilleures ventes"
        linkTo="/boutique?sort=bestsellers"
        query={{ bestseller: true, sort: 'bestsellers' }}
      />
      <Promo />
      <ProductRail
        id="new-title"
        eyebrow="Tout juste arrivés"
        title="Nouveautés"
        linkLabel="Voir les nouveautés"
        linkTo="/boutique?new=true"
        query={{ new: true }}
      />
      <Perks />
      <About />
      <WhatsAppBanner />
    </>
  )
}
