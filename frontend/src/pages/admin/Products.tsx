import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { CATEGORIES } from '../../config'
import { useAsync } from '../../hooks/useAsync'
import { api, ApiError } from '../../lib/api'
import { formatPrice } from '../../lib/format'
import { errorMessage, LoadState, Pager, Toolbar, useDebounced, useFlash } from './shared'
import type { AdminProduct, AdminProductInput, AdminVariant, Paginated } from './types'

const EMPTY_VARIANT: AdminVariant = { label: '', sku: '', price: 0, compare_at_price: null, stock: 0 }

const EMPTY_PRODUCT: AdminProductInput = {
  slug: '',
  name: '',
  category: 'beaute',
  reference: '',
  short_description: '',
  description: '',
  usage: '',
  composition: '',
  precautions: '',
  is_new: false,
  is_bestseller: false,
  is_active: true,
  variants: [{ ...EMPTY_VARIANT }],
}

const TEXT_FIELDS: { key: 'description' | 'usage' | 'composition' | 'precautions'; label: string }[] = [
  { key: 'description', label: 'Description' },
  { key: 'usage', label: 'Mode d’emploi' },
  { key: 'composition', label: 'Composition' },
  { key: 'precautions', label: 'Précautions & conservation' },
]

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const IMAGE_MAX_BYTES = 5 * 1024 * 1024

/** Choix de l'image produit : aperçu local immédiat, envoi au serveur à l'enregistrement du produit. */
function ImagePicker({
  currentUrl,
  file,
  onFile,
  removed,
  onRemove,
}: {
  currentUrl: string
  file: File | null
  onFile: (file: File | null) => void
  removed: boolean
  onRemove: () => void
}) {
  const [error, setError] = useState<string | null>(null)
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0] ?? null
    event.target.value = '' // permet de re-choisir le même fichier après une erreur
    if (!chosen) return
    if (!IMAGE_TYPES.includes(chosen.type)) return setError('Formats acceptés : JPEG, PNG ou WebP.')
    if (chosen.size > IMAGE_MAX_BYTES) return setError('L’image ne doit pas dépasser 5 Mo.')
    setError(null)
    onFile(chosen)
  }

  const shown = preview ?? (removed ? '' : currentUrl)

  return (
    <div className="field grid-2__full">
      <span>
        Image du produit <span className="field__hint">— JPEG, PNG ou WebP, 5 Mo max., 200 × 200 px min.</span>
      </span>
      <div className="admin-image">
        <div className="admin-image__preview">
          {shown ? <img src={shown} alt="Aperçu du produit" /> : <span className="muted admin-small">Aucune image</span>}
        </div>
        <div className="admin-image__actions">
          <label className="btn btn--outline btn--sm admin-image__pick">
            {shown ? 'Changer l’image' : 'Choisir une image'}
            <input type="file" accept={IMAGE_TYPES.join(',')} className="sr-only" onChange={pick} />
          </label>
          {shown && (
            <button
              type="button"
              className="link-btn admin-danger"
              onClick={() => {
                onFile(null)
                if (currentUrl) onRemove()
              }}
            >
              Retirer l’image
            </button>
          )}
          {file && <span className="muted admin-small">{file.name} — envoyée à l’enregistrement</span>}
        </div>
      </div>
      {error && (
        <p role="alert" className="field__error">
          {error}
        </p>
      )}
    </div>
  )
}

