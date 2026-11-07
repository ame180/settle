import type * as React from 'react'
import { Check } from 'lucide-react'
import type { ContactListItem } from '@/api/types'
import { PersonAvatar } from '@/components/PersonAvatar'
import { cn } from '@/lib/utils'
import { balanceLine } from './contactOptions'

/** A pickable contact: avatar, name and balance, with a check when selected. */
export function ContactOption({
  contact,
  selected,
  onClick,
  className,
}: {
  contact: ContactListItem
  selected: boolean
  onClick: React.MouseEventHandler<HTMLButtonElement>
  className?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'flex min-h-15 w-full items-center gap-3 py-2 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset',
        selected && 'bg-subtle',
        className,
      )}
    >
      <PersonAvatar id={contact.person.id} name={contact.person.displayName} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{contact.person.displayName}</span>
        <span className="truncate text-[13px] text-muted-foreground">{balanceLine(contact)}</span>
      </span>
      {selected && <Check className="size-5.5 shrink-0" aria-hidden="true" />}
    </button>
  )
}
