import { z } from 'zod'
import { t } from '@lingui/core/macro'
import type { ExpenseCategory, ExpenseRequest, ExpenseResponse, PersonRef } from '@/api/types'
import {
  formatDecimal,
  formatGrosze,
  fromGrosze,
  MAX_AMOUNT_INTEGER_DIGITS,
  parseAmountInput,
  toGrosze,
} from '@/lib/money'
import { expenseCategories } from '@/lib/categories'
import { calendarDayKey } from '@/lib/dates'
import { trimDecimal } from '@/lib/decimal'
import { peopleOtherThan } from '@/lib/person'
import { choiceOf, repeatOf, type RepeatChoice } from '@/lib/repeat'
import { checkSplit, defaultSplit, splitDebts, type SplitDraft } from './splitModel'

/** The Add expense form, as typed. The user is always in it and isn't listed in `others`. */
export type ExpenseDraft = {
  others: PersonRef[]
  title: string
  category: ExpenseCategory
  /** Once the user picks a category, the title stops guessing it. */
  categoryPicked: boolean
  amount: string
  occurredOn: string
  /** Only the latest expense of a repeat can change it; an older one keeps it off. */
  repeat: RepeatChoice
  note: string
  split: SplitDraft
}

export type ExpenseField = 'people' | 'title' | 'amount' | 'split' | 'date' | 'note'

export type FieldErrors = Partial<Record<ExpenseField, string>>

/** Screen order, for jumping to the first error. */
export const expenseFieldOrder: ExpenseField[] = [
  'people',
  'title',
  'amount',
  'split',
  'date',
  'note',
]

export function emptyDraft(meId: number, occurredOn: string): ExpenseDraft {
  return {
    others: [],
    title: '',
    category: 'general',
    categoryPicked: false,
    amount: '',
    occurredOn,
    repeat: 'off',
    note: '',
    split: defaultSplit(meId),
  }
}

export function draftFromExpense(expense: ExpenseResponse, meId: number): ExpenseDraft {
  const others = peopleOtherThan(meId, [expense.payee, ...expense.debts.map((debt) => debt.payer)])
  const debtorIds = expense.debts.map((debt) => debt.payer.id)
  const peopleIds = [meId, ...others.map((person) => person.id)]
  const values: Record<number, string> = {}
  for (const debt of expense.debts) {
    const value = expense.splitType === 'exact' ? debt.amount : debt.splitValue
    if (value !== null) {
      values[debt.payer.id] = expense.splitType === 'exact' ? value : trimDecimal(value)
    }
  }

  return {
    others,
    title: expense.title,
    category: expense.category,
    categoryPicked: true,
    amount: expense.amount,
    occurredOn: calendarDayKey(expense.occurredOn),
    repeat: expense.series?.isLatest && expense.repeat?.active ? choiceOf(expense.repeat) : 'off',
    note: expense.description ?? '',
    split: {
      payerId: expense.payee.id,
      type: expense.splitType,
      excluded: peopleIds.filter((id) => !debtorIds.includes(id)),
      values,
    },
  }
}

const decimal = z
  .string()
  .regex(/^-?\d+(?:\.\d{1,2})?$/, { error: () => t`Use at most 2 decimal places` })
  .regex(new RegExp(`^-?\\d{1,${MAX_AMOUNT_INTEGER_DIGITS}}(?:\\.|$)`), {
    error: () => t`That amount is too large`,
  })
  .refine((value) => toGrosze(value) > 0n, { error: () => t`Enter an amount above 0` })

/** Mirrors ExpenseRequest / ExpenseDebtRequest validation in src/Dto. */
export const expenseRequestSchema = z.object({
  title: z
    .string()
    .min(1, { error: () => t`Add what it was for` })
    .max(255, { error: () => t`Keep the title under 255 characters` }),
  amount: decimal,
  payeeId: z.number().int().positive(),
  debts: z
    .array(z.object({ payerId: z.number().int().positive(), value: decimal.nullish() }))
    .min(1),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: () => t`Pick a date` }),
  splitType: z.enum(['exact', 'percentage', 'shares', 'equal']),
  category: z.enum(expenseCategories),
  description: z.string().nullish(),
  repeat: z.object({ unit: z.enum(['week', 'month', 'year']), every: z.number() }).nullish(),
})

/** Whether the user changed anything that gets saved; what other split types remember doesn't count. */
export function draftChanged(draft: ExpenseDraft, initial: ExpenseDraft): boolean {
  return savedFields(draft) !== savedFields(initial)
}

