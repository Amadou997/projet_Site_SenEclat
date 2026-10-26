import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CloseIcon, FilterIcon, SearchIcon } from '../components/Icons'
import { ProductCard, ProductCardSkeleton } from '../components/product/ProductCard'
import { CATEGORIES } from '../config'
import { useAsync } from '../hooks/useAsync'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { api } from '../lib/api'
import type { CategorySlug, ProductPage } from '../lib/types'

const SORTS = [
  { value: 'relevance', label: 'Pertinence' },
  { value: 'bestsellers', label: 'Meilleures ventes' },
  { value: 'newest', label: 'Nouveautés' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
]

const CHIPS: { key: string; label: string }[] = [
  { key: 'all', label: 'Tous' },
  ...CATEGORIES.map((c) => ({ key: c.slug, label: c.name })),
  { key: 'promo', label: 'Offres' },
]

/** Numéros de page à afficher : première, dernière et voisines de la courante ; `null` = « … ». */
function pageWindow(current: number, total: number): (number | null)[] {
  const shown = [...new Set([1, current - 1, current, current + 1, total])]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b)
  const out: (number | null)[] = []
  shown.forEach((n, i) => {
    const prev = shown[i - 1]
    if (prev !== undefined && n - prev === 2) out.push(prev + 1)
    else if (prev !== undefined && n - prev > 2) out.push(null)
    out.push(n)
  })
  return out
}

