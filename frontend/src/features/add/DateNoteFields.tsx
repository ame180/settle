import { useState, type RefObject } from 'react'
import { Textarea } from '@/components/ui/input'
import { flushSync } from 'react-dom'
import { Calendar, FileText } from 'lucide-react'
import { formatDateLabel } from '@/lib/dates'
import { DateSheet } from './DateSheet'
import { FieldError } from '@/components/FieldError'
import { PillButton } from './formParts'

type DateNoteFieldsProps = {
  idPrefix: string
  occurredOn: string
  onDateChange: (occurredOn: string) => void
  dateError?: string
  note: string
  onNoteChange: (note: string) => void
  noteError?: string
  noteRef: RefObject<HTMLTextAreaElement | null>
  notePlaceholder?: string
}

/** The date chip (with its sheet) and the note, which opens from a chip and stays open. */
export function DateNoteFields({
  idPrefix,
  occurredOn,
  onDateChange,
  dateError,
  note,
  onNoteChange,
  noteError,
  noteRef,
  notePlaceholder,
}: DateNoteFieldsProps) {
  const [dateOpen, setDateOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(note !== '')
  const noteId = `${idPrefix}-note`

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <PillButton onClick={() => setDateOpen(true)}>
          <Calendar aria-hidden="true" />
          {formatDateLabel(occurredOn)}
        </PillButton>
        {!noteOpen && (
          <PillButton
            onClick={() => {
              // Synchronous so the focus happens inside the tap; iOS only opens the keyboard then.
              flushSync(() => setNoteOpen(true))
              noteRef.current?.focus()
            }}
          >
            <FileText aria-hidden="true" />
            Add note
          </PillButton>
        )}
      </div>
      {dateError && <FieldError message={dateError} />}

      {noteOpen && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={noteId} className="text-sm font-medium">
            Note <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <Textarea
            ref={noteRef}
            id={noteId}
            rows={3}
            placeholder={notePlaceholder}
            value={note}
            aria-invalid={!!noteError}
            onChange={(event) => onNoteChange(event.target.value)}
            onFocus={(event) => {
              const target = event.currentTarget
              window.setTimeout(() => target.scrollIntoView({ block: 'nearest' }), 300)
            }}
            className="scroll-mb-28"
          />
          {noteError && <FieldError message={noteError} />}
        </div>
      )}

      <DateSheet
        open={dateOpen}
        onOpenChange={setDateOpen}
        value={occurredOn}
        onChange={onDateChange}
      />
    </>
  )
}
