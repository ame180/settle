import {
  Car,
  Gift,
  House,
  Pill,
  Receipt,
  ShoppingCart,
  Ticket,
  Utensils,
  type LucideIcon,
} from 'lucide-react'
import { i18n, type MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import type { ExpenseCategory } from '@/api/types'

export type CategoryInfo = {
  /** Translate with `categoryLabel`. */
  message: MessageDescriptor
  icon: LucideIcon
  /** Solid tile fill; a full class name so Tailwind picks it up. */
  tileClassName: string
}

export const categoryInfo: Record<ExpenseCategory, CategoryInfo> = {
  groceries: {
    message: msg`Groceries`,
    icon: ShoppingCart,
    tileClassName: 'bg-category-groceries',
  },
  food_and_drink: {
    message: msg`Food & drink`,
    icon: Utensils,
    tileClassName: 'bg-category-food-and-drink',
  },
  transport: { message: msg`Transport`, icon: Car, tileClassName: 'bg-category-transport' },
  home_and_bills: {
    message: msg`Home & bills`,
    icon: House,
    tileClassName: 'bg-category-home-and-bills',
  },
  entertainment: {
    message: msg`Entertainment`,
    icon: Ticket,
    tileClassName: 'bg-category-entertainment',
  },
  gifts: { message: msg`Gifts`, icon: Gift, tileClassName: 'bg-category-gifts' },
  health: { message: msg`Health`, icon: Pill, tileClassName: 'bg-category-health' },
  general: { message: msg`General`, icon: Receipt, tileClassName: 'bg-category-general' },
}

/** The category's name in the active locale. */
export function categoryLabel(expenseCategory: ExpenseCategory): string {
  return i18n._(categoryInfo[expenseCategory].message)
}

/** Picker order, as on the approved category palette. */
export const expenseCategories = Object.keys(categoryInfo) as ExpenseCategory[]
