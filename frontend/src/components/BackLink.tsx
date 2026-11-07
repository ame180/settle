import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { buttonClassName } from '@/components/ui/button-variants'
import { useGoBack } from '@/lib/useGoBack'

type BackLinkProps = {
  /** Where to go when there is no in-app history to return to (e.g. after a reload). */
  to: string
  label: string
}

/** Header back button: goes back in history when it can, so the previous screen keeps its scroll. */
export function BackLink({ to, label }: BackLinkProps) {
  const { hasInAppHistory, goBack } = useGoBack(to)

  return (
    <Link
      to={to}
      onClick={(event) => {
        const isPlainClick =
          event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
        if (!isPlainClick || !hasInAppHistory) {
          return
        }
        event.preventDefault()
        goBack()
      }}
      aria-label={label}
      className={buttonClassName({ variant: 'ghost', size: 'icon' })}
    >
      <ArrowLeft className="size-6" aria-hidden="true" />
    </Link>
  )
}