/** Champ numérique qui ne met à jour l'URL qu'après une courte pause de saisie. */
function DebouncedPrice({ label, value, onCommit }: { label: string; value: string; onCommit: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  useEffect(() => {
    if (draft === value) return
    const id = window.setTimeout(() => onCommit(draft), 500)
    return () => window.clearTimeout(id)
  }, [draft, value, onCommit])
  return (
    <label className="field shop__price-field">
      <span className="field__hint">{label}</span>
      <input
        className="input"
        type="number"
        inputMode="numeric"
        min={0}
        step={500}
        placeholder={label === 'Min' ? '0' : '—'}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />
    </label>
  )
}

export default function ShopPage() {
  const [params, setParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const categories = params.getAll('category') as CategorySlug[]
  const q = params.get('q') ?? ''
  const sort = params.get('sort') ?? 'relevance'
  const page = Number(params.get('page') ?? '1') || 1
  const flags = {
    in_stock: params.get('in_stock') === 'true',
    promo: params.get('promo') === 'true',
    new: params.get('new') === 'true',
  }

  const activeChip = flags.promo && categories.length === 0 ? 'promo' : categories.length === 1 ? categories[0]! : categories.length === 0 ? 'all' : ''
  const title = q
    ? `Résultats pour « ${q} »`
    : activeChip === 'all'
      ? 'Tous les produits'
      : activeChip === 'promo'
        ? 'Offres'
        : CHIPS.find((c) => c.key === activeChip)?.label ?? 'Sélection'
  useDocumentTitle(title)

  const queryKey = params.toString()
  const { data, loading, error, reload } = useAsync(
    () =>
      api.get<ProductPage>('/products/', {
        query: {
          category: categories,
          q,
          sort,
          page,
          min_price: params.get('min_price'),
          max_price: params.get('max_price'),
          ...flags,
        },
      }),
    [queryKey],
  )

  function update(mutator: (next: URLSearchParams) => void, resetPage = true) {
    const next = new URLSearchParams(params)
    mutator(next)
    if (resetPage) next.delete('page')
    setParams(next, { preventScrollReset: true })
  }

  function goToPage(n: number) {
    update((next) => next.set('page', String(n)), false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function pickChip(key: string) {
    update((next) => {
      next.delete('category')
      next.delete('promo')
      if (key === 'promo') next.set('promo', 'true')
      else if (key !== 'all') next.set('category', key)
    })
  }

  function toggleCategory(slug: CategorySlug) {
    update((next) => {
      const current = next.getAll('category')
      next.delete('category')
      const updated = current.includes(slug) ? current.filter((c) => c !== slug) : [...current, slug]
      updated.forEach((c) => next.append('category', c))
    })
  }

  function setFlag(key: keyof typeof flags, value: boolean) {
    update((next) => (value ? next.set(key, 'true') : next.delete(key)))
  }

  function setPrice(key: 'min_price' | 'max_price', value: string) {
    update((next) => (value ? next.set(key, value) : next.delete(key)))
  }

  const facetCount = (slug: CategorySlug) => data?.facets.find((f) => f.value === slug)?.count

  const filters = (
    <>
      <fieldset className="shop__fieldset">
        <legend className="shop__legend">Catégorie</legend>
        {CATEGORIES.map((c) => (
          <label key={c.slug} className="check">
            <input type="checkbox" checked={categories.includes(c.slug)} onChange={() => toggleCategory(c.slug)} />
            {c.name}
            <span className="shop__count">{facetCount(c.slug) ?? '·'}</span>
          </label>
        ))}
      </fieldset>
      <hr className="shop__sep" />
      <fieldset className="shop__fieldset">
        <legend className="shop__legend">Prix (FCFA)</legend>
        <div className="shop__price">
          <DebouncedPrice label="Min" value={params.get('min_price') ?? ''} onCommit={(v) => setPrice('min_price', v)} />
          <DebouncedPrice label="Max" value={params.get('max_price') ?? ''} onCommit={(v) => setPrice('max_price', v)} />
        </div>
      </fieldset>
      <hr className="shop__sep" />
      <fieldset className="shop__fieldset">
        <legend className="shop__legend">Disponibilité &amp; offres</legend>
        <label className="check">
          <input type="checkbox" checked={flags.in_stock} onChange={(e) => setFlag('in_stock', e.target.checked)} />
          En stock uniquement
        </label>
        <label className="check">
          <input type="checkbox" checked={flags.promo} onChange={(e) => setFlag('promo', e.target.checked)} />
          En promotion
        </label>
        <label className="check">
          <input type="checkbox" checked={flags.new} onChange={(e) => setFlag('new', e.target.checked)} />
          Nouveautés
        </label>
      </fieldset>
      <button type="button" className="link-btn" onClick={() => setParams(new URLSearchParams())}>
        Réinitialiser les filtres
      </button>
    </>
  )

  return (
    <div className="container shop">
      <nav aria-label="Fil d'Ariane" className="breadcrumbs">
        <Link to="/">Accueil</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Boutique</span>
      </nav>

      <div className="shop__head">
        <AnimatePresence mode="wait">
          <motion.h1
            key={title}
            className="h1"
            initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
            transition={{ duration: 0.3 }}
          >
            {title}
          </motion.h1>
        </AnimatePresence>
        <p className="muted">Beauté, cosmétiques, lessive et nettoyage — le savoir-faire espagnol au Sénégal.</p>
      </div>

      <LayoutGroup id="chips">
        <div role="group" aria-label="Filtrer par catégorie" className="chips">
          {CHIPS.map((chip) => {
            const on = chip.key === activeChip
            return (
              <button
                key={chip.key}
                type="button"
                className={`chip ${on ? 'chip--on' : ''}`}
                aria-pressed={on}
                onClick={() => pickChip(chip.key)}
              >
                {on && (
                  <motion.span
                    layoutId="chip-pill"
                    className="chip__pill"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="chip__label">{chip.label}</span>
              </button>
            )
          })}
        </div>
      </LayoutGroup>

      <div className="shop__layout">
        <aside aria-label="Filtres" className="shop__filters hide-sm">
          {filters}
        </aside>

        <div className="shop__main">
          <div className="shop__toolbar">
            <span className="muted" aria-live="polite">
              <strong style={{ color: 'var(--ebene)' }}>{data?.total ?? '…'}</strong> produit{data?.total === 1 ? '' : 's'}
            </span>
            <div className="shop__toolbar-right">
              <button type="button" className="btn btn--outline btn--sm show-sm" onClick={() => setFiltersOpen(true)}>
                <FilterIcon size={18} />
                Filtres
              </button>
              <label className="shop__sort">
                <span className="hide-sm">Trier par</span>
                <select
                  className="select"
                  value={sort}
                  onChange={(e) => update((next) => next.set('sort', e.target.value))}
                  aria-label="Trier par"
                >
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {error ? (
            <div className="alert alert--error" role="alert">
              Le catalogue est momentanément indisponible.{' '}
              <button type="button" className="link-btn" onClick={reload}>
                Réessayer
              </button>
            </div>
          ) : loading && !data ? (
            <div className="product-grid product-grid--shop">
              {Array.from({ length: 6 }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : data && data.items.length === 0 ? (
            <motion.div className="empty" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
              <SearchIcon size={34} strokeWidth={1.3} style={{ color: 'var(--or-profond)' }} />
              <strong>{q ? `Aucun résultat pour « ${q} »` : 'Aucun produit ne correspond à ces filtres'}</strong>
              <span className="muted">Vérifiez l’orthographe ou parcourez nos catégories.</span>
              <div className="empty__chips">
                {CATEGORIES.map((c) => (
                  <Link key={c.slug} to={`/boutique?category=${c.slug}`} className="chip chip--small">
                    {c.name}
                  </Link>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div layout className="product-grid product-grid--shop" style={{ opacity: loading ? 0.55 : 1 }}>
              <AnimatePresence mode="popLayout">
                {data?.items.map((p, i) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, y: 24, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: i * 0.04, duration: 0.45 } }}
                    exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.2 } }}
                  >
                    <ProductCard product={p} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {data && data.pages > 1 && (
            <nav aria-label="Pagination" className="pagination">
              <button
                type="button"
                className="pagination__btn"
                aria-label="Page précédente"
                disabled={data.page <= 1}
                onClick={() => goToPage(data.page - 1)}
              >
                <ArrowLeft size={16} />
              </button>
              {pageWindow(data.page, data.pages).map((n, i) =>
                n === null ? (
                  <span key={`gap-${i}`} className="pagination__gap" aria-hidden="true">
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    className={`pagination__btn ${n === data.page ? 'pagination__btn--on' : ''}`}
                    aria-current={n === data.page ? 'page' : undefined}
                    onClick={() => goToPage(n)}
                  >
                    {n}
                  </button>
                ),
              )}
              <button
                type="button"
                className="pagination__btn"
                aria-label="Page suivante"
                disabled={data.page >= data.pages}
                onClick={() => goToPage(data.page + 1)}
              >
                <ArrowRight size={16} />
              </button>
            </nav>
          )}
        </div>
      </div>

      <AnimatePresence>
        {filtersOpen && (
          <>
            <motion.div
              className="drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFiltersOpen(false)}
            />
            <motion.aside
              className="sheet"
              aria-label="Filtres"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 34 }}
            >
              <div className="sheet__head">
                <strong className="h3">Filtres</strong>
                <button type="button" className="header__burger" aria-label="Fermer les filtres" onClick={() => setFiltersOpen(false)}>
                  <CloseIcon />
                </button>
              </div>
              <div className="sheet__body">{filters}</div>
              <button type="button" className="btn btn--primary btn--block" onClick={() => setFiltersOpen(false)}>
                Voir {data?.total ?? ''} produit{data?.total === 1 ? '' : 's'}
              </button>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
