import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { plural, t as translate } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { useSplitwiseImport, useSplitwiseImportPreview } from '@/api/splitwiseImport'
import type { ContactListItem, SplitwiseImportPreview, SplitwiseImportSummary } from '@/api/types'
import { PrimaryButton } from '@/components/PrimaryButton'
import { Spinner } from '@/components/Spinner'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { balanceDirection, formatPln } from '@/lib/money'
import { getShortName } from '@/lib/person'
import { cn } from '@/lib/utils'

// Matches the server's limit on the CSV text.
const MAX_FILE_BYTES = 1_048_576

type OwnColumn = 0 | 1

export function SplitwiseImport({ contact }: { contact: ContactListItem }) {
  const { t } = useLingui()
  const userId = contact.person.id
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [csv, setCsv] = useState<string | null>(null)
  const [tooLarge, setTooLarge] = useState(false)
  const [ownColumn, setOwnColumn] = useState<OwnColumn | null>(null)
  const previewMutation = useSplitwiseImportPreview(userId)
  const importMutation = useSplitwiseImport(userId)

  const chooseFile = () => inputRef.current?.click()

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    setOwnColumn(null)
    previewMutation.reset()
    importMutation.reset()
    setOpen(true)

    if (file.size > MAX_FILE_BYTES) {
      setCsv(null)
      setTooLarge(true)
      return
    }

    setTooLarge(false)
    const text = await file.text()
    setCsv(text)
    previewMutation.mutate(text)
  }

  const runImport = () => {
    if (csv === null || ownColumn === null) {
      return
    }
    importMutation.mutate(
      { csv, ownColumn },
      {
        onSuccess: (summary) => {
          const counts = countsText(summary)
          toast.success(t`Imported ${counts}`)
          setOpen(false)
        },
      },
    )
  }

  const onOpenChange = (next: boolean) => {
    if (!importMutation.isPending) {
      setOpen(next)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={chooseFile}
        className="flex min-h-11 w-full items-center gap-3 rounded-md py-2 text-left text-[15px] text-foreground/80 hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <span className="flex-1">
          <Trans>Import from Splitwise</Trans>
        </span>
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={onFileChange}
        data-testid="splitwise-file"
      />

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent>
          <SheetHeader className="pt-3">
            <SheetTitle>
              <Trans>Import from Splitwise</Trans>
            </SheetTitle>
          </SheetHeader>
          {tooLarge ? (
            <StatusBody message={t`This file is too large.`}>
              <ChooseAnotherButton onClick={chooseFile} />
            </StatusBody>
          ) : previewMutation.data ? (
            <SummaryBody
              contact={contact}
              preview={previewMutation.data}
              ownColumn={ownColumn}
              onOwnColumnChange={(column) => {
                setOwnColumn(column)
                importMutation.reset()
              }}
              importing={importMutation.isPending}
              importFailed={importMutation.isError}
              onImport={runImport}
              onClose={() => setOpen(false)}
            />
          ) : previewMutation.isError ? (
            isWrongFile(previewMutation.error) ? (
              <StatusBody message={t`This file isn’t a supported Splitwise export.`}>
                <ChooseAnotherButton onClick={chooseFile} />
              </StatusBody>
            ) : (
              <StatusBody message={t`Couldn’t check the file.`}>
                <PrimaryButton onClick={() => csv !== null && previewMutation.mutate(csv)}>
                  <Trans>Try again</Trans>
                </PrimaryButton>
              </StatusBody>
            )
          ) : (
            <>
              <SheetDescription className="sr-only">
                <Trans>Checking the file</Trans>
              </SheetDescription>
              <Spinner label={t`Checking the file`} className="py-10" />
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

function isWrongFile(error: Error) {
  return error instanceof ApiError && (error.status === 422 || error.status === 400)
}

function countsText(summary: SplitwiseImportSummary) {
  const expenseCount = summary.expenses
  const paymentCount = summary.transfers
  const expenses = plural(expenseCount, { one: '# expense', other: '# expenses' })
  const payments = plural(paymentCount, { one: '# payment', other: '# payments' })
  return translate`${expenses} and ${payments}`
}

function StatusBody({ message, children }: { message: string; children: ReactNode }) {
  return (
    <>
      <div className="px-4">
        <SheetDescription className="text-foreground">{message}</SheetDescription>
      </div>
      <SheetFooter className="pb-6">{children}</SheetFooter>
    </>
  )
}

function ChooseAnotherButton({ onClick }: { onClick: () => void }) {
  return (
    <PrimaryButton onClick={onClick}>
      <Trans>Choose another file</Trans>
    </PrimaryButton>
  )
}

type SummaryBodyProps = {
  contact: ContactListItem
  preview: SplitwiseImportPreview
  ownColumn: OwnColumn | null
  onOwnColumnChange: (column: OwnColumn) => void
  importing: boolean
  importFailed: boolean
  onImport: () => void
  onClose: () => void
}

function SummaryBody({
  contact,
  preview,
  ownColumn,
  onOwnColumnChange,
  importing,
  importFailed,
  onImport,
  onClose,
}: SummaryBodyProps) {
  const { t } = useLingui()
  const summary = ownColumn === null ? null : preview.options[ownColumn]
  const hasMismatch = preview.mismatch !== null
  const offBy = preview.mismatch === null ? '' : formatPln(preview.mismatch)

  return (
    <>
      <fieldset
        className={cn('flex flex-col gap-2 px-4', summary === null && 'pb-6')}
        disabled={importing}
      >
        <legend className="mb-2 text-[15px] text-muted-foreground">
          <Trans>Which one are you?</Trans>
        </legend>
        <div className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
          {preview.names.map((name, index) => (
            <label
              key={index}
              className="flex h-10 min-w-0 cursor-pointer items-center justify-center rounded-full px-3 text-[15px] font-medium text-foreground/80 has-checked:bg-background has-checked:font-semibold has-checked:text-foreground has-checked:shadow-[0_1px_2px_rgb(0_0_0/0.08)] has-focus-visible:ring-2 has-focus-visible:ring-ring"
            >
              <input
                type="radio"
                name="splitwise-own-column"
                className="sr-only"
                checked={ownColumn === index}
                onChange={() => onOwnColumnChange(index as OwnColumn)}
              />
              <span className="truncate">{name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {summary === null || ownColumn === null ? (
        <SheetDescription className="sr-only">
          <Trans>Choose which person in the file is you.</Trans>
        </SheetDescription>
      ) : summary.expenses + summary.transfers === 0 ? (
        <>
          <div className="px-4 pt-4">
            <SheetDescription className="text-foreground">
              <Trans>Nothing new to import.</Trans>
            </SheetDescription>
          </div>
          <SheetFooter className="pb-6">
            <Button variant="outline" className="h-12 rounded-full text-base" onClick={onClose}>
              <Trans>Close</Trans>
            </Button>
          </SheetFooter>
        </>
      ) : (
        <>
          <div className="px-4 pt-4">
            <SheetDescription className="leading-[1.45] text-foreground">
              <SummaryText
                summary={summary}
                ownName={preview.names[ownColumn]}
                otherName={preview.names[ownColumn === 0 ? 1 : 0]}
                contactName={getShortName(contact.person.displayName)}
              />
            </SheetDescription>
          </div>
          <SheetFooter className="pb-6">
            {importFailed ? (
              <p role="alert" className="text-[13px] text-muted-foreground">
                <Trans>Couldn’t import. Nothing was added.</Trans>
              </p>
            ) : (
              hasMismatch && (
                <p className="text-[13px] text-muted-foreground">
                  {t`The file’s rows don’t add up to its total (off by ${offBy}).`}
                </p>
              )
            )}
            <PrimaryButton pending={importing} pendingLabel={t`Importing…`} onClick={onImport}>
              {importFailed ? (
                <Trans>Try again</Trans>
              ) : hasMismatch ? (
                <Trans>Import anyway</Trans>
              ) : (
                <Trans>Import</Trans>
              )}
            </PrimaryButton>
          </SheetFooter>
        </>
      )}
    </>
  )
}

function SummaryText({
  summary,
  ownName,
  otherName,
  contactName,
}: {
  summary: SplitwiseImportSummary
  ownName: string
  otherName: string
  contactName: string
}) {
  const { t } = useLingui()
  const counts = countsText(summary)
  const skippedCount = summary.skipped
  const amount = formatPln(summary.balance)
  const direction = balanceDirection(summary.balance)
  const balanceText =
    direction === 'owed'
      ? t`After import, ${contactName} owes you ${amount}.`
      : direction === 'owe'
        ? t`After import, you owe ${contactName} ${amount}.`
        : t`After import, you’re settled up.`

  return (
    <>
      {t`${counts} between ${ownName} and ${otherName}.`}{' '}
      {skippedCount > 0 && <>{plural(skippedCount, { other: '# skipped.' })} </>}
      {balanceText}
    </>
  )
}
