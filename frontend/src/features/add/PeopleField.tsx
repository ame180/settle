import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import { Check, UserPlus, X } from 'lucide-react'
import { ApiError } from '@/api/client'
import { useAddContact } from '@/api/contacts'
import type { ContactListItem, MeResponse, PersonRef } from '@/api/types'
import { PersonAvatar } from '@/components/PersonAvatar'
import { getShortName } from '@/lib/person'
import { cn } from '@/lib/utils'
import { balanceLine, looksLikeEmail, recentContacts, searchContacts } from './contactOptions'
import { FieldError } from './formParts'

const RECENT_LIMIT = 6

type PeopleFieldProps = {
  me: MeResponse
  others: PersonRef[]
  onChange: (others: PersonRef[]) => void
  contacts: ContactListItem[] | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called when the user is done picking (Done, or a tap outside the list). */
  onDone: () => void
  error?: string
  inputRef: RefObject<HTMLInputElement | null>
}

/**
 * "With": the user is a fixed chip, everyone else is picked from contacts or added by email.
 * The list stays open so several people can be picked in a row.
 */
export function PeopleField({
  me,
  others,
  onChange,
  contacts,
  open,
  onOpenChange,
  onDone,
  error,
  inputRef,
}: PeopleFieldProps) {
  const [query, setQuery] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const errorId = useId()
  const addContact = useAddContact()

  // A tap anywhere outside the field and its list counts as Done.
  useEffect(() => {
    if (!open) {
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setQuery('')
        onDone()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, onDone])

  const pickedIds = new Set(others.map((person) => person.id))
  const trimmedQuery = query.trim()
  const available = (contacts ?? []).filter((contact) => contact.person.id !== me.id)
  const rows =
    trimmedQuery === '' ? recentContacts(available, RECENT_LIMIT) : searchContacts(available, query)
  const exactEmailMatch = available.some(
    (contact) => contact.person.email.toLowerCase() === trimmedQuery.toLowerCase(),
  )
  const offerEmail = looksLikeEmail(trimmedQuery) && !exactEmailMatch

  function toggle(person: PersonRef) {
    onChange(
      pickedIds.has(person.id)
        ? others.filter((other) => other.id !== person.id)
        : [...others, person],
    )
    setQuery('')
    inputRef.current?.focus()
  }

  function addByEmail() {
    setAddError(null)
    addContact.mutate(
      { email: trimmedQuery },
      {
        onSuccess: (contact) => {
          if (!pickedIds.has(contact.person.id)) {
            onChange([...others, contact.person])
          }
          setQuery('')
          inputRef.current?.focus()
        },
        onError: (mutationError) => {
          setAddError(
            mutationError instanceof ApiError && mutationError.violations.length > 0
              ? mutationError.violations[0].title
              : "Couldn't add this contact. Try again.",
          )
        },
      },
    )
  }

  function finish() {
    setQuery('')
    onDone()
  }

  return (
    <div ref={containerRef} className="flex flex-col gap-1.5">
      <label htmlFor={`${listId}-input`} className="text-sm font-medium">
        With
      </label>
      <div
        className={cn(
          'flex min-h-11 flex-wrap items-center gap-1.5 rounded-[10px] border border-border-strong bg-background p-1.5',
          open && 'border-foreground ring-[3px] ring-foreground/10',
          error && 'border-destructive ring-[3px] ring-destructive/15',
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <span className="flex h-8 items-center gap-1.5 rounded-full bg-secondary pr-3 pl-1 text-[15px]">
          <PersonAvatar id={me.id} name={me.name ?? me.email} size="sm" />
          You
        </span>
        {others.map((person) => (
          <span
            key={person.id}
            className="flex h-8 max-w-full items-center gap-1.5 rounded-full bg-secondary pl-1 text-[15px]"
          >
            <PersonAvatar id={person.id} name={person.displayName} size="sm" />
            <span className="truncate">{getShortName(person.displayName)}</span>
            <button
              type="button"
              aria-label={`Remove ${person.displayName}`}
              onClick={(event) => {
                event.stopPropagation()
                onChange(others.filter((other) => other.id !== person.id))
              }}
              className="-my-1.5 flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={`${listId}-input`}
          type="text"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="Name or email"
          value={query}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          onFocus={() => onOpenChange(true)}
          onChange={(event) => {
            setQuery(event.target.value)
            setAddError(null)
            onOpenChange(true)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Backspace' && query === '' && others.length > 0) {
              onChange(others.slice(0, -1))
            }
            if (event.key === 'Enter') {
              event.preventDefault()
              if (offerEmail) {
                addByEmail()
              } else if (trimmedQuery !== '' && rows.length === 1) {
                toggle(rows[0].person)
              } else if (trimmedQuery === '') {
                finish()
              }
            }
            if (event.key === 'Escape') {
              finish()
            }
          }}
          className="h-8 min-w-32 flex-1 bg-transparent px-1.5 text-base outline-none placeholder:text-muted-foreground"
        />
      </div>
      {error && !open && <FieldError id={errorId} message={error} />}

      {open && (
        <div className="mt-1 overflow-hidden rounded-xl border bg-background shadow-[0_4px_16px_rgb(0_0_0/0.06)]">
          <div className="flex h-11 items-center justify-between pr-1 pl-3">
            <span className="text-[13px] font-medium text-muted-foreground">
              {trimmedQuery === '' ? 'Recent' : 'Contacts'}
            </span>
            <button
              type="button"
              onClick={finish}
              className="h-11 rounded-full px-3 text-[15px] font-semibold focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              Done
            </button>
          </div>
          <ul
            id={listId}
            role="listbox"
            aria-multiselectable="true"
            aria-label="Contacts"
            className="border-t"
          >
            {contacts === undefined && (
              <li className="px-3 py-3 text-sm text-muted-foreground">Loading contacts…</li>
            )}
            {rows.map((contact) => {
              const picked = pickedIds.has(contact.person.id)
              return (
                <li
                  key={contact.person.id}
                  role="option"
                  aria-selected={picked}
                  onClick={() => toggle(contact.person)}
                  className={cn(
                    'flex min-h-15 cursor-pointer items-center gap-3 border-b px-3 py-2 last:border-b-0',
                    picked && 'bg-subtle',
                  )}
                >
                  <PersonAvatar id={contact.person.id} name={contact.person.displayName} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{contact.person.displayName}</span>
                    <span className="truncate text-[13px] text-muted-foreground">
                      {balanceLine(contact)}
                    </span>
                  </span>
                  {picked && <Check className="size-5.5 shrink-0" aria-hidden="true" />}
                </li>
              )
            })}
          </ul>
          {contacts !== undefined && trimmedQuery !== '' && rows.length === 0 && (
            <p className="border-t px-3 py-3 text-[15px] text-muted-foreground">
              No contacts match.
            </p>
          )}
          {contacts !== undefined && trimmedQuery === '' && rows.length === 0 && (
            <p className="border-t px-3 py-3 text-[15px] text-muted-foreground">
              No contacts yet. Type someone’s email to add them.
            </p>
          )}
          {offerEmail && (
            <button
              type="button"
              onClick={addByEmail}
              disabled={addContact.isPending}
              className="flex w-full items-center gap-3 border-t px-3 py-2.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset disabled:opacity-60"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary">
                <UserPlus className="size-5" aria-hidden="true" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="[overflow-wrap:anywhere]">
                  {addContact.isPending ? 'Adding…' : `Add ${trimmedQuery} as a new contact`}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  They can join Settle later. You can rename them.
                </span>
              </span>
            </button>
          )}
          {addError && <FieldError message={addError} className="border-t px-3 py-2.5" />}
          {trimmedQuery !== '' && !looksLikeEmail(trimmedQuery) && (
            <p className="border-t px-3 py-2.5 text-[13px] text-muted-foreground">
              Not in your contacts? Type their email.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
