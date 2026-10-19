export type MeResponse = {
  id: number
  email: string
  name: string | null
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
  debts: ExpenseDebtResponse[]
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

export type ActivityItem = {
  type: 'expense' | 'transfer'
  id: number
  occurredOn: string
  currency: string
  amount: string
  value: string
  title: string | null
  description: string | null
  payee: PersonRef
  payer: PersonRef | null
}

export type ContactListItem = {
  person: PersonRef
  nickname: string | null
  name: string | null
  isRegistered: boolean
  balances: CurrencyAmount[]
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
  error?: string
  violations?: ApiViolation[]
}
