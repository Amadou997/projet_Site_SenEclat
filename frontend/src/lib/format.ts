import type { Order } from './types'

const fcfa = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })

/** « 12 500 FCFA » : espace fine insécable, sans décimales (charte Sen Éclat). */
export function formatPrice(value: number): string {
  return `${fcfa.format(value).replace(/\s/g, ' ')} FCFA`
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
}

/** 771234567 → « 77 123 45 67 » */
export function formatPhone(phone: string): string {
  return phone.replace(/^(\d{2})(\d{3})(\d{2})(\d{2})$/, '$1 $2 $3 $4')
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`
}

/** Classe de pastille de statut (`.status--…`) pour chaque état de commande. */
export const ORDER_STATUS_CLASS: Record<Order['status'], string> = {
  preparing: 'status--progress',
  shipping: 'status--progress',
  delivered: 'status--ok',
  picked_up: 'status--ok',
  cancelled: 'status--out',
}
