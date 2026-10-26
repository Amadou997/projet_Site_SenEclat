import catBeaute from './assets/brand/cat-beaute.webp'
import catCosmetiques from './assets/brand/cat-cosmetiques.webp'
import catLessive from './assets/brand/cat-lessive.webp'
import catNettoyage from './assets/brand/cat-nettoyage.webp'
import type { CategorySlug } from './lib/types'

/** Numéro WhatsApp au format international sans « + » (surchargeable via VITE_WHATSAPP_NUMBER). */
export const WHATSAPP_NUMBER: string = import.meta.env.VITE_WHATSAPP_NUMBER || '221779893535'

/** « +221 77 989 35 35 » pour l'affichage. */
export const WHATSAPP_DISPLAY = `+${WHATSAPP_NUMBER}`.replace(/^\+221(\d{2})(\d{3})(\d{2})(\d{2})$/, '+221 $1 $2 $3 $4')

export function whatsappLink(message = 'Bonjour Sen Éclat, j’ai une question.') {
  return WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}` : '/maison#contact'
}

export const CATEGORIES: { slug: CategorySlug; name: string; hint: string; image: string }[] = [
  { slug: 'beaute', name: 'Beauté', hint: 'Soins visage, corps et cheveux', image: catBeaute },
  { slug: 'cosmetiques', name: 'Cosmétiques', hint: 'Crèmes, baumes et textures', image: catCosmetiques },
  { slug: 'lessive', name: 'Lessive', hint: 'Lessives et soin du linge', image: catLessive },
  { slug: 'nettoyage', name: 'Nettoyage', hint: 'Entretien de la maison', image: catNettoyage },
]

export const CATEGORY_IMAGE: Record<CategorySlug, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c.image]),
) as Record<CategorySlug, string>
