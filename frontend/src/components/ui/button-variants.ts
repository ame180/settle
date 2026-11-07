import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-border-strong bg-background hover:bg-secondary active:bg-secondary',
        ghost: 'hover:bg-secondary',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
      },
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-12 px-6',
        icon: 'size-11 shrink-0 rounded-full [&_svg]:size-6',
        pill: 'h-11 shrink-0 rounded-full px-5 text-[15px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>

/** Button classes for something that isn't a <button>, such as a router Link. */
export function buttonClassName({
  className,
  ...variants
}: ButtonVariants & { className?: string }) {
  return cn(buttonVariants({ ...variants, className }))
}
