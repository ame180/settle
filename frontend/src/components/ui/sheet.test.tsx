import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from './sheet'

describe('Sheet', () => {
  it('opens from its trigger and closes on Escape', async () => {
    render(
      <Sheet>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetTitle>Delete expense?</SheetTitle>
        </SheetContent>
      </Sheet>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(await screen.findByRole('dialog', { name: 'Delete expense?' })).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
