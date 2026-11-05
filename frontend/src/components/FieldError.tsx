import { CircleAlert } from 'lucide-react'

export function FieldError({ id, message }: { id: string; message: string | undefined }) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-[13px] text-destructive">
      <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  )
}
