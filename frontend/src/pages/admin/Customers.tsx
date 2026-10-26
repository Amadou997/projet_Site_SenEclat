import { useState } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { api } from '../../lib/api'
import { formatDate, formatPhone, formatPrice } from '../../lib/format'
import { Orders } from './Orders'
import { errorMessage, LoadState, Pager, Toolbar, useDebounced } from './shared'
import type { AdminCustomer, Paginated } from './types'

function CustomerDetail({ customer, onBack, onChange }: { customer: AdminCustomer; onBack: () => void; onChange: (c: AdminCustomer) => void }) {
  const [error, setError] = useState<string | null>(null)

  async function toggleActive() {
    const verb = customer.is_active ? 'Bloquer' : 'Réactiver'
    if (!window.confirm(`${verb} le compte de ${customer.first_name} ${customer.last_name} ?`)) return
    setError(null)
    try {
      onChange(await api.patch<AdminCustomer>(`/admin/customers/${customer.id}/`, { is_active: !customer.is_active }))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <>
      <button type="button" className="link-btn" onClick={onBack} style={{ alignSelf: 'flex-start' }}>
        ← Tous les clients
      </button>
      <section className="admin-card">
        <div className="admin-form__head">
          <h2 className="h2">
            {customer.first_name} {customer.last_name}
          </h2>
          <span className={`status ${customer.is_active ? 'status--ok' : 'status--out'}`}>{customer.is_active ? 'Actif' : 'Bloqué'}</span>
        </div>
        <dl className="profile-facts">
          <dt>E-mail</dt>
          <dd>{customer.email ?? '—'}</dd>
          <dt>Téléphone</dt>
          <dd>{customer.phone ? formatPhone(customer.phone) : '—'}</dd>
          <dt>Adresse</dt>
          <dd>
            {customer.address_line ? `${customer.address_line}, ${customer.address_zone}` : '—'}
            {customer.address_landmark && <span className="muted"> (repère : {customer.address_landmark})</span>}
          </dd>
          <dt>Inscrit le</dt>
          <dd>{formatDate(customer.date_joined)}</dd>
          <dt>Points fidélité</dt>
          <dd>{customer.loyalty_points}</dd>
          <dt>Commandes</dt>
          <dd>
            {customer.orders_count} — {formatPrice(customer.total_spent)} dépensés
          </dd>
        </dl>
        {!customer.is_staff && (
          <div>
            <button type="button" className={`btn btn--sm ${customer.is_active ? 'btn--outline admin-danger' : 'btn--primary'}`} onClick={toggleActive}>
              {customer.is_active ? 'Bloquer le compte' : 'Réactiver le compte'}
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="alert alert--error">
            {error}
          </p>
        )}
      </section>
      <h2 className="h3">Commandes du client</h2>
      <Orders customerId={customer.id} />
    </>
  )
}

export function Customers() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<AdminCustomer | null>(null)
  const search = useDebounced(q)
  const { data, loading, error, reload } = useAsync(
    () => api.get<Paginated<AdminCustomer>>('/admin/customers/', { query: { q: search, page } }),
    [search, page],
  )

  if (selected) {
    return (
      <CustomerDetail
        customer={selected}
        onBack={() => setSelected(null)}
        onChange={(c) => {
          setSelected(c)
          reload()
        }}
      />
    )
  }

  return (
    <>
      <Toolbar>
        <input
          className="input"
          type="search"
          placeholder="Nom, e-mail ou téléphone…"
          aria-label="Rechercher un client"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPage(1)
          }}
        />
      </Toolbar>
      {!data ? (
        <LoadState loading={loading} error={error} onRetry={reload} />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Client</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Inscription</th>
                  <th scope="col">Commandes</th>
                  <th scope="col">Total dépensé</th>
                  <th scope="col">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      Aucun client.
                    </td>
                  </tr>
                )}
                {data.items.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <button type="button" className="link-btn table__strong" onClick={() => setSelected(c)}>
                        {c.first_name} {c.last_name}
                      </button>
                    </td>
                    <td>
                      {c.email ?? ''}
                      {c.email && c.phone && <br />}
                      {c.phone ? formatPhone(c.phone) : ''}
                    </td>
                    <td>{formatDate(c.date_joined)}</td>
                    <td>{c.orders_count}</td>
                    <td className="price">{formatPrice(c.total_spent)}</td>
                    <td>
                      <span className={`status ${c.is_active ? 'status--ok' : 'status--out'}`}>{c.is_active ? 'Actif' : 'Bloqué'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      )}
    </>
  )
}
