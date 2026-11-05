import { describe, expect, it } from 'vitest'
import type { SplitType } from '@/api/types'
import { formatPln } from '@/lib/money'
import {
  checkSplit,
  convertSplit,
  defaultSplit,
  describeOutcome,
  describeSplit,
  editSplit,
  mirrorSplit,
  prunePeople,
  splitDebts,
  switchSplitType,
  type SplitDraft,
} from './splitModel'

const ME = 1
const ANNA = 2
const EWA = 3
const TOMASZ = 4
const people = [
  { id: ME, displayName: 'Admin' },
  { id: ANNA, displayName: 'Anna Kowalska' },
  { id: EWA, displayName: 'Ewa Nowak' },
  { id: TOMASZ, displayName: 'Tomasz Wiśniewski' },
]
const ids = people.map((person) => person.id)
const duo = people.slice(0, 2)
const duoIds = [ME, ANNA]

function shares(split: SplitDraft, total: string, peopleIds = ids) {
  const check = checkSplit(split, peopleIds, total, ME)
  if (!check.ok) {
    throw new Error(`expected ok, got ${check.problem.kind}`)
  }
  return Object.fromEntries(check.shares)
}

describe('splitDebts', () => {
  it('sends only people who share, in order, leaving zero values out', () => {
    expect(splitDebts({ ...defaultSplit(ME), excluded: [EWA] }, ids)).toEqual([
      { payerId: ME },
      { payerId: ANNA },
      { payerId: TOMASZ },
    ])
    expect(
      splitDebts(
        {
          payerId: ME,
          type: 'exact',
          excluded: [],
          values: { [ME]: '100,5', [ANNA]: '0', [EWA]: '' },
        },
        ids,
      ),
    ).toEqual([{ payerId: ME, value: '100.50' }])
  })

  it('flags a value that is not a number', () => {
    expect(
      splitDebts({ payerId: ME, type: 'shares', excluded: [], values: { [ANNA]: 'x' } }, ids),
    ).toEqual({ invalid: ANNA })
  })
})

describe('checkSplit', () => {
  it('resolves an equal split with the server rounding', () => {
    expect(shares(defaultSplit(ME), '10.00', [ME, ANNA, EWA])).toEqual({
      [ME]: 334n,
      [ANNA]: 333n,
      [EWA]: 333n,
    })
  })

  it("says when the user neither pays nor shares (the server's rule)", () => {
    const split = { ...defaultSplit(ME), payerId: EWA, excluded: [ME] }
    expect(checkSplit(split, ids, '240.00', ME)).toEqual({
      ok: false,
      problem: { kind: 'not-involved' },
    })
  })

  it('reports amounts that do not add up, with what is assigned', () => {
    const split: SplitDraft = {
      payerId: ME,
      type: 'exact',
      excluded: [],
      values: { [ME]: '100', [ANNA]: '60', [EWA]: '60' },
    }
    expect(checkSplit(split, ids, '240.00', ME)).toEqual({
      ok: false,
      problem: { kind: 'amounts', assigned: 22000n, total: 24000n },
    })
  })

  it('reports percentages that do not make 100, even without an amount', () => {
    const split: SplitDraft = {
      payerId: ME,
      type: 'percentage',
      excluded: [],
      values: { [ME]: '50', [ANNA]: '40' },
    }
    expect(checkSplit(split, ids, null, ME)).toEqual({
      ok: false,
      problem: { kind: 'percent', assigned: 9000n },
    })
  })

  it('needs someone to share and an amount', () => {
    expect(checkSplit({ ...defaultSplit(ME), excluded: ids }, ids, '1.00', ME)).toEqual({
      ok: false,
      problem: { kind: 'nobody' },
    })
    expect(checkSplit(defaultSplit(ME), ids, null, ME)).toEqual({
      ok: false,
      problem: { kind: 'no-amount' },
    })
  })

  it('rescales %, shares and equal when the amount changes', () => {
    const split: SplitDraft = {
      payerId: ME,
      type: 'percentage',
      excluded: [],
      values: { [ME]: '50', [ANNA]: '25', [EWA]: '25' },
    }
    expect(shares(split, '240.00')).toEqual({ [ME]: 12000n, [ANNA]: 6000n, [EWA]: 6000n })
    expect(shares(split, '260.00')).toEqual({ [ME]: 13000n, [ANNA]: 6500n, [EWA]: 6500n })
  })
})

