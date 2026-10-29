import type { ReactElement, ReactNode } from 'react'
import { Stroke, type IconProps } from '../../components/Icons'

/* Icônes de l'administration : même tracé que le système de design (trait 1,5 px, currentColor). */

export const DashboardIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Stroke>
)

export const BoxIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m21 8-9-5-9 5 9 5 9-5Z" />
    <path d="M3 8v8l9 5 9-5V8" />
    <path d="M12 13v8" />
  </Stroke>
)

export const ReceiptIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3Z" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </Stroke>
)

export const UsersIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
  </Stroke>
)

export const TagIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9-9-9Z" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </Stroke>
)

export const MailIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </Stroke>
)

export const ChartIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M3 3v18h18" />
    <path d="m7 15 4-4 3 3 6-6" />
    <path d="M16 8h4v4" />
  </Stroke>
)

export const SettingsIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </Stroke>
)

export const CoinsIcon = (p: IconProps) => (
  <Stroke {...p}>
    <ellipse cx="9" cy="6" rx="6" ry="3" />
    <path d="M3 6v4c0 1.7 2.7 3 6 3s6-1.3 6-3V6" />
    <path d="M3 10v4c0 1.7 2.7 3 6 3 1 0 1.9-.1 2.7-.3" />
    <circle cx="17" cy="16" r="4" />
  </Stroke>
)

export const BasketIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M3 9h18l-2 11H5L3 9Z" />
    <path d="m8 9 4-6 4 6" />
    <path d="M9 13v3M15 13v3" />
  </Stroke>
)

export const UserPlusIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="10" cy="8" r="4" />
    <path d="M3 21a7 7 0 0 1 12.5-4.3" />
    <path d="M19 14v6M16 17h6" />
  </Stroke>
)

export const UserHeartIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="10" cy="8" r="4" />
    <path d="M3 21a7 7 0 0 1 10-6.3" />
    <path d="M18.5 21s-3.5-2-3.5-4.4a1.8 1.8 0 0 1 3.5-.7 1.8 1.8 0 0 1 3.5.7c0 2.4-3.5 4.4-3.5 4.4Z" />
  </Stroke>
)

export const LoginIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
    <path d="M3 12h12M11 8l4 4-4 4" />
  </Stroke>
)

export const CartIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="9" cy="20" r="1.5" />
    <circle cx="18" cy="20" r="1.5" />
    <path d="M2 3h3l2.7 12.2a1 1 0 0 0 1 .8h9.6a1 1 0 0 0 1-.8L21 7H6" />
  </Stroke>
)

export const PackageClockIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M20 9V8l-8-5-8 5v8l8 5 1-.6" />
    <path d="m4 8 8 5 8-5M12 13v8" />
    <circle cx="18" cy="17" r="4" />
    <path d="M18 15.5V17l1 1" />
  </Stroke>
)

export const TruckFastIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="17" cy="18" r="2" />
  </Stroke>
)

export const CardIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20M6 15h4" />
  </Stroke>
)

export const LayersIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 13 9 5 9-5" />
  </Stroke>
)

export const StockAlertIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </Stroke>
)

export const TrophyIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
    <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" />
  </Stroke>
)

export const ListIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M9 6h12M9 12h12M9 18h12" />
    <circle cx="4" cy="6" r="1" />
    <circle cx="4" cy="12" r="1" />
    <circle cx="4" cy="18" r="1" />
  </Stroke>
)

export type IconTone = 'prune' | 'or' | 'vert' | 'bleu' | 'neutre'

/** Pastille d'icône teintée (fond doux + icône pleine teinte) : repère visuel, jamais seul porteur du sens. */
export function IconBadge({ icon: Icon, tone = 'prune', size = 'md' }: { icon: (p: IconProps) => ReactElement; tone?: IconTone; size?: 'sm' | 'md' }) {
  return (
    <span className={`icon-badge icon-badge--${tone} icon-badge--${size}`} aria-hidden="true">
      <Icon size={size === 'sm' ? 18 : 22} />
    </span>
  )
}

/** Titre de carte : pastille d'icône + intitulé. */
export function CardTitle({ id, icon, tone, children }: { id?: string; icon: (p: IconProps) => ReactElement; tone?: IconTone; children: ReactNode }) {
  return (
    <div className="card-title">
      <IconBadge icon={icon} tone={tone} size="sm" />
      <h2 id={id} className="h3">
        {children}
      </h2>
    </div>
  )
}
