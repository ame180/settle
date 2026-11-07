import type { MeResponse, PersonRef } from '@/api/types'

const LETTER = /\p{L}/u

export function getInitials(displayName: string): string {
  const initials = displayName
    .normalize('NFC')
    .split(/\s+/)
    .map((word) => word.match(LETTER)?.[0])
    .filter((initial) => initial !== undefined)
  if (initials.length === 0) {
    return '?'
  }

  const lastInitial = initials.length > 1 ? initials[initials.length - 1] : ''

  return (initials[0] + lastInitial).toUpperCase()
}

/** First name for chips and sentences: "Anna Kowalska" -> "Anna", "jan@x.pl" -> "jan". */
export function getShortName(displayName: string): string {
  const trimmed = displayName.trim()
  if (trimmed.includes('@') && !/\s/.test(trimmed)) {
    return trimmed.split('@')[0]
  }

  return trimmed.split(/\s+/)[0] || trimmed
}

/** "You" for the viewer, otherwise the person's display name. */
export function nameForViewer(person: Pick<PersonRef, 'id' | 'displayName'>, viewerId: number) {
  return person.id === viewerId ? 'You' : person.displayName
}

/** What others see for the signed-in user: their name, or their email until they add one. */
export function ownDisplayName(me: MeResponse): string {
  return me.name ?? me.email
}

/** "Anna", "Anna and Ewa", "Anna, Ewa and Tomasz". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) {
    return names.join('')
  }

  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** Everyone but the viewer, once each, in first-seen order. */
export function peopleOtherThan<Person extends Pick<PersonRef, 'id'>>(
  viewerId: number,
  people: Person[],
): Person[] {
  const others = new Map<number, Person>()
  for (const person of people) {
    if (person.id !== viewerId && !others.has(person.id)) {
      others.set(person.id, person)
    }
  }
  return [...others.values()]
}
