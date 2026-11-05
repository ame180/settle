import type { ExpenseDebtRequest, PersonRef, SplitType } from '@/api/types'
import { formatGrosze, fromGrosze, parseAmountInput, toGrosze } from '@/lib/money'
import { getShortName } from '@/lib/person'
import { calculateSplit, type SplitDebtInput } from '@/lib/split'

/**
 * Who paid and how the cost is shared, as the user is editing it. People are kept on the form;
 * this only holds ids. Each split type keeps its own inputs so switching back and forth between
 * the editor's tabs stays predictable.
 */
export type SplitDraft = {
  payerId: number
  type: SplitType
  /** Equal split: people who don't share the cost. New people join by default. */
  excluded: number[]
  /** Amounts, percentages or shares, as typed, keyed by person id. Missing or empty means 0. */
  values: Record<number, string>
}

export type SplitProblem =
  | { kind: 'invalid-value'; personId: number }
  | { kind: 'nobody' }
  | { kind: 'not-involved' }
  | { kind: 'no-amount' }
  | { kind: 'amounts'; assigned: bigint; total: bigint }
  | { kind: 'percent'; assigned: bigint }

export type SplitCheck =
  { ok: true; shares: Map<number, bigint> } | { ok: false; problem: SplitProblem }

export function defaultSplit(meId: number): SplitDraft {
  return { payerId: meId, type: 'equal', excluded: [], values: {} }
}

/** The value as the API wants it, or null when the input is 0 or empty (left out of debts). */
function positiveValue(raw: string | undefined): string | null | 'invalid' {
  if (raw === undefined || raw.trim() === '') {
    return null
  }

  const parsed = parseAmountInput(raw)
  if (parsed === null) {
    return 'invalid'
  }

  return toGrosze(parsed) > 0n ? parsed : null
}

/** The debts the API gets, in the people's order (the server's tie-break follows it). */
export function splitDebts(
  split: SplitDraft,
  peopleIds: number[],
): ExpenseDebtRequest[] | { invalid: number } {
  if (split.type === 'equal') {
    return peopleIds.filter((id) => !split.excluded.includes(id)).map((payerId) => ({ payerId }))
  }

  const debts: ExpenseDebtRequest[] = []
  for (const payerId of peopleIds) {
    const value = positiveValue(split.values[payerId])
    if (value === 'invalid') {
      return { invalid: payerId }
    }
    if (value !== null) {
      debts.push({ payerId, value })
    }
  }

  return debts
}

/** Checks the split the way the server will, and resolves each person's share in grosze. */
export function checkSplit(
  split: SplitDraft,
  peopleIds: number[],
  total: string | null,
  meId: number,
): SplitCheck {
  const debts = splitDebts(split, peopleIds)
  if (!Array.isArray(debts)) {
    return { ok: false, problem: { kind: 'invalid-value', personId: debts.invalid } }
  }
  if (debts.length === 0) {
    return { ok: false, problem: { kind: 'nobody' } }
  }
  if (split.payerId !== meId && !debts.some((debt) => debt.payerId === meId)) {
    return { ok: false, problem: { kind: 'not-involved' } }
  }
  if (split.type === 'percentage') {
    const assigned = sumValues(debts)
    if (assigned !== 10000n) {
      return { ok: false, problem: { kind: 'percent', assigned } }
    }
  }
  if (total === null || toGrosze(total) === 0n) {
    return { ok: false, problem: { kind: 'no-amount' } }
  }
  if (split.type === 'exact') {
    const assigned = sumValues(debts)
    if (assigned !== toGrosze(total)) {
      return { ok: false, problem: { kind: 'amounts', assigned, total: toGrosze(total) } }
    }
  }

  const shares = new Map<number, bigint>()
  for (const result of calculateSplit(split.type, total, debts as SplitDebtInput[])) {
    shares.set(result.payerId, toGrosze(result.amount))
  }

  return { ok: true, shares }
}

function sumValues(debts: ExpenseDebtRequest[]): bigint {
  return debts.reduce((sum, debt) => sum + toGrosze(debt.value ?? '0'), 0n)
}

/** Relative weight of each person under the current split; independent of the total. */
function splitWeights(split: SplitDraft, peopleIds: number[]): Map<number, string> {
  const weights = new Map<number, string>()
  for (const id of peopleIds) {
    if (split.type === 'equal') {
      if (!split.excluded.includes(id)) {
        weights.set(id, '1')
      }
      continue
    }
    const value = positiveValue(split.values[id])
    if (value !== null && value !== 'invalid') {
      weights.set(id, value)
    }
  }

  return weights
}

/** Distributes `total` (a decimal string) over the weights with the server's rounding. */
function distribute(total: string, weights: Map<number, string>): Map<number, bigint> {
  const results = calculateSplit(
    'shares',
    total,
    [...weights].map(([payerId, value]) => ({ payerId, value })),
  )

  return new Map(results.map((result) => [result.payerId, toGrosze(result.amount)]))
}

export function trimDecimal(value: string): string {
  return value.includes('.') ? value.replace(/\.?0+$/, '') : value
}

function gcd(a: bigint, b: bigint): bigint {
  return b === 0n ? a : gcd(b, a % b)
}

const MAX_SHARES = 99n

/** Whole-number shares in the same proportion, or 1 each when that would take silly numbers. */
function toWholeShares(weights: Map<number, string>): Map<number, bigint> {
  const scaled = new Map([...weights].map(([id, value]) => [id, toGrosze(value)]))
  const divisor = [...scaled.values()].reduce(gcd, 0n)
  const shares = new Map([...scaled].map(([id, value]) => [id, value / divisor]))
  const fits = [...shares.values()].every((share) => share <= MAX_SHARES)

  return fits ? shares : new Map([...weights.keys()].map((id) => [id, 1n]))
}

