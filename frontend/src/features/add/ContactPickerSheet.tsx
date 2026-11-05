import { useState } from 'react'
import { Check } from 'lucide-react'
import type { ContactListItem, PersonRef } from '@/api/types'
import { PersonAvatar } from '@/components/PersonAvatar'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { balanceLine, recentContacts, searchContacts } from './contactOptions'

type ContactPickerSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  contacts: ContactListItem[] | undefined
  selectedId: number | null
  onPick: (person: PersonRef) => void
}

/** Picks one contact (the other side of a payment); search narrows the list. */
export function ContactPickerSheet({
  open,
  onOpenChange,
  title,
  contacts,
  selectedId,
  onPick,
}: ContactPickerSheetProps) {
  const [query, setQuery] = useState('')
  const all = contacts ?? []
  const rows = query.trim() === '' ? recentContacts(all, all.length) : searchContacts(all, query)

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        setQuery('')
        onOpenChange(next)
      }}
    >
      <SheetContent className="h-[80dvh]">
        <div className="flex flex-col gap-3 px-4 pt-2 pb-3">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="sr-only">Pick a contact.</SheetDescription>
          <input
            type="search"
            aria-label="Search contacts"
            placeholder="Search contacts"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 rounded-[10px] border border-border-strong bg-background px-3 text-base outline-none placeholder:text-muted-foreground focus:border-foreground focus:ring-[3px] focus:ring-foreground/10"
          />
        </div>
        <ul aria-label="Contacts" className="min-h-0 flex-1 overflow-y-auto border-t">
          {contacts === undefined && (
            <li className="px-4 py-3 text-muted-foreground">Loading contacts…</li>
          )}
          {contacts !== undefined && rows.length === 0 && (
            <li className="px-4 py-3 text-muted-foreground">
              {all.length === 0 ? 'No contacts yet.' : 'No contacts match.'}
            </li>
          )}
          {rows.map((contact) => {
            const selected = contact.person.id === selectedId
            return (
              <li key={contact.person.id} className="border-b last:border-b-0">
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onPick(contact.person)}
                  className={cn(
                    'flex min-h-15 w-full items-center gap-3 px-4 py-2 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset',
                    selected && 'bg-subtle',
                  )}
                >
                  <PersonAvatar id={contact.person.id} name={contact.person.displayName} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{contact.person.displayName}</span>
                    <span className="truncate text-[13px] text-muted-foreground">
                      {balanceLine(contact)}
                    </span>
                  </span>
                  {selected && <Check className="size-5.5 shrink-0" aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ul>
      </SheetContent>
    </Sheet>
  )
}
