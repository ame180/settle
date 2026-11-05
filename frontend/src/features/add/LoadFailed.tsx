import { ApiError } from '@/api/client'

/** Shown when the expense or payment to edit can't be loaded. */
export function LoadFailed({
  what,
  error,
  onRetry,
}: {
  what: 'expense' | 'payment'
  error: Error
  onRetry: () => void
}) {
  const missing = error instanceof ApiError && (error.status === 404 || error.status === 403)

  return (
    <div className="flex flex-col items-start gap-3 p-4">
      <p className="text-[15px]">
        {missing
          ? `This ${what} doesn’t exist, or you’re not part of it.`
          : `Couldn’t load this ${what}.`}
      </p>
      {!missing && (
        <button
          type="button"
          onClick={onRetry}
          className="h-11 rounded-full border border-border-strong px-5 text-[15px] font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Try again
        </button>
      )}
    </div>
  )
}