function savedFields(draft: ExpenseDraft): string {
  return JSON.stringify({
    ...draft,
    split: { ...draft.split, entered: undefined, seeded: undefined },
  })
}

export function peopleIds(draft: ExpenseDraft, meId: number): number[] {
  return [meId, ...draft.others.map((person) => person.id)]
}

/** The amount as a canonical decimal, or null while it isn't a usable amount. */
export function draftTotal(draft: ExpenseDraft): string | null {
  return amountTotal(draft.amount)
}

/** A typed amount as a canonical decimal, or null while it isn't a usable amount. */
export function amountTotal(amount: string): string | null {
  const parsed = parseAmountInput(amount)
  return parsed !== null && toGrosze(parsed) > 0n ? parsed : null
}

export function splitError(draft: ExpenseDraft, meId: number): string | null {
  const check = checkSplit(draft.split, peopleIds(draft, meId), draftTotal(draft), meId)
  if (check.ok) {
    return null
  }

  const { problem } = check
  switch (problem.kind) {
    case 'not-involved':
      return t`You need to pay or share in this expense.`
    case 'nobody':
      return t`Pick who shares the cost.`
    case 'invalid-value':
      return t`Check the numbers in the split.`
    case 'amounts': {
      const assigned = formatGrosze(problem.assigned)
      const total = formatGrosze(problem.total)
      return t`Adds up to ${assigned} of ${total}. Tap to fix.`
    }
    case 'percent': {
      const assigned = formatDecimal(fromGrosze(problem.assigned))
      return t`Adds up to ${assigned}%, not 100%. Tap to fix.`
    }
    case 'no-amount':
      return null
  }
}

/** What's wrong with a typed amount, by the API's rules, or null when it's fine. */
export function amountError(amount: string): string | null {
  if (amount.trim() === '') {
    return t`Enter an amount above 0`
  }
  const parsed = parseAmountInput(amount)
  if (parsed === null) {
    return /[.,]\d{3,}/.test(amount)
      ? t`Use at most 2 decimal places`
      : t`Enter an amount like 12.50`
  }
  const result = decimal.safeParse(parsed)

  return result.success ? null : result.error.issues[0].message
}

export type BuildResult = { ok: true; request: ExpenseRequest } | { ok: false; errors: FieldErrors }

/** Validates the form the way the server will and builds the request, or says what's wrong. */
export function buildExpenseRequest(draft: ExpenseDraft, meId: number): BuildResult {
  const errors: FieldErrors = {}
  if (draft.others.length === 0) {
    errors.people = t`Add who you split this with`
  }
  const title = draft.title.trim()
  if (title === '') {
    errors.title = t`Add what it was for`
  }
  const amount = amountError(draft.amount)
  if (amount) {
    errors.amount = amount
  }
  const split = draft.others.length > 0 ? splitError(draft, meId) : null
  if (split) {
    errors.split = split
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  const debts = splitDebts(draft.split, peopleIds(draft, meId))
  const candidate = {
    title,
    amount: draftTotal(draft),
    payeeId: draft.split.payerId,
    debts: Array.isArray(debts) ? debts : [],
    occurredOn: draft.occurredOn,
    // Always sent: the API resets an omitted splitType or category on edit.
    splitType: draft.split.type,
    category: draft.category,
    description: draft.note.trim() === '' ? null : draft.note.trim(),
    // Always sent: an omitted repeat stops it.
    repeat: repeatOf(draft.repeat),
  }
  const parsed = expenseRequestSchema.safeParse(candidate)
  if (!parsed.success) {
    return { ok: false, errors: zodErrors(parsed.error.issues) }
  }

  return { ok: true, request: parsed.data }
}

function zodErrors(issues: z.ZodError['issues']): FieldErrors {
  const errors: FieldErrors = {}
  for (const issue of issues) {
    const field = fieldForPath(issue.path.map(String).join('.')) ?? 'split'
    errors[field] ??= issue.message
  }

  return errors
}

/** Maps an API violation's propertyPath ("debts[0].value", "title") onto a form field. */
export function fieldForPath(propertyPath: string): ExpenseField | null {
  const root = propertyPath.split(/[.[]/)[0]
  switch (root) {
    case 'title':
      return 'title'
    case 'amount':
      return 'amount'
    case 'debts':
    case 'payeeId':
    case 'splitType':
      return 'split'
    case 'occurredOn':
    case 'repeat':
      return 'date'
    case 'description':
      return 'note'
    default:
      return null
  }
}
