/**
 * Clés d'accès des commandes passées sans compte, gardées le temps de la session
 * pour afficher la page de confirmation (jamais de données de paiement ici).
 */
const KEY = 'sen-eclat:order-keys'

function read(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function rememberOrderKey(number: string, accessKey: string) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...read(), [number]: accessKey }))
  } catch {
    /* stockage indisponible : la confirmation reste visible via l'état de navigation */
  }
}

export function orderKeyFor(number: string): string | undefined {
  return read()[number]
}
