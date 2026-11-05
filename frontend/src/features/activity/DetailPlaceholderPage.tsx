import { Link, useNavigate } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'

/** Stand-in for the expense and transfer detail screens until they are built. */
export function DetailPlaceholderPage({ title }: { title: string }) {
  const navigate = useNavigate()

  return (
    <>
      <PageHeader
        title={title}
        leading={
          <Link
            to="/activity"
            onClick={(event) => {
              const isPlainClick =
                event.button === 0 &&
                !event.metaKey &&
                !event.ctrlKey &&
                !event.shiftKey &&
                !event.altKey
              const hasInAppHistory = (window.history.state?.idx ?? 0) > 0
              if (!isPlainClick || !hasInAppHistory) {
                return
              }
              event.preventDefault()
              navigate(-1)
            }}
            aria-label="Back"
            className="flex size-11 items-center justify-center rounded-full hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <ArrowLeft className="size-6" aria-hidden="true" />
          </Link>
        }
      />
      <p className="p-4 text-sm text-muted-foreground">Details coming soon.</p>
    </>
  )
}
