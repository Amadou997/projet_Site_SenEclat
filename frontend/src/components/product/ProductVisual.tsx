import { CATEGORY_IMAGE } from '../../config'
import type { CategorySlug } from '../../lib/types'
import { Sparkle } from '../Icons'

const VARIANTS = [
  { scale: 0.56, bg: 'radial-gradient(circle at 50% 42%, #fbf3e2 0%, var(--sable) 62%)' },
  { scale: 0.9, bg: 'radial-gradient(circle at 30% 30%, #f6e9cc 0%, #efe2c8 70%)' },
  { scale: 0.44, bg: 'linear-gradient(160deg, #f6eef2 0%, var(--sable) 70%)' },
  { scale: 0.7, bg: 'radial-gradient(circle at 70% 70%, #f3e4c3 0%, var(--sable) 65%)' },
]

/**
 * Visuel produit provisoire, aux couleurs de la marque, en attendant les photos
 * officielles : médaillon de l'univers concerné (extrait du logo) sur fond Sable.
 */
export function ProductVisual({
  category,
  imageUrl,
  view = 0,
  label = 'Visuel temporaire',
}: {
  category: CategorySlug
  imageUrl?: string
  view?: number
  label?: string
}) {
  if (imageUrl) {
    return <img className="pvisual__photo" src={imageUrl} alt="" loading="lazy" />
  }
  const v = VARIANTS[view % VARIANTS.length]!
  return (
    <div className="pvisual" style={{ background: v.bg }}>
      <span className="pvisual__ring" aria-hidden="true" />
      {/* Charte : les éléments du logo sont toujours posés sur fond Ébène. */}
      <span className="pvisual__medal" style={{ width: `${v.scale * 100}%` }}>
        <img src={CATEGORY_IMAGE[category]} alt="" loading="lazy" />
      </span>
      <span className="pvisual__spark" aria-hidden="true">
        <Sparkle size={16} />
      </span>
      <span className="pvisual__label">{label}</span>
    </div>
  )
}
