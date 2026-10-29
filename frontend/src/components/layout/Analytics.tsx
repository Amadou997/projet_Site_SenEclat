import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../../lib/api'
import { loadClarity, loadGa4, trackPageView } from '../../lib/analytics'
import type { StoreConfig } from '../../lib/types'

/** Charge GA4 et Clarity sur les pages publiques ; l'administration n'est jamais mesurée. */
export function Analytics() {
  const { pathname, search } = useLocation()
  const isAdmin = pathname.startsWith('/admin')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (isAdmin || ready) return
    api
      .get<StoreConfig>('/store/config/')
      .then((config) => {
        loadGa4(config.ga4_measurement_id)
        loadClarity(config.clarity_project_id)
        setReady(true)
      })
      .catch(() => {})
  }, [isAdmin, ready])

  useEffect(() => {
    if (!ready || isAdmin) return
    // Laisse la page mettre à jour son titre avant d'envoyer la page vue.
    const id = window.setTimeout(() => trackPageView(pathname + search), 300)
    return () => window.clearTimeout(id)
  }, [ready, isAdmin, pathname, search])

  return null
}
