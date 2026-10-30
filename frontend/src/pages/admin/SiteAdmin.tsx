import { useState, type FormEvent } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { api, setAccessToken } from '../../lib/api'
import { formatDate, formatPhone, formatPrice } from '../../lib/format'
import { errorMessage, LoadState, Pager, Toolbar, useFlash } from './shared'
import type { AdminAccount, ContactMessage, Paginated, PromoCode, SiteSettings } from './types'

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

const EMPTY_ADMIN = { first_name: '', last_name: '', email: '', password: '', confirm: '' }

export function Admins() {
  const { data, loading, error: loadError, reload } = useAsync(() => api.get<Paginated<AdminAccount>>('/admin/admins/', { query: { page_size: 100 } }), [])
  const [form, setForm] = useState(EMPTY_ADMIN)
  const [flash, setFlash] = useFlash()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function create(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (form.password !== form.confirm) {
      setError('Les deux mots de passe ne sont pas identiques.')
      return
    }
    setPending(true)
    try {
      const { confirm: _confirm, ...payload } = form
      const created = await api.post<AdminAccount>('/admin/admins/', payload)
      setForm(EMPTY_ADMIN)
      setFlash(`Administrateur ${created.first_name} ${created.last_name} créé. Il peut se connecter avec cet e-mail.`)
      reload()
    } catch (err) {
      setError(errorMessage(err, 'Création impossible.'))
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      <form className="admin-card admin-form" onSubmit={create}>
        <h2 className="h3">Ajouter un administrateur</h2>
        <p className="muted">Ce compte aura accès à toute l’administration : commandes, clients, produits et réglages. Communiquez-lui le mot de passe de vive voix, puis demandez-lui de le changer dans « Mot de passe ».</p>
        <div className="grid-2">
          <label className="field">
            Prénom
            <input className="input" autoComplete="off" required maxLength={80} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </label>
          <label className="field">
            Nom
            <input className="input" autoComplete="off" required maxLength={80} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </label>
        </div>
        <label className="field">
          E-mail
          <input className="input" type="email" autoComplete="off" required maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <div className="grid-2">
          <label className="field">
            <span>
              Mot de passe <span className="field__hint">(8 caractères minimum, différent de l’e-mail et du nom)</span>
            </span>
            <input className="input" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          <label className="field">
            Confirmer le mot de passe
            <input className="input" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
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
            {pending ? 'Création…' : 'Créer l’administrateur'}
          </button>
        </div>
      </form>

      {data ? (
        <div className="table-wrap">
          <table className="table">
            <caption className="sr-only">Comptes administrateurs</caption>
            <thead>
              <tr>
                <th scope="col">Nom</th>
                <th scope="col">E-mail</th>
                <th scope="col">Créé le</th>
                <th scope="col">Dernière connexion</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((a) => (
                <tr key={a.id}>
                  <td className="table__strong">
                    {a.first_name} {a.last_name}
                  </td>
                  <td>{a.email}</td>
                  <td>{formatDate(a.date_joined)}</td>
                  <td>{a.last_login ? formatDate(a.last_login) : 'Jamais'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <LoadState loading={loading} error={loadError} onRetry={reload} />
      )}
    </>
  )
}

const EMPTY_PASSWORD = { current_password: '', new_password: '', confirm: '' }

export function Password() {
  const [form, setForm] = useState(EMPTY_PASSWORD)
  const [flash, setFlash] = useFlash()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function save(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (form.new_password !== form.confirm) {
      setError('Les deux nouveaux mots de passe ne sont pas identiques.')
      return
    }
    setPending(true)
    try {
      const session = await api.post<{ access: string }>('/auth/change-password/', {
        current_password: form.current_password,
        new_password: form.new_password,
      })
      setAccessToken(session.access)
      setForm(EMPTY_PASSWORD)
      setFlash('Mot de passe modifié. Vos autres appareils ont été déconnectés.')
    } catch (err) {
      setError(errorMessage(err, 'Modification impossible.'))
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="admin-card admin-form" onSubmit={save}>
      <label className="field">
        Mot de passe actuel
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          required
          value={form.current_password}
          onChange={(e) => setForm({ ...form, current_password: e.target.value })}
        />
      </label>
      <label className="field">
        <span>
          Nouveau mot de passe <span className="field__hint">(8 caractères minimum, différent de votre e-mail et de votre nom)</span>
        </span>
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={form.new_password}
          onChange={(e) => setForm({ ...form, new_password: e.target.value })}
        />
      </label>
      <label className="field">
        Confirmer le nouveau mot de passe
        <input
          className="input"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
        />
      </label>
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
          {pending ? 'Modification…' : 'Changer le mot de passe'}
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
/* Statistiques d'audience (Google Analytics 4, Microsoft Clarity)     */
/* ------------------------------------------------------------------ */

function AnalyticsForm({ initial }: { initial: SiteSettings }) {
  const [form, setForm] = useState({ ga4_measurement_id: initial.ga4_measurement_id, clarity_project_id: initial.clarity_project_id })
  const [saved, setSaved] = useState(form)
  const [flash, setFlash] = useFlash()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function save(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      const result = await api.patch<SiteSettings>('/admin/settings/', form)
      const next = { ga4_measurement_id: result.ga4_measurement_id, clarity_project_id: result.clarity_project_id }
      setForm(next)
      setSaved(next)
      setFlash('Identifiants enregistrés. La mesure démarre à la prochaine visite de la boutique.')
    } catch (err) {
      setError(errorMessage(err, 'Enregistrement impossible.'))
    } finally {
      setPending(false)
    }
  }

  const tools = [
    {
      name: 'Google Analytics 4',
      active: Boolean(saved.ga4_measurement_id),
      text: 'Visiteurs, pages vues, provenance du trafic, ajouts au panier et ventes (en FCFA).',
      href: 'https://analytics.google.com/analytics/web/',
      cta: 'Ouvrir Google Analytics',
    },
    {
      name: 'Microsoft Clarity',
      active: Boolean(saved.clarity_project_id),
      text: 'Cartes de chaleur et enregistrements de sessions pour voir comment les clients naviguent.',
      href: saved.clarity_project_id
        ? `https://clarity.microsoft.com/projects/view/${saved.clarity_project_id}/dashboard`
        : 'https://clarity.microsoft.com/',
      cta: 'Ouvrir Clarity',
    },
  ]

  return (
    <>
      <div className="grid-2">
        {tools.map((tool) => (
          <div key={tool.name} className="admin-card admin-form">
            <div className="admin-message__head">
              <span className="table__strong">{tool.name}</span>
              <span className={`status ${tool.active ? 'status--ok' : 'status--out'}`}>{tool.active ? 'Actif' : 'Non configuré'}</span>
            </div>
            <p className="muted">{tool.text}</p>
            <div>
              <a className="btn btn--outline btn--sm" href={tool.href} target="_blank" rel="noopener noreferrer">
                {tool.cta}
              </a>
            </div>
          </div>
        ))}
      </div>

      <form className="admin-card admin-form" onSubmit={save}>
        <div className="grid-2">
          <label className="field">
            <span>
              ID de mesure GA4 <span className="field__hint">(Admin › Flux de données › Web)</span>
            </span>
            <input
              className="input"
              placeholder="G-XXXXXXXXXX"
              maxLength={20}
              value={form.ga4_measurement_id}
              onChange={(e) => setForm({ ...form, ga4_measurement_id: e.target.value })}
            />
          </label>
          <label className="field">
            <span>
              ID de projet Clarity <span className="field__hint">(Paramètres › Présentation)</span>
            </span>
            <input
              className="input"
              placeholder="abcd1234ef"
              maxLength={20}
              value={form.clarity_project_id}
              onChange={(e) => setForm({ ...form, clarity_project_id: e.target.value })}
            />
          </label>
        </div>
        <p className="muted admin-small">
          Laissez un champ vide pour désactiver l’outil. Les pages d’administration ne sont jamais mesurées.
        </p>
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
            {pending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </>
  )
}

export function Analytics() {
  const { data, loading, error, reload } = useAsync(() => api.get<SiteSettings>('/admin/settings/'), [])
  return data ? <AnalyticsForm initial={data} /> : <LoadState loading={loading} error={error} onRetry={reload} />
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
