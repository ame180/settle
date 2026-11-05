import { Link, useNavigate } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { hasInAppHistory } from '@/lib/history'

type BackLinkProps = {
  /** Where to go when there is no in-app history to return to (e.g. after a reload). */
  to: string
  label: string
}

/** Header back button: goes back in history when it can, so the previous screen keeps its scroll. */
export function BackLink({ to, label }: BackLinkProps) {
  const navigate = useNavigate()

  return (
    <Link
      to={to}
      onClick={(event) => {
        const isPlainClick =
          event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
        if (!isPlainClick || !hasInAppHistory()) {
          return
        }
        event.preventDefault()
        navigate(-1)
      }}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-full hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <ArrowLeft className="size-6" aria-hidden="true" />
    </Link>
  )
}
