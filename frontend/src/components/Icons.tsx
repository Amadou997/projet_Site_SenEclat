import type { SVGProps } from 'react'

/** Icônes du système de design : trait 1,5 px, angles arrondis, `currentColor`. */
type IconProps = SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }

function Stroke({ size = 22, strokeWidth = 1.5, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export const SPARKLE_PATH = 'M12 1c.7 6.6 4.4 10.3 11 11-6.6.7-10.3 4.4-11 11-.7-6.6-4.4-10.3-11-11C7.6 11.3 11.3 7.6 12 1Z'

/** Étoile à quatre branches : la signature « éclat » de la marque. */
export function Sparkle({ size = 22, ...rest }: Omit<IconProps, 'strokeWidth'>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...rest}>
      <path d={SPARKLE_PATH} />
    </svg>
  )
}

export const SearchIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Stroke>
)
export const UserIcon = (p: IconProps) => (
  <Stroke {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </Stroke>
)
export const BagIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M5 8h14l-1.2 12H6.2L5 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </Stroke>
)
export const TruckIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M2 7h12v9H2zM14 10h4l3 3v3h-7" />
    <circle cx="6" cy="18" r="1.8" />
    <circle cx="17" cy="18" r="1.8" />
  </Stroke>
)
export const StoreIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M3 9l1.5-5h15L21 9M3 9h18v11H3zM9 20v-6h6v6" />
  </Stroke>
)
export const PhoneIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="6" y="2" width="12" height="20" rx="2" />
    <path d="M10 18h4" />
  </Stroke>
)
export const WhatsAppIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19l-4 1Z" />
    <path d="M9 10c0 3 2 5 5 5l1.2-1.2-2-1-1 .8c-1-.4-1.6-1-2-2l.8-1-1-2L9 10Z" />
  </Stroke>
)
export const LockIcon = (p: IconProps) => (
  <Stroke {...p}>
    <rect x="5" y="11" width="14" height="10" rx="1" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Stroke>
)
export const MenuIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Stroke>
)
export const CloseIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Stroke>
)
export const ArrowRight = (p: IconProps) => (
  <Stroke strokeWidth={1.8} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Stroke>
)
export const ArrowLeft = (p: IconProps) => (
  <Stroke strokeWidth={1.8} {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Stroke>
)
export const PlusIcon = (p: IconProps) => (
  <Stroke strokeWidth={1.8} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Stroke>
)
export const AlertIcon = (p: IconProps) => (
  <Stroke strokeWidth={1.8} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v6M12 16.5v.5" />
  </Stroke>
)
export const ChevronRight = (p: IconProps) => (
  <Stroke strokeWidth={1.8} {...p}>
    <path d="m9 6 6 6-6 6" />
  </Stroke>
)
export const FilterIcon = (p: IconProps) => (
  <Stroke {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Stroke>
)
