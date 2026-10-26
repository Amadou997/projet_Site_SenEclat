import { useAsync } from '../../hooks/useAsync'
import { api } from '../../lib/api'
import { formatDate, formatPrice, ORDER_STATUS_CLASS } from '../../lib/format'
import { LoadState } from './shared'
import type { AdminStats } from './types'
import type { AdminSection } from './AdminPage'

function Kpi({ label, value, hint, onClick }: { label: string; value: string; hint?: string; onClick?: () => void }) {
  const body = (
    <>
      <span className="kpi__label">{label}</span>
      <span className="kpi__value">{value}</span>
      {hint && <span className="kpi__hint">{hint}</span>}
    </>
  )
  return onClick ? (
    <button type="button" className="kpi kpi--link" onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="kpi">{body}</div>
  )
}

export function Overview({ go }: { go: (section: AdminSection) => void }) {
  const { data, loading, error, reload } = useAsync(() => api.get<AdminStats>('/admin/stats/'), [])
  if (!data) return <LoadState loading={loading} error={error} onRetry={reload} />

  return (
    <>
      <div className="kpis">
        <Kpi label="Chiffre d’affaires (30 j)" value={formatPrice(data.revenue_30d)} hint={`${formatPrice(data.revenue_total)} au total`} />
        <Kpi label="Commandes (30 j)" value={String(data.orders_30d)} hint={`Panier moyen ${formatPrice(data.average_basket)}`} />
        <Kpi
          label="À préparer"
          value={String(data.orders_to_process)}
          hint={`${data.orders_shipping} en livraison`}
          onClick={() => go('orders')}
        />
        <Kpi label="Clients" value={String(data.customers_total)} hint={`+${data.customers_30d} ces 30 jours`} onClick={() => go('customers')} />
        <Kpi
          label="Produits en ligne"
          value={`${data.products_active} / ${data.products_total}`}
          onClick={() => go('products')}
        />
        <Kpi
          label="Messages à traiter"
          value={String(data.messages_unhandled)}
          onClick={() => go('messages')}
        />
      </div>

      <div className="admin-cols">
        <section className="admin-card" aria-labelledby="low-stock">
          <h2 id="low-stock" className="h3">
            Stock bas
          </h2>
          {data.low_stock.length === 0 ? (
            <p className="muted">Aucun format sous le seuil de 5 unités.</p>
          ) : (
            <ul role="list" className="admin-list">
              {data.low_stock.map((v) => (
                <li key={v.sku}>
                  <span>
                    {v.product_name} <span className="muted">— {v.variant_label}</span>
                  </span>
                  <span className={`status ${v.stock === 0 ? 'status--out' : 'status--low'}`}>
                    {v.stock === 0 ? 'Épuisé' : `${v.stock} restant${v.stock > 1 ? 's' : ''}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="admin-card" aria-labelledby="top-products">
          <h2 id="top-products" className="h3">
            Meilleures ventes
          </h2>
          {data.top_products.length === 0 ? (
            <p className="muted">Aucune vente enregistrée.</p>
          ) : (
            <ol className="admin-list admin-list--ranked">
              {data.top_products.map((p) => (
                <li key={p.id}>
                  <span>{p.name}</span>
                  <span className="table__strong">{p.sales_count} vendus</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="table-wrap">
        <table className="table">
          <caption className="table__caption">Dernières commandes</caption>
          <thead>
            <tr>
              <th scope="col">Commande</th>
              <th scope="col">Client</th>
              <th scope="col">Date</th>
              <th scope="col">Statut</th>
              <th scope="col">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.recent_orders.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  Aucune commande pour le moment.
                </td>
              </tr>
            )}
            {data.recent_orders.map((o) => (
              <tr key={o.number}>
                <td className="table__strong">{o.number}</td>
                <td>
                  {o.first_name} {o.last_name}
                </td>
                <td>{formatDate(o.created_at)}</td>
                <td>
                  <span className={`status ${ORDER_STATUS_CLASS[o.status]}`}>{o.status_label}</span>
                </td>
                <td className="price">{formatPrice(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
