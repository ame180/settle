/** The `:userId` route param as a positive integer, or null when it isn't one. */
export function parseUserId(param: string | undefined): number | null {
  if (param === undefined || !/^[1-9]\d*$/.test(param)) {
    return null
  }
  return Number(param)
}
