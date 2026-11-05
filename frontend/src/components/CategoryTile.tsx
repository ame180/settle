import type { ExpenseCategory } from '@/api/types'
import { categoryInfo } from '@/lib/categories'
import { cn } from '@/lib/utils'

type CategoryTileProps = {
  category: ExpenseCategory
  className?: string
}

export function CategoryTile({ category, className }: CategoryTileProps) {
  const { label, icon: Icon, tileClassName } = categoryInfo[category]

  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-tile text-category-on-solid',
        tileClassName,
        className,
      )}
    >
      <Icon className="size-5.5" aria-hidden="true" />
    </span>
  )
}
