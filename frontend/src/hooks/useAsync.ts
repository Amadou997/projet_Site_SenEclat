import { useEffect, useState, type DependencyList } from 'react'
import { ApiError } from '../lib/api'

interface AsyncState<T> {
  data: T | undefined
  error: ApiError | Error | undefined
  loading: boolean
}

/**
 * Exécute une requête asynchrone liée à des dépendances. Les réponses obsolètes
 * (dépendances changées entre-temps) sont ignorées pour éviter les courses.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: undefined, error: undefined, loading: true })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: undefined }))
    fn().then(
      (data) => !cancelled && setState({ data, error: undefined, loading: false }),
      (error: Error) => !cancelled && setState({ data: undefined, error, loading: false }),
    )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  return { ...state, reload: () => setNonce((n) => n + 1) }
}
