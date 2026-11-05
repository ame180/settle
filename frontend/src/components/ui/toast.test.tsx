import { describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { toast } from 'sonner'
import { Toaster } from './toast'

describe('Toaster', () => {
  it('shows a toast in a live region', async () => {
    render(<Toaster />)

    act(() => {
      toast.success('Expense added')
    })

    expect(await screen.findByText('Expense added')).toBeInTheDocument()
  })
})
