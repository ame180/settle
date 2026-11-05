import type { ApiViolation } from '@/api/types'
import { ApiError } from '@/api/client'

/** Server violations on fields, plus whatever couldn't be placed on one. */
export function mapViolations<Field extends string>(
  violations: ApiViolation[],
  fieldFor: (propertyPath: string) => Field | null,
): { errors: Partial<Record<Field, string>>; unplaced: string[] } {
  const errors: Partial<Record<Field, string>> = {}
  const unplaced: string[] = []
  for (const violation of violations) {
    const field = fieldFor(violation.propertyPath)
    if (field) {
      errors[field] ??= violation.title
    } else {
      unplaced.push(violation.title)
    }
  }

  return { errors, unplaced }
}

/**
 * A failed save as field errors plus a banner message: validation problems go on their fields,
 * anything else (or nothing placeable) goes in the banner, falling back to `generic`.
 */
export function describeSaveError<Field extends string>(
  error: Error,
  fieldFor: (propertyPath: string) => Field | null,
  generic: string,
): { errors: Partial<Record<Field, string>>; banner: string | null } {
  if (!(error instanceof ApiError) || (error.status !== 400 && error.status !== 422)) {
    return { errors: {}, banner: generic }
  }

  const { errors, unplaced } = mapViolations(error.violations, fieldFor)
  if (Object.keys(errors).length > 0) {
    return { errors, banner: unplaced[0] ?? null }
  }
  return { errors, banner: unplaced[0] ?? error.detail ?? generic }
}
