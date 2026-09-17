export type MeResponse = {
  id: number
  email: string
}

export type SplitType = 'exact' | 'percentage' | 'shares' | 'equal'

export type ExpenseDebtResponse = {
  payerId: number
  amount: string
  splitValue: string | null
}

export type ExpenseResponse = {
  id: number
  title: string
  description: string | null
  amount: string
  currency: string
  payeeId: number
  occurredOn: string
  splitType: SplitType
  debts: ExpenseDebtResponse[]
}

export type TransferResponse = {
  id: number
  payerId: number
  payeeId: number
  amount: string
  currency: string
  occurredOn: string
  description: string | null
}

export type ContactListItem = {
  id: number
  email: string
}

export type ContactResponse = {
  id: number
  email: string
  isRegistered: boolean
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
