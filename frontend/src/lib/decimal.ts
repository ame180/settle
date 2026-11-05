// Exact decimal arithmetic on strings via BigInt, the way bcmath does it on the server.

/** A decimal string as an integer count of 10^-scale units, truncating extra digits like bcmath. */
export function toScaled(decimal: string, scale: number): bigint {
  const match = /^(-?)(\d*)(?:\.(\d*))?$/.exec(decimal.trim())
  if (!match) {
    throw new Error(`Not a decimal number: ${decimal}`)
  }

  const [, sign, integerPart, fractionPart = ''] = match
  const digits = (integerPart || '0') + fractionPart.slice(0, scale).padEnd(scale, '0')
  const value = BigInt(digits)

  return sign === '-' ? -value : value
}

export function fromScaled(value: bigint, scale: number): string {
  const negative = value < 0n
  const digits = (negative ? -value : value).toString().padStart(scale + 1, '0')
  const integerPart = digits.slice(0, digits.length - scale)
  const fractionPart = digits.slice(digits.length - scale)

  return `${negative ? '-' : ''}${integerPart}${scale > 0 ? `.${fractionPart}` : ''}`
}
