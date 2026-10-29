/**
 * Mesure d'audience : Google Analytics 4 et Microsoft Clarity.
 * Les identifiants viennent des paramètres du site (tableau de bord › Statistiques) ;
 * sans identifiant, aucun script tiers n'est chargé.
 */

type Gtag = (...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[] }
  }
}

const loaded = new Set<string>()

function inject(src: string) {
  const script = document.createElement('script')
  script.async = true
  script.src = src
  document.head.appendChild(script)
}

export function loadGa4(measurementId: string) {
  if (!measurementId || loaded.has(measurementId)) return
  loaded.add(measurementId)
  window.dataLayer = window.dataLayer || []
  // gtag doit pousser l'objet `arguments` lui-même, pas un tableau.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag('js', new Date())
  // Application monopage : les pages vues sont envoyées à chaque changement de route.
  window.gtag('config', measurementId, { send_page_view: false })
  inject(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`)
}

export function loadClarity(projectId: string) {
  if (!projectId || loaded.has(`clarity:${projectId}`)) return
  loaded.add(`clarity:${projectId}`)
  if (!window.clarity) {
    const queue = function clarity(...args: unknown[]) {
      ;(queue.q = queue.q || []).push(args)
    } as NonNullable<Window['clarity']>
    window.clarity = queue
  }
  inject(`https://www.clarity.ms/tag/${encodeURIComponent(projectId)}`)
}

export function trackPageView(path: string) {
  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  })
}

/** Évènement GA4 (ex. add_to_cart, purchase) ; sans effet si GA4 n'est pas actif. */
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  window.gtag?.('event', name, params)
}
