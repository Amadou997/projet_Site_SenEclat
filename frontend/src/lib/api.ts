/**
 * Client HTTP de l'API Sen Éclat.
 *
 * Sécurité JWT :
 * - l'access token (15 min) vit UNIQUEMENT en mémoire (variable de module) : il n'est
 *   jamais écrit dans localStorage/sessionStorage, donc inaccessible à un script injecté
 *   qui lirait le stockage ;
 * - le refresh token est un cookie HttpOnly posé par Django : le JavaScript ne le voit
 *   jamais. Sur une réponse 401, le client appelle /auth/refresh/ une seule fois (les
 *   requêtes concurrentes partagent la même promesse) puis rejoue la requête.
 */
import type { SessionPayload } from './types'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  readonly status: number
  readonly errors?: Record<string, unknown>

  constructor(status: number, message: string, errors?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }

  /** Premier message d'erreur pour un champ de formulaire donné. */
  fieldError(field: string): string | undefined {
    const value = this.errors?.[field]
    if (Array.isArray(value)) return String(value[0])
    if (typeof value === 'string') return value
    return undefined
  }
}

let accessToken: string | null = null
let refreshInFlight: Promise<SessionPayload | null> | null = null
let onSessionChange: ((session: SessionPayload | null) => void) | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

/** Le contexte d'auth s'abonne pour rester synchronisé après un rafraîchissement silencieux. */
export function subscribeSession(listener: typeof onSessionChange) {
  onSessionChange = listener
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  query?: Record<string, string | number | boolean | string[] | undefined | null>
  /** Ne pas tenter de rafraîchir la session sur 401 (routes d'auth). */
  skipRefresh?: boolean
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(`${API_BASE}${path}`, window.location.origin)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '' || value === false) continue
    if (Array.isArray(value)) value.forEach((v) => url.searchParams.append(key, v))
    else url.searchParams.set(key, String(value))
  }
  return url.toString()
}

async function parse(response: Response) {
  if (response.status === 204) return null
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

async function rawRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, skipRefresh: _skip, headers, ...init } = options
  // Un FormData (envoi de fichier) est transmis tel quel : le navigateur pose lui-même le Content-Type multipart.
  const isForm = body instanceof FormData
  const response = await fetch(buildUrl(path, query), {
    ...init,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
  })

  const data = await parse(response).catch(() => null)
  if (!response.ok) {
    const message =
      (data && typeof data.detail === 'string' && data.detail) ||
      (response.status >= 500 ? 'Le service est momentanément indisponible.' : 'Une erreur est survenue.')
    throw new ApiError(response.status, message, data?.errors)
  }
  return data as T
}

/** Rafraîchit la session via le cookie HttpOnly. Une seule requête à la fois. */
export function refreshSession(): Promise<SessionPayload | null> {
  refreshInFlight ??= rawRequest<SessionPayload>('/auth/refresh/', { method: 'POST', skipRefresh: true })
    .then((session) => {
      accessToken = session.access
      onSessionChange?.(session)
      return session
    })
    .catch(() => {
      accessToken = null
      onSessionChange?.(null)
      return null
    })
    .finally(() => {
      refreshInFlight = null
    })
  return refreshInFlight
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, options)
  } catch (error) {
    const canRetry = error instanceof ApiError && error.status === 401 && !options.skipRefresh && accessToken !== null
    if (!canRetry) throw error
    const session = await refreshSession()
    if (!session) throw error
    return rawRequest<T>(path, options)
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T = null>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
}
