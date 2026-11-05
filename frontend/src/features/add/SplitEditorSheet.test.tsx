import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SplitEditorSheet } from './SplitEditorSheet'
import { defaultSplit } from './splitModel'

const me = { id: 1, email: 'me@example.com', name: 'Me' }
const others = [
  { id: 2, displayName: 'Anna Kowalska', email: 'anna@example.com' },
  { id: 3, displayName: 'Ewa Nowak', email: 'ewa@example.com' },
]

function renderEditor(onDone = vi.fn()) {
  render(
    <SplitEditorSheet
      open
      onOpenChange={() => {}}
      me={me}
      others={others}
      total="240.00"
      split={defaultSplit(me.id)}
      payerListOpen={false}
      onDone={onDone}
    />,
  )
  return onDone
}

describe('SplitEditorSheet', () => {
  it('keeps Done disabled until amounts add up, then applies them', async () => {
    const onDone = renderEditor()

    await userEvent.click(await screen.findByRole('tab', { name: 'Amounts' }))
    const anna = screen.getByRole('textbox', { name: 'Anna Kowalska, amount in zł' })
    expect(anna).toHaveValue('80.00')

    await userEvent.clear(anna)
    await userEvent.type(anna, '60')
    expect(screen.getByText(/left to assign/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: /Fill the .* left/ }))
    expect(anna).toHaveValue('80.00')
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(onDone).toHaveBeenCalledWith(
      expect.objectContaining({
        payerId: 1,
        type: 'exact',
        excluded: [],
        values: { 1: '80.00', 2: '80.00', 3: '80.00' },
      }),
    )
  })

  it('brings back shares 3:2:4 after switching to another type and back', async () => {
    const onDone = renderEditor()

    await userEvent.click(await screen.findByRole('tab', { name: 'Shares' }))
    const more = (name: string) =>
      userEvent.click(screen.getByRole('button', { name: `One share more for ${name}` }))
    await more('You')
    await more('You')
    await more('Anna Kowalska')
    await more('Ewa Nowak')
    await more('Ewa Nowak')
    await more('Ewa Nowak')

    await userEvent.click(screen.getByRole('tab', { name: 'Percentages' }))
    expect(screen.getByRole('textbox', { name: 'Anna Kowalska, percent' })).toHaveValue('22.22')
    await userEvent.click(screen.getByRole('tab', { name: 'Shares' }))
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))

    expect(onDone).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'shares', values: { 1: '3', 2: '2', 3: '4' } }),
    )
  })

  it('says the user must pay or share', async () => {
    renderEditor()

    await userEvent.click(await screen.findByRole('button', { name: /Paid by/ }))
    await userEvent.click(screen.getByRole('radio', { name: /Ewa Nowak/ }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'You shares the cost' }))

    expect(screen.getByRole('alert')).toHaveTextContent('You need to pay or share in this expense.')
    expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled()
  })
})
