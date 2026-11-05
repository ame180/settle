import { useEffect, useState } from 'react'
import { CircleCheck } from 'lucide-react'

const TOAST_DURATION_MS = 4000

type ToastProps = {
  message: string | null
  className?: string
}

/** Success toast in an always-rendered live region, so screen readers announce it. */
export function Toast({ message, className }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (message === null) {
      return
    }
    // Shown after mount so the text lands in an already rendered live region and gets announced.
    const showTimeoutId = setTimeout(() => setIsVisible(true), 0)
    const hideTimeoutId = setTimeout(() => setIsVisible(false), TOAST_DURATION_MS)
    return () => {
      clearTimeout(showTimeoutId)
      clearTimeout(hideTimeoutId)
    }
  }, [message])

  return (
    <div role="status" className={className}>
      {isVisible && (
        <div className="flex items-center gap-2.5 rounded-xl bg-primary px-4 py-3.5 text-[15px] text-primary-foreground shadow-[0_6px_20px_rgb(0_0_0/0.2)]">
          <CircleCheck className="size-5 shrink-0 text-emerald-300" aria-hidden="true" />
          {message}
        </div>
      )}
    </div>
  )
}
