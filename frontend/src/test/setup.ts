import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import '@/i18n/i18n'

afterEach(() => {
  cleanup()
})

// jsdom lacks matchMedia; vaul (bottom sheet) queries it.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}

// jsdom lacks scrollIntoView; forms call it to bring an error into view.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// jsdom lacks pointer capture; vaul calls it when a press starts inside the sheet.
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.hasPointerCapture = () => false
}

// jsdom computes vaul's exit animation but never fires animationend, so Radix would keep a
// closed sheet mounted.
const noAnimations = document.createElement('style')
noAnimations.textContent = '*, *::before, *::after { animation: none !important; }'
document.head.append(noAnimations)