describe('convertSplit', () => {
  const equalOfThree: SplitDraft = { ...defaultSplit(ME), excluded: [TOMASZ] }

  it('carries an equal split to amounts with the server rounding', () => {
    expect(convertSplit(equalOfThree, 'exact', ids, '100.00').values).toEqual({
      [ME]: '33.34',
      [ANNA]: '33.33',
      [EWA]: '33.33',
    })
  })

  it('carries an equal split to percentages that make 100', () => {
    expect(convertSplit(equalOfThree, 'percentage', ids, null).values).toEqual({
      [ME]: '33.34',
      [ANNA]: '33.33',
      [EWA]: '33.33',
    })
  })

  it('finds whole shares in the same proportion', () => {
    const percents: SplitDraft = {
      payerId: ME,
      type: 'percentage',
      excluded: [],
      values: { [ME]: '50', [ANNA]: '25', [EWA]: '25' },
    }
    expect(convertSplit(percents, 'shares', ids, '240.00').values).toEqual({
      [ME]: '2',
      [ANNA]: '1',
      [EWA]: '1',
    })
  })

  it('rounds to whole shares when the exact ratio needs huge numbers', () => {
    const amounts: SplitDraft = {
      payerId: ME,
      type: 'exact',
      excluded: [],
      values: { [ME]: '66.67', [ANNA]: '33.33' },
    }
    expect(convertSplit(amounts, 'shares', ids, '100.00').values).toEqual({
      [ME]: '2',
      [ANNA]: '1',
    })
  })

  it('ticks whoever has a share when going back to equal', () => {
    const amounts: SplitDraft = {
      payerId: ME,
      type: 'exact',
      excluded: [],
      values: { [ME]: '100', [ANNA]: '0', [EWA]: '140' },
    }
    expect(convertSplit(amounts, 'equal', ids, '240.00').excluded).toEqual([ANNA, TOMASZ])
  })

  it('keeps the payer', () => {
    expect(convertSplit({ ...equalOfThree, payerId: EWA }, 'shares', ids, null).payerId).toBe(EWA)
  })
})

describe('switchSplitType', () => {
  const trio = [ME, ANNA, EWA]
  const sharesEntered = { [ME]: '3', [ANNA]: '2', [EWA]: '4' }
  // Shares 3:2:4, entered by the user after starting on Equal.
  const typed = editSplit(switchSplitType(defaultSplit(ME), 'shares', trio, '90.00'), {
    values: sharesEntered,
  })
  const through = (split: SplitDraft, ...types: SplitType[]) =>
    types.reduce((current, type) => switchSplitType(current, type, trio, '90.00'), split)

  it.each<[SplitType[]]>([
    [['percentage', 'shares']],
    [['exact', 'shares']],
    [['equal', 'shares']],
    [['percentage', 'exact', 'equal', 'shares']],
  ])('brings shares 3:2:4 back exactly via %j', (types) => {
    expect(through(typed, ...types).values).toEqual(sharesEntered)
  })

  it('seeds a type the user has not touched by converting the current split', () => {
    expect(through(typed, 'percentage').values).toEqual({
      [ME]: '33.33',
      [ANNA]: '22.22',
      [EWA]: '44.45',
    })
  })

  it('keeps edits in every type the user changed', () => {
    const percents = { [ME]: '50', [ANNA]: '25', [EWA]: '25' }
    const edited = editSplit(through(typed, 'percentage'), { values: percents })

    expect(through(edited, 'shares').values).toEqual(sharesEntered)
    expect(through(edited, 'shares', 'percentage').values).toEqual(percents)
  })

  it('reseeds a type that was only converted, from the split the user left', () => {
    const amounts = { [ME]: '45.00', [ANNA]: '45.00', [EWA]: '0' }
    const edited = editSplit(through(typed, 'percentage', 'exact'), { values: amounts })

    expect(through(edited, 'percentage').values).toEqual({ [ME]: '50', [ANNA]: '50' })
  })

  it('counts a loaded or applied split as entered', () => {
    const applied: SplitDraft = { ...defaultSplit(ME), type: 'shares', values: sharesEntered }
    expect(through(applied, 'percentage', 'shares').values).toEqual(sharesEntered)
  })

  it('restores the equal ticks the user set', () => {
    const withoutEwa = editSplit(defaultSplit(ME), { excluded: [EWA] })
    expect(through(withoutEwa, 'shares', 'equal').excluded).toEqual([EWA])
  })

  it('flags restored amounts when the total changed since', () => {
    const amounts = { [ME]: '30.00', [ANNA]: '20.00', [EWA]: '40.00' }
    const entered = editSplit(through(typed, 'exact'), { values: amounts })
    const back = switchSplitType(through(entered, 'shares'), 'exact', trio, '120.00')

    expect(back.values).toEqual(amounts)
    expect(checkSplit(back, trio, '120.00', ME)).toEqual({
      ok: false,
      problem: { kind: 'amounts', assigned: 9000n, total: 12000n },
    })
  })

  it('keeps the payer', () => {
    expect(through({ ...typed, payerId: EWA }, 'percentage', 'shares').payerId).toBe(EWA)
  })
})

