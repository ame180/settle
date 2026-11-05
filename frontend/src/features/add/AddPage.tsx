import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { useMe } from '@/api/auth'
import { useContacts } from '@/api/contacts'
import type { MeResponse } from '@/api/types'
import { todayIso } from '@/lib/dates'
import { DiscardSheet } from './DiscardSheet'
import { emptyDraft, type ExpenseDraft } from './expenseDraft'
import { ExpenseForm } from './ExpenseForm'
import { useGoBack, useLeaveGuard } from './navigation'
import { Header, Loading } from './ScreenFrame'

/**
 * /add, full screen. `?contact=<userId>` (opened from a contact) prefills that person and
 * starts on the title; otherwise the user starts by picking people.
 */
export function AddPage() {
  const { data: me } = useMe()
  // RequireAuth only renders this with a signed-in user.
  return me ? <AddScreen me={me} /> : null
}

function AddScreen({ me }: { me: MeResponse }) {
  const [searchParams] = useSearchParams()
  const contactId = Number(searchParams.get('contact')) || null
  const { data: contacts, isError } = useContacts()

  // Wait for contacts before prefilling, so the form mounts with its starting state.
  if (contactId !== null && !contacts && !isError) {
    return <Loading />
  }

  const contact = contacts?.items.find((item) => item.person.id === contactId)
  const initialDraft = {
    ...emptyDraft(me.id, todayIso()),
    others: contact ? [contact.person] : [],
  }

  return <AddExpenseScreen me={me} initialDraft={initialDraft} />
}

function AddExpenseScreen({ me, initialDraft }: { me: MeResponse; initialDraft: ExpenseDraft }) {
  const [draft, setDraft] = useState(initialDraft)
  // The prefilled person isn't the user's input, so it doesn't make the form dirty.
  const dirty = JSON.stringify(draft) !== JSON.stringify(initialDraft)
  const guard = useLeaveGuard(dirty)
  const goBack = useGoBack('/')

  return (
    <div className="flex h-full flex-col">
      <Header title="Add expense" onClose={goBack} />
      <ExpenseForm
        me={me}
        draft={draft}
        onDraftChange={setDraft}
        mode={{ kind: 'create' }}
        initialFocus={initialDraft.others.length > 0 ? 'title' : 'people'}
        onSaved={(message) => {
          toast.success(message)
          guard.allowLeave()
          goBack()
        }}
      />
      <DiscardSheet
        open={guard.blocked}
        title="Discard this expense?"
        onDiscard={guard.discard}
        onKeepEditing={guard.keepEditing}
      />
    </div>
  )
}
