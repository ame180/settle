/** An id from the route or query string as a positive integer, or null when it isn't one. */
export function parseIdParam(param: string | undefined): number | null {
  if (param === undefined || !/^[1-9]\d*$/.test(param)) {
    return null
  }
  return Number(param)
}
