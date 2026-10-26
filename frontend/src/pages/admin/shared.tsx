import { useEffect, useState, type ReactNode } from 'react'
import { ApiError } from '../../lib/api'

/** Valeur différée : évite une requête à chaque frappe dans les champs de recherche. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])
  return debounced
}

export function errorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  return error instanceof ApiError ? error.message : fallback
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="admin-toolbar">{children}</div>
}

export function Pager({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  if (pages <= 1) return <p className="admin-pager muted">{total} résultat{total > 1 ? 's' : ''}</p>
  return (
    <nav className="admin-pager" aria-label="Pagination">
      <span className="muted">
        {total} résultats — page {page} / {pages}
      </span>
      <button type="button" className="btn btn--outline btn--sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        Précédent
      </button>
      <button type="button" className="btn btn--outline btn--sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        Suivant
      </button>
    </nav>
  )
}

export function LoadState({ loading, error, onRetry }: { loading: boolean; error?: Error; onRetry: () => void }) {
  if (error) {
    return (
      <p role="alert" className="alert alert--error">
        {errorMessage(error, 'Chargement impossible.')}{' '}
        <button type="button" className="link-btn" onClick={onRetry}>
          Réessayer
        </button>
      </p>
    )
  }
  return loading ? <div className="skeleton" style={{ height: 240 }} aria-busy="true" /> : null
}

/** Message de confirmation éphémère après un enregistrement. */
export function useFlash(): [string | null, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null)
  useEffect(() => {
    if (!message) return
    const id = window.setTimeout(() => setMessage(null), 3000)
    return () => window.clearTimeout(id)
  }, [message])
  return [message, setMessage]
}
