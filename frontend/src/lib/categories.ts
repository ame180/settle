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
import type { ExpenseCategory } from '@/api/types'

export type CategoryInfo = {
  label: string
  icon: LucideIcon
  /** Solid tile fill; a full class name so Tailwind picks it up. */
  tileClassName: string
}

export const categoryInfo: Record<ExpenseCategory, CategoryInfo> = {
  groceries: { label: 'Groceries', icon: ShoppingCart, tileClassName: 'bg-category-groceries' },
  food_and_drink: {
    label: 'Food & drink',
    icon: Utensils,
    tileClassName: 'bg-category-food-and-drink',
  },
  transport: { label: 'Transport', icon: Car, tileClassName: 'bg-category-transport' },
  home_and_bills: {
    label: 'Home & bills',
    icon: House,
    tileClassName: 'bg-category-home-and-bills',
  },
  entertainment: {
    label: 'Entertainment',
    icon: Ticket,
    tileClassName: 'bg-category-entertainment',
  },
  gifts: { label: 'Gifts', icon: Gift, tileClassName: 'bg-category-gifts' },
  health: { label: 'Health', icon: Pill, tileClassName: 'bg-category-health' },
  general: { label: 'General', icon: Receipt, tileClassName: 'bg-category-general' },
}

/** Picker order, as on the approved category palette. */
export const expenseCategories = Object.keys(categoryInfo) as ExpenseCategory[]
