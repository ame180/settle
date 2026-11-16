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
  /** Translatable name; translate it with `i18n._(message)`, or use `label` / `categoryLabel`. */
  message: MessageDescriptor
  /** The name in the active locale, translated each time it is read. */
  readonly label: string
  icon: LucideIcon
  /** Solid tile fill; a full class name so Tailwind picks it up. */
  tileClassName: string
}

function category(
  message: MessageDescriptor,
  icon: LucideIcon,
  tileClassName: string,
): CategoryInfo {
  return {
    message,
    get label() {
      return i18n._(message)
    },
    icon,
    tileClassName,
  }
}

export const categoryInfo: Record<ExpenseCategory, CategoryInfo> = {
  groceries: category(msg`Groceries`, ShoppingCart, 'bg-category-groceries'),
  food_and_drink: category(msg`Food & drink`, Utensils, 'bg-category-food-and-drink'),
  transport: category(msg`Transport`, Car, 'bg-category-transport'),
  home_and_bills: category(msg`Home & bills`, House, 'bg-category-home-and-bills'),
  entertainment: category(msg`Entertainment`, Ticket, 'bg-category-entertainment'),
  gifts: category(msg`Gifts`, Gift, 'bg-category-gifts'),
  health: category(msg`Health`, Pill, 'bg-category-health'),
  general: category(msg`General`, Receipt, 'bg-category-general'),
}

/** The category's name in the active locale. */
export function categoryLabel(expenseCategory: ExpenseCategory): string {
  return categoryInfo[expenseCategory].label
}

/** Picker order, as on the approved category palette. */
export const expenseCategories = Object.keys(categoryInfo) as ExpenseCategory[]
