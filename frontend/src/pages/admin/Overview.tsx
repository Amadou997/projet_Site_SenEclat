import { useState, type ReactNode } from 'react'
import { useAsync } from '../../hooks/useAsync'
import { api } from '../../lib/api'
import { formatDate, formatPrice, ORDER_STATUS_CLASS } from '../../lib/format'
import { AreaChart, BarList, CATEGORY_COLORS, SERIES_COLORS, SplitBar } from './Charts'
import { LoadState } from './shared'
import type { AdminStats } from './types'
import type { AdminSection } from './AdminPage'

const PERIODS = [7, 30, 90] as const
const formatInt = (v: number) => new Intl.NumberFormat('fr-FR').format(v).replace(/\s/g, ' ')
const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

/** Évolution par rapport à la période précédente de même durée (flèche + signe : jamais la couleur seule). */
function Delta({ now, before, days }: { now: number; before: number; days: number }) {
  if (before === 0 && now === 0) return <span className="kpi__hint">Aucune activité sur {days} j</span>
  if (before === 0) return <span className="kpi__hint">Nouveau sur la période</span>
  const pct = Math.round(((now - before) / before) * 100)
  const tone = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat'
  return (
    <span className="kpi__hint">
      <span className={`kpi__delta kpi__delta--${tone}`}>
        {pct > 0 ? '▲ +' : pct < 0 ? '▼ ' : '= '}
        {pct} %
      </span>{' '}
      vs {days} j précédents
    </span>
  )
}

