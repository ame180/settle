import type { ReactNode } from 'react'

type AuthLayoutProps = {
  title: string
  description: string
  footer: ReactNode
  children: ReactNode
}

export function AuthLayout({ title, description, footer, children }: AuthLayoutProps) {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-7 px-4 pt-[calc(4rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold tracking-[0.04em] text-muted-foreground uppercase">
          Settle
        </p>
        <h1 className="text-[28px] font-semibold">{title}</h1>
        <p className="text-[15px] leading-[1.45] text-muted-foreground">{description}</p>
      </div>
      {children}
      <p className="text-center text-[15px] text-muted-foreground">{footer}</p>
    </main>
  )
}

export const authLinkClassName =
  'font-semibold text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
