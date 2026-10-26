import { useState, type FormEvent } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { api } from '../../lib/api'
import { formatDate, formatPhone, formatPrice } from '../../lib/format'
import { errorMessage, LoadState, Pager, Toolbar, useFlash } from './shared'
import type { ContactMessage, Paginated, PromoCode, SiteSettings } from './types'

/* ------------------------------------------------------------------ */
/* Paramètres de la boutique                                           */
/* ------------------------------------------------------------------ */

const toLines = (values: string[]) => values.join('\n')
const fromLines = (text: string) => text.split('\n').map((line) => line.trim()).filter(Boolean)

function SettingsForm({ initial }: { initial: SiteSettings }) {
  const [form, setForm] = useState({
    delivery_fee_dakar: initial.delivery_fee_dakar,
    fcfa_per_loyalty_point: initial.fcfa_per_loyalty_point,
    delivery_zones: toLines(initial.delivery_zones),
    announcements: toLines(initial.announcements),
  })
  const [flash, setFlash] = useFlash()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function save(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      const saved = await api.patch<SiteSettings>('/admin/settings/', {
        ...form,
        delivery_zones: fromLines(form.delivery_zones),
        announcements: fromLines(form.announcements),
      })
      setForm((f) => ({ ...f, delivery_zones: toLines(saved.delivery_zones), announcements: toLines(saved.announcements) }))
      setFlash('Paramètres enregistrés. Ils s’appliquent immédiatement à la boutique.')
    } catch (err) {
      setError(errorMessage(err, 'Enregistrement impossible.'))
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="admin-card admin-form" onSubmit={save}>
      <div className="grid-2">
        <label className="field">
          Frais de livraison à Dakar (FCFA)
          <input
            className="input"
            type="number"
            min={0}
            required
            value={form.delivery_fee_dakar}
            onChange={(e) => setForm({ ...form, delivery_fee_dakar: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          <span>
            Fidélité : FCFA par point <span className="field__hint">(1 point tous les … FCFA)</span>
          </span>
          <input
            className="input"
            type="number"
            min={1}
            required
            value={form.fcfa_per_loyalty_point}
            onChange={(e) => setForm({ ...form, fcfa_per_loyalty_point: Number(e.target.value) })}
          />
        </label>
        <label className="field">
          <span>
            Communes desservies <span className="field__hint">(une par ligne)</span>
          </span>
          <textarea className="textarea" rows={10} required value={form.delivery_zones} onChange={(e) => setForm({ ...form, delivery_zones: e.target.value })} />
        </label>
        <label className="field">
          <span>
            Bandeau d’annonces <span className="field__hint">(une annonce par ligne, 10 max.)</span>
          </span>
          <textarea className="textarea" rows={10} value={form.announcements} onChange={(e) => setForm({ ...form, announcements: e.target.value })} />
        </label>
      </div>
      {flash && (
        <p role="status" className="alert alert--success">
          {flash}
        </p>
      )}
      {error && (
        <p role="alert" className="alert alert--error">
          {error}
        </p>
      )}
      <div>
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? 'Enregistrement…' : 'Enregistrer les paramètres'}
        </button>
      </div>
    </form>
  )
}

export function Settings() {
  const { data, loading, error, reload } = useAsync(() => api.get<SiteSettings>('/admin/settings/'), [])
  return data ? <SettingsForm initial={data} /> : <LoadState loading={loading} error={error} onRetry={reload} />
}

/* ------------------------------------------------------------------ */
/* Codes promo                                                         */
/* ------------------------------------------------------------------ */

const EMPTY_PROMO = { code: '', percent_off: 10, min_subtotal: 0 }

export function Promos() {
  const { data, loading, error, reload } = useAsync(() => api.get<PromoCode[]>('/admin/promo-codes/'), [])
  const [form, setForm] = useState(EMPTY_PROMO)
  const [actionError, setActionError] = useState<string | null>(null)
  const [flash, setFlash] = useFlash()

  async function run(action: () => Promise<unknown>, success?: string) {
    setActionError(null)
    try {
      await action()
      if (success) setFlash(success)
      reload()
      return true
    } catch (err) {
      setActionError(errorMessage(err))
      return false
    }
  }

  async function create(event: FormEvent) {
    event.preventDefault()
    if (await run(() => api.post('/admin/promo-codes/', form), 'Code promo créé.')) setForm(EMPTY_PROMO)
  }

  return (
    <>
      <form className="admin-card admin-inline-form" onSubmit={create}>
        <label className="field">
          Code
          <input className="input" required maxLength={40} placeholder="TABASKI15" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
        </label>
        <label className="field">
          Remise (%)
          <input className="input" type="number" min={1} max={90} required value={form.percent_off} onChange={(e) => setForm({ ...form, percent_off: Number(e.target.value) })} />
        </label>
        <label className="field">
          Achat minimum (FCFA)
          <input className="input" type="number" min={0} value={form.min_subtotal} onChange={(e) => setForm({ ...form, min_subtotal: Number(e.target.value) })} />
        </label>
        <button type="submit" className="btn btn--primary">
          Créer le code
        </button>
      </form>
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
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Remise</th>
                <th scope="col">Minimum</th>
                <th scope="col">Statut</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    Aucun code promo.
                  </td>
                </tr>
              )}
              {data.map((p) => (
                <tr key={p.id}>
                  <td className="table__strong">{p.code}</td>
                  <td>−{p.percent_off} %</td>
                  <td>{p.min_subtotal ? formatPrice(p.min_subtotal) : '—'}</td>
                  <td>
                    <span className={`status ${p.is_active ? 'status--ok' : 'status--out'}`}>{p.is_active ? 'Actif' : 'Désactivé'}</span>
                  </td>
                  <td className="admin-actions">
                    <button type="button" className="link-btn" onClick={() => run(() => api.patch(`/admin/promo-codes/${p.id}/`, { is_active: !p.is_active }))}>
                      {p.is_active ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      type="button"
                      className="link-btn admin-danger"
                      onClick={() => window.confirm(`Supprimer le code ${p.code} ?`) && run(() => api.delete(`/admin/promo-codes/${p.id}/`), 'Code supprimé.')}
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Messages de contact                                                 */
/* ------------------------------------------------------------------ */

export function Messages() {
  const [handled, setHandled] = useState('false')
  const [page, setPage] = useState(1)
  const [actionError, setActionError] = useState<string | null>(null)
  const { data, loading, error, reload } = useAsync(
    () => api.get<Paginated<ContactMessage>>('/admin/messages/', { query: { handled, page } }),
    [handled, page],
  )

  async function run(action: () => Promise<unknown>) {
    setActionError(null)
    try {
      await action()
      reload()
    } catch (err) {
      setActionError(errorMessage(err))
    }
  }

  return (
    <>
      <Toolbar>
        <select
          className="select"
          aria-label="Filtrer les messages"
          value={handled}
          onChange={(e) => {
            setHandled(e.target.value)
            setPage(1)
          }}
        >
          <option value="false">À traiter</option>
          <option value="true">Traités</option>
          <option value="">Tous les messages</option>
        </select>
      </Toolbar>
      {actionError && (
        <p role="alert" className="alert alert--error">
          {actionError}
        </p>
      )}
      {!data ? (
        <LoadState loading={loading} error={error} onRetry={reload} />
      ) : (
        <>
          {data.items.length === 0 ? (
            <div className="empty">
              <strong>Aucun message</strong>
            </div>
          ) : (
            <ul role="list" className="admin-messages">
              {data.items.map((m) => (
                <li key={m.id} className={`admin-card admin-message ${m.is_handled ? 'admin-message--done' : ''}`}>
                  <div className="admin-message__head">
                    <span className="table__strong">{m.full_name}</span>
                    <a href={`tel:+221${m.phone}`}>{formatPhone(m.phone)}</a>
                    <span className="status status--progress">{m.subject_label}</span>
                    <span className="muted admin-small">{formatDate(m.created_at)}</span>
                  </div>
                  <p className="admin-message__body">{m.message}</p>
                  <div className="admin-actions">
                    <button type="button" className="link-btn" onClick={() => run(() => api.patch(`/admin/messages/${m.id}/`, { is_handled: !m.is_handled }))}>
                      {m.is_handled ? 'Marquer à traiter' : 'Marquer comme traité'}
                    </button>
                    <button
                      type="button"
                      className="link-btn admin-danger"
                      onClick={() => window.confirm('Supprimer ce message ?') && run(() => api.delete(`/admin/messages/${m.id}/`))}
                    >
                      Supprimer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      )}
    </>
  )
}