describe('mirrorSplit', () => {
  it('swaps who paid and who owes it all', () => {
    const annaOwesAll: SplitDraft = { ...defaultSplit(ME), excluded: [ME] }
    expect(mirrorSplit(annaOwesAll, ME, ANNA)).toEqual({
      ...defaultSplit(ME),
      payerId: ANNA,
      excluded: [ANNA],
    })
  })
})

describe('mirrorSplit and prunePeople with entered types', () => {
  const split: SplitDraft = {
    ...defaultSplit(ME),
    type: 'percentage',
    values: { [ME]: '60', [ANNA]: '40' },
    entered: { shares: { excluded: [EWA], values: { [ME]: '3', [ANNA]: '1', [EWA]: '2' } } },
  }

  it('swaps what other types kept along with the roles', () => {
    expect(mirrorSplit(split, ME, ANNA).entered).toEqual({
      shares: { excluded: [EWA], values: { [ANNA]: '3', [ME]: '1', [EWA]: '2' } },
    })
  })

  it('drops removed people from what other types kept', () => {
    expect(prunePeople(split, duoIds, ME).entered).toEqual({
      shares: { excluded: [], values: { [ME]: '3', [ANNA]: '1' } },
    })
  })
})

describe('prunePeople', () => {
  it('drops removed people and falls back to the user as payer', () => {
    const split: SplitDraft = {
      payerId: EWA,
      type: 'exact',
      excluded: [EWA],
      values: { [ME]: '1', [EWA]: '2' },
    }
    expect(prunePeople(split, duoIds, ME)).toEqual({
      payerId: ME,
      type: 'exact',
      excluded: [],
      values: { [ME]: '1' },
    })
  })
})

describe('describeSplit', () => {
  it.each<[SplitDraft, typeof people, string]>([
    [defaultSplit(ME), duo, 'Split equally'],
    [defaultSplit(ME), people, 'Split equally between 4'],
    [{ ...defaultSplit(ME), excluded: [ME] }, duo, 'Anna owes it all'],
    [{ ...defaultSplit(ME), payerId: ANNA, excluded: [ANNA] }, duo, 'You owe it all'],
    [{ ...defaultSplit(ME), excluded: [TOMASZ] }, people, 'Split equally between 3 of 4'],
    [{ ...defaultSplit(ME), type: 'exact' }, people, 'Split by amounts'],
  ])('describes %j', (split, group, expected) => {
    expect(describeSplit(split, group, ME)).toBe(expected)
  })
})

describe('describeOutcome', () => {
  it('names the one person who owes the user', () => {
    expect(
      describeOutcome(
        new Map([
          [ME, 4950n],
          [ANNA, 4950n],
        ]),
        ME,
        duo,
        ME,
      ),
    ).toEqual({
      lead: 'Anna owes you',
      grosze: 4950n,
      tone: 'positive',
      detail: null,
    })
  })

  it('sums a group and says each when shares match', () => {
    const outcome = describeOutcome(
      new Map([
        [ME, 6000n],
        [ANNA, 6000n],
        [EWA, 6000n],
        [TOMASZ, 6000n],
      ]),
      ME,
      people,
      ME,
    )
    expect(outcome.lead).toBe('You lent')
    expect(outcome.grosze).toBe(18000n)
    expect(outcome.detail).toBe(`Anna, Ewa and Tomasz owe you ${formatPln('60.00')} each`)
  })

  it('says what the user owes when someone else paid', () => {
    expect(
      describeOutcome(
        new Map([
          [ME, 4950n],
          [ANNA, 4950n],
        ]),
        ANNA,
        duo,
        ME,
      ),
    ).toMatchObject({
      lead: 'You owe Anna',
      grosze: 4950n,
      tone: 'negative',
    })
  })
})
