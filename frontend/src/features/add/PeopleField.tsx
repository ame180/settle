import { useEffect, useId, useRef, useState, type RefObject } from 'react'
import { flushSync } from 'react-dom'
import { Check, Plus, UserPlus, X } from 'lucide-react'
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
  error?: string
  inputRef: RefObject<HTMLInputElement | null>
}

/**
 * "With": the user is a fixed chip, everyone else is picked from contacts or added by email.
 * Picking someone closes the list and the keyboard, so the rest of the form is back in view;
 * "Add person" reopens it with search for the next one.
 */
export function PeopleField({
  me,
  others,
  onChange,
  contacts,
  open,
  onOpenChange,
  error,
  inputRef,
}: PeopleFieldProps) {
  const [query, setQuery] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const listId = useId()
  const errorId = useId()
  const addContact = useAddContact()

  // A tap anywhere outside the field and its list closes it; that tap decides where focus goes.
  useEffect(() => {
    if (!open) {
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setQuery('')
        setAddError(null)
        onOpenChange(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, onOpenChange])

  const pickedIds = new Set(others.map((person) => person.id))
  const trimmedQuery = query.trim()
  const available = (contacts ?? []).filter((contact) => contact.person.id !== me.id)
  const rows =
    trimmedQuery === '' ? recentContacts(available, RECENT_LIMIT) : searchContacts(available, query)
  const exactEmailMatch = available.some(
    (contact) => contact.person.email.toLowerCase() === trimmedQuery.toLowerCase(),
  )
  const isOwnEmail = trimmedQuery.toLowerCase() === me.email.toLowerCase()
  const offerEmail = looksLikeEmail(trimmedQuery) && !exactEmailMatch && !isOwnEmail
  // The add-by-email request can finish after more people were picked or the list was closed;
  // it acts on the latest state.
  const othersRef = useRef(others)
  const openRef = useRef(open)
  useEffect(() => {
    othersRef.current = others
    openRef.current = open
  }, [others, open])

  // Synchronous so the focus happens inside the tap; iOS only opens the keyboard then.
  function openList() {
    flushSync(() => onOpenChange(true))
    inputRef.current?.focus()
  }

  /** Closes the list and drops the keyboard; focus lands on "Add person" for the next one. */
  function close() {
    setQuery('')
    setAddError(null)
    inputRef.current?.blur()
    flushSync(() => onOpenChange(false))
    addButtonRef.current?.focus({ preventScroll: true })
  }

  function toggle(person: PersonRef) {
    onChange(
      pickedIds.has(person.id)
        ? others.filter((other) => other.id !== person.id)
        : [...others, person],
    )
    close()
  }

  function addByEmail() {
    if (addContact.isPending) {
      return
    }
    setAddError(null)
    addContact.mutate(
      { email: trimmedQuery },
      {
        onSuccess: (contact) => {
          const latest = othersRef.current
          if (!latest.some((person) => person.id === contact.person.id)) {
            onChange([...latest, contact.person])
          }
          // Don't pull focus back if the user already closed the list while this was saving.
          if (openRef.current) {
            close()
          }
        },
        onError: (mutationError) => {
          setAddError(
            (mutationError instanceof ApiError &&
              (mutationError.violations[0]?.title ?? mutationError.detail)) ||
              'Couldn’t add this contact. Try again.',
          )
        },
      },
    )
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
        onClick={() => (open ? inputRef.current?.focus() : openList())}
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
        {open ? (
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
                  close()
                }
              }
              if (event.key === 'Escape') {
                close()
              }
            }}
            className="h-8 min-w-32 flex-1 bg-transparent px-1.5 text-base outline-none placeholder:text-muted-foreground"
          />
        ) : (
          <button
            ref={addButtonRef}
            type="button"
            aria-describedby={error ? errorId : undefined}
            onClick={(event) => {
              event.stopPropagation()
              openList()
            }}
            className="relative flex h-8 items-center gap-1 rounded-full border border-dashed border-border-strong pr-3 pl-2 text-[15px] font-medium after:absolute after:-inset-x-1 after:-inset-y-1.5 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:bg-secondary"
          >
            <Plus className="size-4.5" aria-hidden="true" />
            Add person
          </button>
        )}
      </div>
      {error && !open && <FieldError id={errorId} message={error} />}

      {open && (
        <div className="mt-1 overflow-hidden rounded-xl border bg-background shadow-[0_4px_16px_rgb(0_0_0/0.06)]">
          <p className="flex h-10 items-center px-3 text-[13px] font-medium text-muted-foreground">
            {trimmedQuery === '' ? 'Recent' : 'Contacts'}
          </p>
          <ul id={listId} aria-label="Contacts" className="border-t">
            {contacts === undefined && (
              <li className="px-3 py-3 text-sm text-muted-foreground">Loading contacts…</li>
            )}
            {rows.map((contact) => {
              const picked = pickedIds.has(contact.person.id)
              return (
                <li key={contact.person.id} className="border-b last:border-b-0">
                  <button
                    type="button"
                    aria-pressed={picked}
                    onClick={() => toggle(contact.person)}
                    className={cn(
                      'flex min-h-15 w-full items-center gap-3 px-3 py-2 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset',
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
                  </button>
                </li>
              )
            })}
          </ul>
          {contacts !== undefined && trimmedQuery !== '' && rows.length === 0 && (
            <p className="border-t px-3 py-3 text-[15px] text-muted-foreground">
              {isOwnEmail ? 'That’s your email. You’re always in it.' : 'No contacts match.'}
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
