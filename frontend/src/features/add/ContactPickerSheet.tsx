import { useState } from 'react'
import type { ContactListItem, PersonRef } from '@/api/types'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ContactOption } from './ContactOption'
import { recentContacts, searchContacts } from './contactOptions'

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
        <SheetHeader className="gap-3">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription className="sr-only">Pick a contact.</SheetDescription>
          <Input
            type="search"
            aria-label="Search contacts"
            placeholder="Search contacts"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </SheetHeader>
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
                <ContactOption
                  contact={contact}
                  selected={selected}
                  onClick={() => onPick(contact.person)}
                  className="px-4"
                />
              </li>
            )
          })}
        </ul>
      </SheetContent>
    </Sheet>
  )
}
