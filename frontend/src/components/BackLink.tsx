import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { useGoBack } from '@/lib/useGoBack'

type BackLinkProps = {
  fallback: string
  label?: string
}

/** Header back arrow. A plain click goes back in history; modified clicks follow `fallback`. */
export function BackLink({ fallback, label = 'Back' }: BackLinkProps) {
  const { hasInAppHistory, goBack } = useGoBack(fallback)

  return (
    <Link
      to={fallback}
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
      className="flex size-11 items-center justify-center rounded-full hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <ArrowLeft className="size-6" aria-hidden="true" />
    </Link>
  )
}
