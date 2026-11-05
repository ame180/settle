import type { ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type SubmitButtonProps = {
  isPending: boolean
  pendingLabel: string
  children: ReactNode
}

export function SubmitButton({ isPending, pendingLabel, children }: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      className="mt-2 h-12 w-full rounded-full text-base font-semibold disabled:opacity-75 [&_svg]:size-4.5"
      disabled={isPending}
    >
      {isPending ? (
        <>
          <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