function ProductEditor({ product, onDone }: { product: AdminProduct | null; onDone: (message?: string) => void }) {
  const [form, setForm] = useState<AdminProductInput>(product ?? EMPTY_PRODUCT)
  const [error, setError] = useState<ApiError | null>(null)
  const [pending, setPending] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageRemoved, setImageRemoved] = useState(false)

  const set = <K extends keyof AdminProductInput>(key: K, value: AdminProductInput[K]) => setForm((f) => ({ ...f, [key]: value }))
  const setVariant = (index: number, patch: Partial<AdminVariant>) =>
    set(
      'variants',
      form.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    )

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      const saved = product
        ? await api.patch<AdminProduct>(`/admin/products/${product.id}/`, form)
        : await api.post<AdminProduct>('/admin/products/', form)
      try {
        if (imageFile) {
          const body = new FormData()
          body.append('image', imageFile)
          await api.post(`/admin/products/${saved.id}/image/`, body)
        } else if (imageRemoved && product?.image_url) {
          await api.delete(`/admin/products/${saved.id}/image/`)
        }
      } catch (err) {
        // Le produit est déjà enregistré : on quitte le formulaire pour ne pas le recréer en double.
        return onDone(`Produit enregistré, mais l’image n’a pas été mise à jour : ${errorMessage(err)}`)
      }
      onDone(product ? 'Produit mis à jour.' : 'Produit ajouté au catalogue.')
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'Enregistrement impossible.'))
    } finally {
      setPending(false)
    }
  }

  const invalid = (field: string) => (error?.fieldError(field) ? true : undefined)

  return (
    <form className="admin-card admin-form" onSubmit={submit}>
      <div className="admin-form__head">
        <h2 className="h2">{product ? `Modifier « ${product.name} »` : 'Nouveau produit'}</h2>
        <button type="button" className="link-btn" onClick={() => onDone()}>
          ← Retour à la liste
        </button>
      </div>

      <div className="grid-2">
        <label className="field">
          Nom
          <input className="input" required maxLength={160} value={form.name} aria-invalid={invalid('name')} onChange={(e) => set('name', e.target.value)} />
        </label>
        <label className="field">
          <span>
            Slug (adresse) <span className="field__hint">— généré depuis le nom si vide</span>
          </span>
          <input className="input" maxLength={120} pattern="[a-z0-9-]*" value={form.slug} aria-invalid={invalid('slug')} onChange={(e) => set('slug', e.target.value)} />
        </label>
        <label className="field">
          Catégorie
          <select className="select" value={form.category} onChange={(e) => set('category', e.target.value as AdminProductInput['category'])}>
            {CATEGORIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Référence
          <input className="input" required maxLength={40} value={form.reference} aria-invalid={invalid('reference')} onChange={(e) => set('reference', e.target.value)} />
        </label>
        <label className="field grid-2__full">
          Description courte
          <input className="input" required maxLength={400} value={form.short_description} onChange={(e) => set('short_description', e.target.value)} />
        </label>
        <ImagePicker
          currentUrl={product?.image_url ?? ''}
          file={imageFile}
          onFile={(file) => {
            setImageFile(file)
            if (file) setImageRemoved(false)
          }}
          removed={imageRemoved}
          onRemove={() => setImageRemoved(true)}
        />
        {TEXT_FIELDS.map(({ key, label }) => (
          <label key={key} className="field">
            {label}
            <textarea className="textarea" rows={3} value={form[key]} onChange={(e) => set(key, e.target.value)} />
          </label>
        ))}
      </div>

      <div className="admin-checks">
        <label className="check">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} />
          En ligne (visible dans la boutique)
        </label>
        <label className="check">
          <input type="checkbox" checked={form.is_new} onChange={(e) => set('is_new', e.target.checked)} />
          Nouveauté
        </label>
        <label className="check">
          <input type="checkbox" checked={form.is_bestseller} onChange={(e) => set('is_bestseller', e.target.checked)} />
          Meilleure vente
        </label>
      </div>

      <fieldset className="admin-variants">
        <legend className="h3">Formats & prix</legend>
        {form.variants.map((v, i) => (
          <div key={v.id ?? `new-${i}`} className="admin-variant">
            <label className="field">
              Contenance
              <input className="input" required maxLength={60} placeholder="500 ml" value={v.label} onChange={(e) => setVariant(i, { label: e.target.value })} />
            </label>
            <label className="field">
              SKU
              <input className="input" required maxLength={60} value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} />
            </label>
            <label className="field">
              Prix (FCFA)
              <input className="input" type="number" required min={1} value={v.price || ''} onChange={(e) => setVariant(i, { price: Number(e.target.value) })} />
            </label>
            <label className="field">
              Prix barré
              <input
                className="input"
                type="number"
                min={1}
                value={v.compare_at_price ?? ''}
                onChange={(e) => setVariant(i, { compare_at_price: e.target.value ? Number(e.target.value) : null })}
              />
            </label>
            <label className="field">
              Stock
              <input className="input" type="number" required min={0} value={v.stock} onChange={(e) => setVariant(i, { stock: Number(e.target.value) })} />
            </label>
            <button
              type="button"
              className="link-btn admin-danger"
              disabled={form.variants.length === 1}
              onClick={() => set('variants', form.variants.filter((_, j) => j !== i))}
            >
              Retirer
            </button>
          </div>
        ))}
        <div>
          <button type="button" className="btn btn--outline btn--sm" onClick={() => set('variants', [...form.variants, { ...EMPTY_VARIANT }])}>
            + Ajouter un format
          </button>
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="alert alert--error">
          {error.message}
        </p>
      )}
      <div className="admin-form__actions">
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? 'Enregistrement…' : product ? 'Enregistrer les modifications' : 'Ajouter le produit'}
        </button>
        <button type="button" className="btn btn--outline" onClick={() => onDone()}>
          Annuler
        </button>
      </div>
    </form>
  )
}

