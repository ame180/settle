import type * as React from 'react'
import { buttonClassName, type ButtonVariants } from './button-variants'

export type ButtonProps = React.ComponentProps<'button'> & ButtonVariants

function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonClassName({ variant, size, className })} {...props} />
}

export { Button }
