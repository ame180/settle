import * as React from 'react'
import { Drawer } from 'vaul'
import { cn } from '@/lib/utils'

// Bottom sheet: swipe down, tap outside or Escape dismisses. Built on vaul (Radix Dialog inside),
// so focus is trapped and returned to the trigger. Give each sheet a SheetTitle and a
// SheetDescription; Radix warns when either is missing.

function Sheet(props: React.ComponentProps<typeof Drawer.Root>) {
  return <Drawer.Root {...props} />
}

const SheetTrigger = Drawer.Trigger
const SheetClose = Drawer.Close

function SheetContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Drawer.Content>) {
  return (
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40" />
      <Drawer.Content
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] max-w-(--app-width) flex-col rounded-t-2xl bg-background pb-[env(safe-area-inset-bottom)] outline-none',
          className,
        )}
        {...props}
      >
        <div
          aria-hidden="true"
          className="mx-auto mt-2.5 mb-1 h-1 w-10 shrink-0 rounded-full bg-border"
        />
        {children}
      </Drawer.Content>
    </Drawer.Portal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 px-4 pt-2 pb-3', className)} {...props} />
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof Drawer.Title>) {
  return <Drawer.Title className={cn('text-lg font-semibold', className)} {...props} />
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof Drawer.Description>) {
  return (
    <Drawer.Description className={cn('text-[15px] text-muted-foreground', className)} {...props} />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 px-4 pt-3 pb-4', className)} {...props} />
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
}
