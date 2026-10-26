import type { ReactNode } from 'react'
import { Reveal } from '../motion/Reveal'

export function SectionHead({
  eyebrow,
  title,
  id,
  action,
}: {
  eyebrow: string
  title: ReactNode
  id: string
  action?: ReactNode
}) {
  return (
    <Reveal className="section-head">
      <div className="section-head__titles">
        <span className="eyebrow">{eyebrow}</span>
        <h2 id={id} className="h2">
          {title}
        </h2>
      </div>
      {action}
    </Reveal>
  )
}
