import { t } from '@lingui/core/macro'
import type { Repeat } from '@/api/types'

export type RepeatChoice = 'off' | 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export const repeatChoices: RepeatChoice[] = ['off', 'weekly', 'biweekly', 'monthly', 'yearly']

const repeats: Record<Exclude<RepeatChoice, 'off'>, Repeat> = {
  weekly: { unit: 'week', every: 1 },
  biweekly: { unit: 'week', every: 2 },
  monthly: { unit: 'month', every: 1 },
  yearly: { unit: 'year', every: 1 },
}

export function repeatOf(choice: RepeatChoice): Repeat | null {
  return choice === 'off' ? null : repeats[choice]
}

/** Anything the picker can't show reads as off. */
export function choiceOf(repeat: Repeat | null): RepeatChoice {
  if (repeat === null) {
    return 'off'
  }
  const match = (Object.keys(repeats) as Exclude<RepeatChoice, 'off'>[]).find(
    (choice) => repeats[choice].unit === repeat.unit && repeats[choice].every === repeat.every,
  )
  return match ?? 'off'
}

/** The chip label: "Off", "Weekly", "Every 2 weeks", "Monthly", "Yearly". */
export function repeatChoiceLabel(choice: RepeatChoice): string {
  switch (choice) {
    case 'off':
      return t`Off`
    case 'weekly':
      return t`Weekly`
    case 'biweekly':
      return t`Every 2 weeks`
    case 'monthly':
      return t`Monthly`
    case 'yearly':
      return t`Yearly`
  }
}

/** On the latest expense: "Repeats monthly". */
export function repeatsLabel(repeat: Repeat): string {
  switch (choiceOf(repeat)) {
    case 'weekly':
      return t`Repeats weekly`
    case 'biweekly':
      return t`Repeats every 2 weeks`
    case 'yearly':
      return t`Repeats yearly`
    default:
      return t`Repeats monthly`
  }
}

/** On an older expense: "Part of a monthly repeat". */
export function partOfRepeatLabel(repeat: Repeat): string {
  switch (choiceOf(repeat)) {
    case 'weekly':
      return t`Part of a weekly repeat`
    case 'biweekly':
      return t`Part of a repeat every 2 weeks`
    case 'yearly':
      return t`Part of a yearly repeat`
    default:
      return t`Part of a monthly repeat`
  }
}

/** In the delete sheet of the latest expense. */
export function repeatStopsLabel(repeat: Repeat): string {
  switch (choiceOf(repeat)) {
    case 'weekly':
      return t`The weekly repeat stops too.`
    case 'biweekly':
      return t`The repeat every 2 weeks stops too.`
    case 'yearly':
      return t`The yearly repeat stops too.`
    default:
      return t`The monthly repeat stops too.`
  }
}
