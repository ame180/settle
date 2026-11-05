import { useId, useRef, type ReactNode, type RefObject } from 'react'
import { parseAmountInput, sanitizeAmountInput } from '@/lib/money'
import { cn } from '@/lib/utils'
import { FieldError } from './formParts'

type AmountFieldProps = {
  value: string
  onChange: (value: string) => void
  error?: string
  /** Shown under the amount (and any error), and kept in view with it while typing. */
  outcome?: ReactNode
  inputRef: RefObject<HTMLInputElement | null>
}

/** Large centred amount with a fixed "zł" suffix; decimal comma accepted, tidied on blur. */
export function AmountField({ value, onChange, error, outcome, inputRef }: AmountFieldProps) {
  const id = useId()
  const blockRef = useRef<HTMLDivElement>(null)
  const width = Math.max(value.length, 4)

  return (
    <div ref={blockRef} className="flex scroll-mt-4 scroll-mb-28 flex-col items-center gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-muted-foreground">
        Amount
      </label>
      <div
        className={cn(
          'flex items-baseline gap-1.5 border-b-2 border-border-strong px-4 pb-0.5 focus-within:border-foreground',
          error && 'border-destructive focus-within:border-destructive',
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0.00"
          value={value}
          aria-invalid={!!error}
          aria-describedby={`${id}-outcome`}
          onChange={(event) => onChange(sanitizeAmountInput(event.target.value, value))}
          onBlur={() => {
            const parsed = parseAmountInput(value)
            if (parsed !== null && parsed !== value) {
              onChange(parsed)
            }
          }}
          onFocus={() => {
            // Keep the whole block, outcome line included, above the keyboard.
            window.setTimeout(
              () => blockRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }),
              300,
            )
          }}
          style={{ width: `${width + 0.5}ch` }}
          className="min-w-0 bg-transparent text-right text-4xl font-semibold tabular-nums outline-none placeholder:text-muted-foreground/70"
        />
        <span className="text-lg font-semibold text-muted-foreground">zł</span>
      </div>
      <div id={`${id}-outcome`} className="min-h-6 self-stretch text-center">
        {error && <FieldError message={error} className="justify-center" />}
        {outcome}
      </div>
    </div>
  )
}
