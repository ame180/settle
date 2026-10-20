import { AddExpenseButton } from '@/components/AddExpenseButton'
import { PageHeader } from '@/components/PageHeader'

export function FeedPage() {
  return (
    <>
      <PageHeader title="Activity" />
      <p className="p-4 text-sm text-muted-foreground">
        Your expenses and transfers will show up here.
      </p>
      <AddExpenseButton />
    </>
  )
}
