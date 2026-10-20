import { getInitials } from '@/lib/person'
import { cn } from '@/lib/utils'

const avatarColors = [
  'bg-orange-100 text-orange-800',
  'bg-emerald-100 text-emerald-800',
  'bg-blue-100 text-blue-800',
  'bg-violet-100 text-violet-800',
  'bg-pink-100 text-pink-800',
  'bg-amber-100 text-amber-800',
]

type PersonAvatarProps = {
  id: number
  name: string
  size?: 'sm' | 'md'
  className?: string
}

export function PersonAvatar({ id, name, size = 'md', className }: PersonAvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-semibold',
        avatarColors[id % avatarColors.length],
        size === 'md' ? 'size-11 text-[15px]' : 'size-6 text-[11px]',
        className,
      )}
    >
      {getInitials(name)}
    </span>
  )
}
