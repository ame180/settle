import type { ExpenseCategory } from '@/api/types'
import { CategoryTile } from '@/components/CategoryTile'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { categoryInfo, expenseCategories } from '@/lib/categories'
import { cn } from '@/lib/utils'

type CategorySheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: ExpenseCategory
  onPick: (category: ExpenseCategory) => void
}

export function CategorySheet({ open, onOpenChange, value, onPick }: CategorySheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Category</SheetTitle>
          <SheetDescription className="text-[13px]">
            Guessed from the title. Pick another and it stays.
          </SheetDescription>
        </SheetHeader>
        <div role="radiogroup" aria-label="Category" className="grid grid-cols-4 gap-2 px-4 pb-6">
          {expenseCategories.map((category) => {
            const checked = category === value
            return (
              <button
                key={category}
                type="button"
                role="radio"
                aria-checked={checked}
                aria-label={categoryInfo[category].label}
                onClick={() => onPick(category)}
                className="flex min-h-22 flex-col items-center gap-1.5 rounded-xl px-0.5 py-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span
                  className={cn(
                    'flex rounded-[15px] border-2 border-transparent p-[3px]',
                    checked && 'border-foreground',
                  )}
                >
                  <CategoryTile category={category} className="pointer-events-none" />
                </span>
                <span
                  className={cn(
                    'text-center text-xs text-foreground/80',
                    checked && 'font-semibold text-foreground',
                  )}
                >
                  {categoryInfo[category].label}
                </span>
              </button>
            )
          })}
        </div>
      </SheetContent>
    </Sheet>
  )
}
