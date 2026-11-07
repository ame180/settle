// Types mirror the PHP DTOs in src/Dto. Dates arrive as ISO 8601 strings; request dates may be
// sent as YYYY-MM-DD. Money is always a decimal string, never a number.

export type MeResponse = {
  id: number
  email: string
  name: string | null
}

/** PATCH /api/me. Send an empty string to clear the name. */
export type MeUpdateRequest = {
  name: string
}

export type RegisterRequest = {
  email: string
  password: string
  name?: string | null
}

export type PersonRef = {
  id: number
  displayName: string
  email: string
}

export type CurrencyAmount = {
  currency: string
  amount: string
}

export type SplitType = 'exact' | 'percentage' | 'shares' | 'equal'

export type ExpenseCategory =
  | 'groceries'
  | 'food_and_drink'
  | 'transport'
  | 'home_and_bills'
  | 'entertainment'
  | 'gifts'
  | 'health'
  | 'general'

/** `value` is the split input (amount, percentage or shares); omit it for an equal split. */
export type ExpenseDebtRequest = {
  payerId: number
  value?: string | null
}

export type ExpenseRequest = {
  title: string
  amount: string
  payeeId: number
  debts: ExpenseDebtRequest[]
  occurredOn: string
  splitType?: SplitType
  category?: ExpenseCategory
  description?: string | null
}

export type ExpenseDebtResponse = {
  payer: PersonRef
  amount: string
  splitValue: string | null
}

export type ExpenseResponse = {
  id: number
  title: string
  description: string | null
  amount: string
  currency: string
  payee: PersonRef
  occurredOn: string
  splitType: SplitType
  category: ExpenseCategory
  debts: ExpenseDebtResponse[]
}

export type TransferRequest = {
  payerId: number
  payeeId: number
  amount: string
  occurredOn: string
  description?: string | null
}

export type TransferUpdateRequest = {
  amount: string
  occurredOn: string
  description?: string | null
}

export type TransferResponse = {
  id: number
  payer: PersonRef
  payee: PersonRef
  amount: string
  currency: string
  occurredOn: string
  description: string | null
}

export type ActivityType = 'expense' | 'transfer'

export type ActivityItem = {
  type: ActivityType
  id: number
  occurredOn: string
  currency: string
  amount: string
  /** Signed effect on the viewer's balance (with `contactId`: with that contact); positive = owed to the viewer. */
  value: string
  /** Expense title, or the transfer's description. */
  title: string | null
  description: string | null
  payee: PersonRef
  /** Transfers only. */
  payer: PersonRef | null
  category: ExpenseCategory | null
}

export type ContactRequest = {
  email: string
  nickname?: string | null
}

export type ContactUpdateRequest = {
  nickname?: string | null
}

export type ContactListItem = {
  person: PersonRef
  nickname: string | null
  name: string | null
  isRegistered: boolean
  balances: CurrencyAmount[]
  lastActivityAt: string
}

export type ContactListResponse = {
  totals: CurrencyAmount[]
  items: ContactListItem[]
}

export type ApiViolation = {
  propertyPath: string
  title: string
}

export type ApiProblem = {
  status: number
  title?: string
  detail?: string
  violations?: ApiViolation[]
}
