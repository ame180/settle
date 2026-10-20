export function getInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return '?'
  }

  const firstInitial = Array.from(words[0])[0]
  const lastInitial = words.length > 1 ? Array.from(words[words.length - 1])[0] : ''

  return (firstInitial + lastInitial).toUpperCase()
}