export function Products() {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [active, setActive] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<AdminProduct | 'new' | null>(null)
  const [flash, setFlash] = useFlash()
  const [actionError, setActionError] = useState<string | null>(null)
  const search = useDebounced(q)

  const { data, loading, error, reload } = useAsync(
    () => api.get<Paginated<AdminProduct>>('/admin/products/', { query: { q: search, category, active, page } }),
    [search, category, active, page],
  )

  if (editing) {
    return (
      <ProductEditor
        product={editing === 'new' ? null : editing}
        onDone={(message) => {
          setEditing(null)
          if (message) {
            setFlash(message)
            reload()
          }
        }}
      />
    )
  }

  async function remove(product: AdminProduct) {
    if (!window.confirm(`Supprimer définitivement « ${product.name} » ? L’historique des commandes est conservé.`)) return
    setActionError(null)
    try {
      await api.delete(`/admin/products/${product.id}/`)
      setFlash('Produit supprimé.')
      reload()
    } catch (err) {
      setActionError(errorMessage(err, 'Suppression impossible.'))
    }
  }

  async function toggleActive(product: AdminProduct) {
    setActionError(null)
    try {
      await api.patch(`/admin/products/${product.id}/`, { is_active: !product.is_active })
      reload()
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  const resetPage = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value)
    setPage(1)
  }

  return (
    <>
      <Toolbar>
        <input
          className="input"
          type="search"
          placeholder="Nom, référence ou SKU…"
          aria-label="Rechercher un produit"
          value={q}
          onChange={(e) => resetPage(setQ)(e.target.value)}
        />
        <select className="select" aria-label="Catégorie" value={category} onChange={(e) => resetPage(setCategory)(e.target.value)}>
          <option value="">Toutes catégories</option>
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <select className="select" aria-label="Visibilité" value={active} onChange={(e) => resetPage(setActive)(e.target.value)}>
          <option value="">En ligne et hors ligne</option>
          <option value="true">En ligne</option>
          <option value="false">Hors ligne</option>
        </select>
        <button type="button" className="btn btn--primary" onClick={() => setEditing('new')}>
          + Nouveau produit
        </button>
      </Toolbar>

      {flash && (
        <p role="status" className="alert alert--success">
          {flash}
        </p>
      )}
      {actionError && (
        <p role="alert" className="alert alert--error">
          {actionError}
        </p>
      )}

      {!data ? (
        <LoadState loading={loading} error={error} onRetry={reload} />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Produit</th>
                  <th scope="col">Catégorie</th>
                  <th scope="col">Prix</th>
                  <th scope="col">Stock</th>
                  <th scope="col">Ventes</th>
                  <th scope="col">Statut</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="muted">
                      Aucun produit ne correspond.
                    </td>
                  </tr>
                )}
                {data.items.map((p) => {
                  const stock = p.variants.reduce((sum, v) => sum + v.stock, 0)
                  const minPrice = Math.min(...p.variants.map((v) => v.price))
                  return (
                    <tr key={p.id}>
                      <td className="admin-product-cell">
                        <span className="admin-thumb">{p.image_url && <img src={p.image_url} alt="" loading="lazy" />}</span>
                        <span>
                          <span className="table__strong">{p.name}</span>
                          <br />
                          <span className="muted admin-small">
                            {p.reference} · {p.variants.length} format{p.variants.length > 1 ? 's' : ''}
                          </span>
                        </span>
                      </td>
                      <td>{p.category_label}</td>
                      <td className="price">{p.variants.length ? formatPrice(minPrice) : '—'}</td>
                      <td>
                        <span className={`status ${stock === 0 ? 'status--out' : stock <= 5 ? 'status--low' : 'status--ok'}`}>{stock}</span>
                      </td>
                      <td>{p.sales_count}</td>
                      <td>
                        <button type="button" className="link-btn" onClick={() => toggleActive(p)} title="Basculer la visibilité">
                          {p.is_active ? 'En ligne' : 'Hors ligne'}
                        </button>
                      </td>
                      <td className="admin-actions">
                        <button type="button" className="link-btn" onClick={() => setEditing(p)}>
                          Modifier
                        </button>
                        <button type="button" className="link-btn admin-danger" onClick={() => remove(p)}>
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      )}
    </>
  )
}