/**
 * Switching the editor's tab carries the current proportions over: Equal ticks whoever has a
 * share, % and Amounts distribute with the server's rounding, Shares finds whole numbers.
 */
export function convertSplit(
  split: SplitDraft,
  type: SplitType,
  peopleIds: number[],
  total: string | null,
): SplitDraft {
  if (type === split.type) {
    return split
  }

  const weights = splitWeights(split, peopleIds)
  const base: SplitDraft = { ...split, type, values: {} }

  if (type === 'equal') {
    return { ...base, excluded: peopleIds.filter((id) => !weights.has(id)) }
  }
  if (weights.size === 0) {
    return base
  }
  if (type === 'shares') {
    const shares = toWholeShares(weights)
    return { ...base, values: Object.fromEntries([...shares].map(([id, s]) => [id, String(s)])) }
  }
  if (type === 'percentage') {
    const percents = distribute('100.00', weights)
    return {
      ...base,
      values: Object.fromEntries([...percents].map(([id, p]) => [id, trimDecimal(formatPlain(p))])),
    }
  }
  if (total === null || toGrosze(total) === 0n) {
    return base
  }

  const amounts = distribute(total, weights)
  return {
    ...base,
    values: Object.fromEntries([...amounts].map(([id, amount]) => [id, formatPlain(amount)])),
  }
}

/** "1234.50", for input fields (no grouping, no currency). */
export function formatPlain(grosze: bigint): string {
  return fromGrosze(grosze)
}

/** 1:1 "Switch": the other person paid, and the shares swap with the roles. */
export function mirrorSplit(split: SplitDraft, meId: number, otherId: number): SplitDraft {
  const swap = (id: number) => (id === meId ? otherId : id === otherId ? meId : id)
  const values: Record<number, string> = {}
  for (const [id, value] of Object.entries(split.values)) {
    values[swap(Number(id))] = value
  }

  return {
    ...split,
    payerId: swap(split.payerId),
    excluded: split.excluded.map(swap),
    values,
  }
}

/** Keeps the split consistent when people are added or removed on the form. */
export function prunePeople(split: SplitDraft, peopleIds: number[], meId: number): SplitDraft {
  const values: Record<number, string> = {}
  for (const id of peopleIds) {
    if (split.values[id] !== undefined) {
      values[id] = split.values[id]
    }
  }

  return {
    ...split,
    payerId: peopleIds.includes(split.payerId) ? split.payerId : meId,
    excluded: split.excluded.filter((id) => peopleIds.includes(id)),
    values,
  }
}

type NamedPerson = Pick<PersonRef, 'id' | 'displayName'>

function nameOf(people: NamedPerson[], id: number, meId: number): string {
  if (id === meId) {
    return 'You'
  }

  return getShortName(people.find((person) => person.id === id)?.displayName ?? '')
}

export function joinNames(names: string[]): string {
  if (names.length <= 1) {
    return names.join('')
  }

  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

/** What the split card says: "Split equally", "Anna owes it all", "Split by amounts"… */
export function describeSplit(split: SplitDraft, people: NamedPerson[], meId: number): string {
  if (split.type === 'exact') {
    return 'Split by amounts'
  }
  if (split.type === 'percentage') {
    return 'Split by percentages'
  }
  if (split.type === 'shares') {
    return 'Split by shares'
  }

  const sharing = people.filter((person) => !split.excluded.includes(person.id))
  if (sharing.length === people.length) {
    return people.length === 2 ? 'Split equally' : `Split equally between ${people.length}`
  }
  if (sharing.length === 1) {
    const only = sharing[0].id
    return only === meId ? 'You owe it all' : `${nameOf(people, only, meId)} owes it all`
  }

  return `Split equally between ${sharing.length} of ${people.length}`
}

export type Outcome = {
  /** "Anna owes you", "You owe Anna", "You lent". */
  lead: string
  grosze: bigint
  tone: 'positive' | 'negative' | 'neutral'
  /** "Anna, Ewa and Tomasz owe you 60.00 zł each". */
  detail: string | null
}

/** The live line under the amount: what this expense means for the user. */
export function describeOutcome(
  shares: Map<number, bigint>,
  payerId: number,
  people: NamedPerson[],
  meId: number,
): Outcome {
  if (payerId !== meId) {
    const myShare = shares.get(meId) ?? 0n
    return {
      lead: `You owe ${nameOf(people, payerId, meId)}`,
      grosze: myShare,
      tone: 'negative',
      detail: null,
    }
  }

  const debtors = people.filter(
    (person) => person.id !== meId && (shares.get(person.id) ?? 0n) > 0n,
  )
  if (debtors.length === 0) {
    return { lead: 'Nobody owes you for this', grosze: 0n, tone: 'neutral', detail: null }
  }
  if (debtors.length === 1) {
    return {
      lead: `${nameOf(people, debtors[0].id, meId)} owes you`,
      grosze: shares.get(debtors[0].id) ?? 0n,
      tone: 'positive',
      detail: null,
    }
  }

  const amounts = debtors.map((person) => shares.get(person.id) ?? 0n)
  const lent = amounts.reduce((sum, amount) => sum + amount, 0n)
  const names = joinNames(debtors.map((person) => nameOf(people, person.id, meId)))
  const allSame = amounts.every((amount) => amount === amounts[0])

  return {
    lead: 'You lent',
    grosze: lent,
    tone: 'positive',
    detail: allSame ? `${names} owe you ${formatGrosze(amounts[0])} each` : null,
  }
}
