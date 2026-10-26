import { Fragment, useState } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { api } from '../../lib/api'
import { formatDate, formatPhone, formatPrice, ORDER_STATUS_CLASS } from '../../lib/format'
import { errorMessage, LoadState, Pager, Toolbar, useDebounced } from './shared'
import { ORDER_STATUSES, PAYMENT_STATUSES, type AdminOrder, type Paginated } from './types'

function OrderDetail({ order, onChange }: { order: AdminOrder; onChange: (order: AdminOrder) => void }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const cancelled = order.status === 'cancelled'

  async function update(patch: Partial<Pick<AdminOrder, 'status' | 'payment_status'>>) {
    if (patch.status === 'cancelled' && !window.confirm('Annuler cette commande ? Les articles seront remis en stock.')) return
    setError(null)
    setPending(true)
    try {
      onChange(await api.patch<AdminOrder>(`/admin/orders/${order.number}/`, patch))
    } catch (err) {
      setError(errorMessage(err, 'Mise à jour impossible.'))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="admin-order">
      <div className="admin-order__grid">
        <section>
          <h3 className="admin-order__title">Client</h3>
          <p>
            {order.first_name} {order.last_name}
            <br />
            {formatPhone(order.phone)}
            {order.email && (
              <>
                <br />
                {order.email}
              </>
            )}
          </p>
        </section>
        <section>
          <h3 className="admin-order__title">{order.shipping_method_label}</h3>
          {order.shipping_method === 'delivery_dakar' ? (
            <p>
              {order.address_line}, {order.address_zone}
              {order.address_landmark && (
                <>
                  <br />
                  <span className="muted">Repère : {order.address_landmark}</span>
                </>
              )}
            </p>
          ) : (
            <p className="muted">Retrait en boutique</p>
          )}
        </section>
        <section>
          <h3 className="admin-order__title">Paiement</h3>
          <p>
            {order.payment_method_label}
            {order.promo_code && (
              <>
                <br />
                <span className="muted">Code {order.promo_code}</span>
              </>
            )}
          </p>
        </section>
      </div>

      <ul role="list" className="admin-list">
        {order.items.map((item) => (
          <li key={item.product_slug + item.variant_label}>
            <span>
              {item.quantity} × {item.product_name} <span className="muted">({item.variant_label})</span>
            </span>
            <span className="price">{formatPrice(item.line_total)}</span>
          </li>
        ))}
        <li>
          <span className="muted">
            Sous-total {formatPrice(order.subtotal)}
            {order.discount > 0 && ` · remise −${formatPrice(order.discount)}`} · livraison {formatPrice(order.shipping_fee)}
          </span>
          <span className="table__strong">{formatPrice(order.total)}</span>
        </li>
      </ul>

      <div className="admin-order__controls">
        <label className="field">
          Statut de la commande
          <select className="select" value={order.status} disabled={pending || cancelled} onChange={(e) => update({ status: e.target.value as AdminOrder['status'] })}>
            {ORDER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Statut du paiement
          <select
            className="select"
            value={order.payment_status}
            disabled={pending}
            onChange={(e) => update({ payment_status: e.target.value as AdminOrder['payment_status'] })}
          >
            {PAYMENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p role="alert" className="alert alert--error">
          {error}
        </p>
      )}
    </div>
  )
}

export function Orders({ customerId }: { customerId?: number }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<string | null>(null)
  const [updated, setUpdated] = useState<Record<string, AdminOrder>>({})
  const search = useDebounced(q)

  const { data, loading, error, reload } = useAsync(
    () => api.get<Paginated<AdminOrder>>('/admin/orders/', { query: { q: search, status, page, customer: customerId } }),
    [search, status, page, customerId],
  )

  return (
    <>
      {customerId === undefined && (
        <Toolbar>
          <input
            className="input"
            type="search"
            placeholder="N°, nom, téléphone, e-mail…"
            aria-label="Rechercher une commande"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
          />
          <select
            className="select"
            aria-label="Statut"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">Tous les statuts</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Toolbar>
      )}

      {!data ? (
        <LoadState loading={loading} error={error} onRetry={reload} />
      ) : (
        <>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Commande</th>
                  <th scope="col">Date</th>
                  <th scope="col">Client</th>
                  <th scope="col">Statut</th>
                  <th scope="col">Paiement</th>
                  <th scope="col">Total</th>
                  <th scope="col">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="muted">
                      Aucune commande.
                    </td>
                  </tr>
                )}
                {data.items.map((row) => {
                  const o = updated[row.number] ?? row
                  const isOpen = open === o.number
                  return (
                    <Fragment key={o.number}>
                      <tr>
                        <td className="table__strong">{o.number}</td>
                        <td>{formatDate(o.created_at)}</td>
                        <td>
                          {o.first_name} {o.last_name}
                          <br />
                          <span className="muted admin-small">{formatPhone(o.phone)}</span>
                        </td>
                        <td>
                          <span className={`status ${ORDER_STATUS_CLASS[o.status]}`}>{o.status_label}</span>
                        </td>
                        <td>
                          {o.payment_method_label}
                          <br />
                          <span className="muted admin-small">{o.payment_status_label}</span>
                        </td>
                        <td className="price">{formatPrice(o.total)}</td>
                        <td>
                          <button type="button" className="link-btn" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : o.number)}>
                            {isOpen ? 'Fermer' : 'Gérer'}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="admin-row-detail">
                          <td colSpan={7}>
                            <OrderDetail order={o} onChange={(next) => setUpdated((u) => ({ ...u, [next.number]: next }))} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
