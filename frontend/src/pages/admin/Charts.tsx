import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

/* Couleurs des séries : ordre fixe, une couleur suit toujours la même entité.
   Palette validée (daltonisme, contraste) ; l'or (< 3:1) est toujours accompagné de sa valeur écrite. */
export const SERIES_COLORS = ['#8a3a6c', '#c9a24a', '#1f8a5a', '#3b6fb6'] as const
export const CATEGORY_COLORS: Record<string, string> = {
  beaute: SERIES_COLORS[0],
  cosmetiques: SERIES_COLORS[1],
  lessive: SERIES_COLORS[2],
  nettoyage: SERIES_COLORS[3],
}

const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 })
export const formatCompact = (value: number) => compact.format(value).replace(/\s/g, ' ')

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry!.contentRect.width)))
    observer.observe(node)
    setWidth(node.clientWidth)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/** Graduation « ronde » : 0, pas, 2×pas… couvrant la valeur maximale. */
function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1]
  const raw = max / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw)!
  const ticks = []
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v)
  if (ticks[ticks.length - 1]! < max) ticks.push(ticks[ticks.length - 1]! + step)
  return ticks
}

export interface SeriesPoint {
  date: string
  value: number
  detail: string
}

/** Courbe aire mono-série, avec réticule et infobulle au survol (souris, tactile, clavier). */
export function AreaChart({ points, label, format }: { points: SeriesPoint[]; label: string; format: (v: number) => string }) {
  const [wrapRef, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const height = 300
  const m = { top: 16, right: 16, bottom: 30, left: 52 }
  const innerW = Math.max(0, width - m.left - m.right)
  const innerH = height - m.top - m.bottom
  const ticks = niceTicks(Math.max(0, ...points.map((p) => p.value)))
  const yMax = ticks[ticks.length - 1]!
  const x = (i: number) => m.left + (points.length > 1 ? (i / (points.length - 1)) * innerW : innerW / 2)
  const y = (v: number) => m.top + innerH - (v / yMax) * innerH

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('')
  const area = points.length ? `${line}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z` : ''
  const dateLabel = (iso: string) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(`${iso}T12:00:00`))
  const every = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(innerW / 80))))

  function pick(event: PointerEvent<SVGRectElement>) {
    const box = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - box.left) / box.width
    setActive(Math.min(points.length - 1, Math.max(0, Math.round(ratio * (points.length - 1)))))
  }
  function onKey(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const step = event.key === 'ArrowRight' ? 1 : -1
    setActive((i) => Math.min(points.length - 1, Math.max(0, (i ?? points.length - 1) + (i === null ? 0 : step))))
  }

  const current = active !== null ? points[active] : null
  return (
    <div ref={wrapRef} className="viz">
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${label} : courbe sur ${points.length} jours. Flèches gauche/droite pour parcourir les jours.`}
          tabIndex={0}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
          className="viz__svg"
        >
          <defs>
            <linearGradient id="viz-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={SERIES_COLORS[0]} stopOpacity="0.22" />
              <stop offset="100%" stopColor={SERIES_COLORS[0]} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} className="viz__grid" />
              <text x={m.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="viz__tick">
                {formatCompact(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) =>
            i % every === 0 || i === points.length - 1 ? (
              <text key={p.date} x={x(i)} y={height - 8} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} className="viz__tick">
                {dateLabel(p.date)}
              </text>
            ) : null,
          )}
          <path d={area} fill="url(#viz-area)" />
          <path d={line} fill="none" stroke={SERIES_COLORS[0]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {current && active !== null && (
            <g pointerEvents="none">
              <line x1={x(active)} x2={x(active)} y1={m.top} y2={y(0)} className="viz__crosshair" />
              <circle cx={x(active)} cy={y(current.value)} r="5" fill={SERIES_COLORS[0]} stroke="#fff" strokeWidth="2" />
            </g>
          )}
          <rect
            x={m.left}
            y={m.top}
            width={innerW}
            height={innerH}
            fill="transparent"
            onPointerMove={pick}
            onPointerDown={pick}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
      )}
      {current && active !== null && (
        <div
          className="viz__tooltip"
          role="status"
          style={{
            left: Math.min(Math.max(x(active), 90), width - 90),
            top: Math.max(0, y(current.value) - 12),
          }}
        >
          <span className="viz__tooltip-date">{dateLabel(current.date)}</span>
          <strong>{format(current.value)}</strong>
          <span>{current.detail}</span>
        </div>
      )}
    </div>
  )
}

export interface BarDatum {
  key: string
  label: string
  value: number
  color: string
  detail?: string
}

/** Barres horizontales étiquetées : libellé, barre, valeur écrite (jamais la couleur seule). */
export function BarList({ data, format, empty }: { data: BarDatum[]; format: (v: number) => string; empty: string }) {
  const max = Math.max(0, ...data.map((d) => d.value))
  if (max === 0) return <p className="muted">{empty}</p>
  return (
    <ul role="list" className="viz-bars">
      {data.map((d) => (
        <li key={d.key} className="viz-bars__row" title={`${d.label} : ${format(d.value)}${d.detail ? ` — ${d.detail}` : ''}`}>
          <span className="viz-bars__label">
            <span className="viz-bars__swatch" style={{ background: d.color }} aria-hidden="true" />
            {d.label}
          </span>
          <span className="viz-bars__track" aria-hidden="true">
            <span className="viz-bars__fill" style={{ width: `${(d.value / max) * 100}%`, background: d.color }} />
          </span>
          <span className="viz-bars__value">
            {format(d.value)}
            {d.detail && <span className="muted"> · {d.detail}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Répartition en une barre (parts d'un tout), segments séparés et légende chiffrée. */
export function SplitBar({ data, unit }: { data: BarDatum[]; unit: (v: number) => string }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) return <p className="muted">Aucune commande sur la période.</p>
  const shown = data.filter((d) => d.value > 0)
  return (
    <div className="viz-split">
      <div className="viz-split__bar" role="img" aria-label={shown.map((d) => `${d.label} ${Math.round((d.value / total) * 100)} %`).join(', ')}>
        {shown.map((d) => (
          <span key={d.key} style={{ flexGrow: d.value, background: d.color }} title={`${d.label} : ${unit(d.value)}`} />
        ))}
      </div>
      <ul role="list" className="viz-legend">
        {data.map((d) => (
          <li key={d.key}>
            <span className="viz-bars__swatch" style={{ background: d.color }} aria-hidden="true" />
            <span>{d.label}</span>
            <strong>{Math.round((d.value / total) * 100)} %</strong>
            <span className="muted">({unit(d.value)})</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
