import type { ExpenseDebtRequest, PersonRef, SplitType } from '@/api/types'
import { formatGrosze, fromGrosze, parseAmountInput, toGrosze } from '@/lib/money'
import { trimDecimal } from '@/lib/decimal'
import { getShortName, joinNames } from '@/lib/person'
import { calculateSplit, type SplitDebtInput } from '@/lib/split'

/**
 * Who paid and how the cost is shared, as the user is editing it. People are kept on the form;
 * this only holds ids. Each split type keeps what the user entered in it, so switching back to a
 * type restores their exact values instead of a rounded conversion.
 */
export type SplitDraft = {
  payerId: number
  type: SplitType
  /** Equal split: people who don't share the cost. New people join by default. */
  excluded: number[]
  /** Amounts, percentages or shares, as typed, keyed by person id. Missing or empty means 0. */
  values: Record<number, string>
  /** What the user entered in the other split types, restored when they switch back. */
  entered?: Partial<Record<SplitType, SplitEntries>>
  /** The current values were converted from another type and the user hasn't touched them. */
  seeded?: boolean
}

type SplitEntries = Pick<SplitDraft, 'excluded' | 'values'>

export type SplitProblem =
  | { kind: 'invalid-value'; personId: number }
  | { kind: 'nobody' }
  | { kind: 'not-involved' }
  | { kind: 'no-amount' }
  | { kind: 'amounts'; assigned: bigint; total: bigint }
  | { kind: 'percent'; assigned: bigint }

export type SplitCheck =
  { ok: true; shares: Map<number, bigint> } | { ok: false; problem: SplitProblem }

/** Everyone shares equally; nothing the user entered, so switching type converts from it. */
export function defaultSplit(meId: number): SplitDraft {
  return { payerId: meId, type: 'equal', excluded: [], values: {}, seeded: true }
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

function gcd(a: bigint, b: bigint): bigint {
  return b === 0n ? a : gcd(b, a % b)
}

/** The shares stepper's ceiling. */
export const MAX_SHARES = 99

/**
 * Whole-number shares in the same proportion. When the exact ratio needs more than MAX_SHARES,
 * the smallest weight becomes 1 share and the rest round to the nearest whole share.
 */
function toWholeShares(weights: Map<number, string>): Map<number, bigint> {
  const max = BigInt(MAX_SHARES)
  const scaled = new Map([...weights].map(([id, value]) => [id, toGrosze(value)]))
  const divisor = [...scaled.values()].reduce(gcd, 0n)
  const exact = new Map([...scaled].map(([id, value]) => [id, value / divisor]))
  if ([...exact.values()].every((share) => share <= max)) {
    return exact
  }

  const smallest = [...scaled.values()].reduce((a, b) => (b < a ? b : a))
  return new Map(
    [...scaled].map(([id, value]) => {
      const rounded = (value * 2n + smallest) / (smallest * 2n)
      return [id, rounded > max ? max : rounded]
    }),
  )
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
      values: Object.fromEntries([...percents].map(([id, p]) => [id, trimDecimal(fromGrosze(p))])),
    }
  }
  if (total === null || toGrosze(total) === 0n) {
    return base
  }

  const amounts = distribute(total, weights)
  return {
    ...base,
    values: Object.fromEntries([...amounts].map(([id, amount]) => [id, fromGrosze(amount)])),
  }
}

/** The user changed the current type's values: they're now theirs to keep. */
export function editSplit(split: SplitDraft, change: Partial<SplitEntries>): SplitDraft {
  return { ...split, ...change, seeded: false }
}

/**
 * The editor's tabs. A type the user entered values in comes back exactly as they left it; any
 * other type is seeded by converting the current split.
 */
export function switchSplitType(
  split: SplitDraft,
  type: SplitType,
  peopleIds: number[],
  total: string | null,
): SplitDraft {
  if (type === split.type) {
    return split
  }

  const entered = split.seeded
    ? { ...split.entered }
    : { ...split.entered, [split.type]: { excluded: split.excluded, values: split.values } }
  const restored = entered[type]
  if (restored) {
    return { ...split, ...restored, type, entered, seeded: false }
  }

  return { ...convertSplit(split, type, peopleIds, total), entered, seeded: true }
}

