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
