import { AnimatePresence, motion } from 'motion/react'
import { useId, useState, type ReactNode } from 'react'

export interface AccordionItem {
  title: string
  content: ReactNode
}

/** Accordéon accessible (aria-expanded / region) dont le panneau se déplie en douceur. */
export function Accordion({
  items,
  defaultOpen = 0,
  headingLevel = 2,
  variant = 'large',
}: {
  items: AccordionItem[]
  defaultOpen?: number
  headingLevel?: 2 | 3
  variant?: 'large' | 'compact'
}) {
  const [open, setOpen] = useState(defaultOpen)
  const baseId = useId()
  const Heading = `h${headingLevel}` as const

  return (
    <div className={`accordion accordion--${variant}`}>
      {items.map((item, index) => {
        const isOpen = open === index
        const panelId = `${baseId}-panel-${index}`
        const buttonId = `${baseId}-btn-${index}`
        return (
          <div key={item.title} className="accordion__item">
            <Heading className="accordion__heading">
              <button
                id={buttonId}
                type="button"
                className="accordion__trigger"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpen(isOpen ? -1 : index)}
              >
                {item.title}
                <motion.span
                  className="accordion__sign"
                  aria-hidden="true"
                  animate={{ rotate: isOpen ? 45 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  +
                </motion.span>
              </button>
            </Heading>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className="accordion__panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="accordion__content">{item.content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