/** Applies `change` to the current entries and to what each other type has kept. */
function mapEntries(split: SplitDraft, change: (entries: SplitEntries) => SplitEntries) {
  const current = change(split)
  if (!split.entered) {
    return current
  }

  const entered: Partial<Record<SplitType, SplitEntries>> = {}
  for (const [type, entries] of Object.entries(split.entered) as [SplitType, SplitEntries][]) {
    entered[type] = change(entries)
  }
  return { ...current, entered }
}

/** 1:1 "Switch": the other person paid, and the shares swap with the roles. */
export function mirrorSplit(split: SplitDraft, meId: number, otherId: number): SplitDraft {
  const swap = (id: number) => (id === meId ? otherId : id === otherId ? meId : id)

  return {
    ...split,
    payerId: swap(split.payerId),
    ...mapEntries(split, ({ excluded, values }) => ({
      excluded: excluded.map(swap),
      values: Object.fromEntries(
        Object.entries(values).map(([id, value]) => [swap(Number(id)), value]),
      ),
    })),
  }
}

/** The 1:1 card's three choices. "full": whoever didn't pay owes the whole amount. */
export type QuickChoice = 'equal' | 'full' | 'custom'

export function quickChoice(split: SplitDraft): QuickChoice {
  if (split.type !== 'equal') {
    return 'custom'
  }
  if (split.excluded.length === 0) {
    return 'equal'
  }
  if (split.excluded.length === 1 && split.excluded[0] === split.payerId) {
    return 'full'
  }

  return 'custom'
}

/** Picks "Equally" or "Full amount"; what was entered in the other types stays for the editor. */
export function applyQuickChoice(
  split: SplitDraft,
  choice: Exclude<QuickChoice, 'custom'>,
  peopleIds: number[],
  total: string | null,
): SplitDraft {
  const equal = switchSplitType(split, 'equal', peopleIds, total)

  return editSplit(equal, { excluded: choice === 'full' ? [split.payerId] : [], values: {} })
}

/** Keeps the split consistent when people are added or removed on the form. */
export function prunePeople(split: SplitDraft, peopleIds: number[], meId: number): SplitDraft {
  return {
    ...split,
    payerId: peopleIds.includes(split.payerId) ? split.payerId : meId,
    ...mapEntries(split, ({ excluded, values }) => ({
      excluded: excluded.filter((id) => peopleIds.includes(id)),
      values: Object.fromEntries(
        peopleIds.filter((id) => values[id] !== undefined).map((id) => [id, values[id]]),
      ),
    })),
  }
}

type NamedPerson = Pick<PersonRef, 'id' | 'displayName'>

function nameOf(people: NamedPerson[], id: number, meId: number): string {
  if (id === meId) {
    return 'You'
  }

  return getShortName(people.find((person) => person.id === id)?.displayName ?? '')
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

/** The 1:1 card's caption for a custom split: "By shares · You 2, Anna 1". */
export function describeCustomSplit(
  split: SplitDraft,
  people: NamedPerson[],
  meId: number,
): string {
  if (split.type === 'equal') {
    return describeSplit(split, people, meId)
  }

  const label = { exact: 'By amounts', percentage: 'By %', shares: 'By shares' }[split.type]
  const parts = people.map((person) => {
    const raw = split.values[person.id]?.trim() || '0'
    const parsed = parseAmountInput(raw)
    const value =
      parsed === null
        ? raw
        : split.type === 'exact'
          ? formatGrosze(toGrosze(parsed))
          : `${trimDecimal(parsed)}${split.type === 'percentage' ? '%' : ''}`
    return `${nameOf(people, person.id, meId)} ${value}`
  })

  return `${label} · ${parts.join(', ')}`
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
