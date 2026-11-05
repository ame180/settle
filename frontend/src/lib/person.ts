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