function Kpi({ label, value, hint, onClick }: { label: string; value: string; hint?: ReactNode; onClick?: () => void }) {
  const body = (
    <>
      <span className="kpi__label">{label}</span>
      <span className="kpi__value">{value}</span>
      {hint && (typeof hint === 'string' ? <span className="kpi__hint">{hint}</span> : hint)}
      {onClick && <span className="kpi__link">Voir</span>}
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

function TodayItem({ label, value, onClick }: { label: string; value: number; onClick?: () => void }) {
  const body = (
    <>
      <span className="kpi__label">{label}</span>
      <span className="today__value">{formatInt(value)}</span>
    </>
  )
  return onClick ? (
    <button type="button" className="today__item today__item--link" onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="today__item">{body}</div>
  )
}

export function Overview({ go }: { go: (section: AdminSection) => void }) {
  const [days, setDays] = useState<number>(30)
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue')
  const { data, loading, error, reload } = useAsync(() => api.get<AdminStats>('/admin/stats/', { query: { days } }), [days])
  if (!data) return <LoadState loading={loading} error={error} onRetry={reload} />

  const { period, previous } = data
  const points = data.series.map((d) => ({
    date: d.date,
    value: metric === 'revenue' ? d.revenue : d.orders,
    detail: metric === 'revenue' ? plural(d.orders, 'commande') : formatPrice(d.revenue),
  }))

  return (
    <>
      <div className="admin-toolbar">
        <div className="segmented" role="group" aria-label="Période analysée">
          {PERIODS.map((p) => (
            <button key={p} type="button" className={`segmented__btn ${days === p ? 'segmented__btn--on' : ''}`} aria-pressed={days === p} onClick={() => setDays(p)}>
              {p} jours
            </button>
          ))}
        </div>
        {loading && <span className="muted admin-small">Mise à jour…</span>}
      </div>

      <div className="kpis kpis--3">
        <Kpi label="Chiffre d’affaires" value={formatPrice(period.revenue)} hint={<Delta now={period.revenue} before={previous.revenue} days={days} />} />
        <Kpi label="Commandes" value={formatInt(period.orders)} hint={<Delta now={period.orders} before={previous.orders} days={days} />} onClick={() => go('orders')} />
        <Kpi label="Panier moyen" value={formatPrice(period.average_basket)} hint={<Delta now={period.average_basket} before={previous.average_basket} days={days} />} />
        <Kpi
          label="Nouveaux clients"
          value={formatInt(period.customers_new)}
          hint={<Delta now={period.customers_new} before={previous.customers_new} days={days} />}
          onClick={() => go('customers')}
        />
        <Kpi label="Clients inscrits" value={formatInt(data.customers_total)} hint={`${formatPrice(data.revenue_total)} de ventes depuis l’ouverture`} onClick={() => go('customers')} />
        <Kpi label="Clients fidèles" value={`${data.repeat_customer_rate} %`} hint="des acheteurs ont commandé au moins 2 fois" />
      </div>

      <section className="admin-card today" aria-label="Aujourd’hui">
        <TodayItem label="Inscriptions aujourd’hui" value={data.today.registrations} />
        <TodayItem label="Connexions aujourd’hui" value={data.today.logins} />
        <TodayItem label="Commandes aujourd’hui" value={data.today.orders} />
        <TodayItem label="À préparer" value={data.orders_to_process} onClick={() => go('orders')} />
        <TodayItem label="Messages à traiter" value={data.messages_unhandled} onClick={() => go('messages')} />
      </section>

      <div className="admin-cols admin-cols--main">
        <section className="admin-card" aria-labelledby="chart-sales">
          <div className="viz-head">
            <h2 id="chart-sales" className="h3">
              {metric === 'revenue' ? 'Chiffre d’affaires' : 'Commandes'} par jour
            </h2>
            <div className="segmented segmented--sm" role="group" aria-label="Mesure affichée">
              <button type="button" className={`segmented__btn ${metric === 'revenue' ? 'segmented__btn--on' : ''}`} aria-pressed={metric === 'revenue'} onClick={() => setMetric('revenue')}>
                FCFA
              </button>
              <button type="button" className={`segmented__btn ${metric === 'orders' ? 'segmented__btn--on' : ''}`} aria-pressed={metric === 'orders'} onClick={() => setMetric('orders')}>
                Commandes
              </button>
            </div>
          </div>
          <AreaChart
            points={points}
            label={metric === 'revenue' ? 'Chiffre d’affaires par jour' : 'Commandes par jour'}
            format={metric === 'revenue' ? formatPrice : (v) => plural(v, 'commande')}
          />
          <details className="viz-table">
            <summary>Voir les données</summary>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Jour</th>
                    <th scope="col">Commandes</th>
                    <th scope="col">Chiffre d’affaires</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.series].reverse().map((d) => (
                    <tr key={d.date}>
                      <td>{formatDate(d.date)}</td>
                      <td>{d.orders}</td>
                      <td className="price">{formatPrice(d.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>

        <section className="admin-card" aria-labelledby="chart-shipping">
          <h2 id="chart-shipping" className="h3">
            Livraison ou retrait
          </h2>
          <SplitBar
            data={data.by_shipping.map((s, i) => ({
              key: s.key,
              label: s.key === 'pickup' ? 'Retrait en boutique' : 'Livraison à Dakar',
              value: s.orders,
              color: SERIES_COLORS[i % 2]!,
            }))}
            unit={(v) => plural(v, 'commande')}
          />
          <h2 className="h3">Statut des commandes</h2>
          <ul role="list" className="admin-list">
            {data.by_status.map((s) => (
              <li key={s.key}>
                <span className={`status ${ORDER_STATUS_CLASS[s.key]}`}>{s.label}</span>
                <span className="table__strong">{s.count}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="admin-cols">
        <section className="admin-card" aria-labelledby="chart-category">
          <h2 id="chart-category" className="h3">
            Ventes par catégorie
          </h2>
          <BarList
            data={data.by_category.map((c) => ({
              key: c.category,
              label: c.label,
              value: c.revenue,
              color: CATEGORY_COLORS[c.category] ?? '#8c8480',
              detail: plural(c.quantity, 'article'),
            }))}
            format={formatPrice}
            empty="Aucune vente sur la période."
          />
        </section>
        <section className="admin-card" aria-labelledby="chart-payment">
          <h2 id="chart-payment" className="h3">
            Moyens de paiement
          </h2>
          <BarList
            data={data.by_payment.map((p, i) => ({
              key: p.key,
              label: p.label,
              value: p.orders,
              color: SERIES_COLORS[i % SERIES_COLORS.length]!,
              detail: formatPrice(p.revenue),
            }))}
            format={(v) => plural(v, 'commande')}
            empty="Aucune commande sur la période."
          />
        </section>
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
