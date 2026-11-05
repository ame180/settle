import { useEffect, useRef } from 'react'

// What's open on top of a form screen (a sheet, the people list), newest last. While any layer is
// open, the device back button closes the newest one instead of leaving the screen; the form's
// leave guard does the intercepting.
const layers: (() => void)[] = []

/** While `open`, back closes this layer by calling `close`. */
export function useCloseOnBack(open: boolean, close: () => void) {
  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })

  useEffect(() => {
    if (!open) {
      return
    }
    const layer = () => closeRef.current()
    layers.push(layer)
    return () => {
      layers.splice(layers.indexOf(layer), 1)
    }
  }, [open])
}

export function hasOpenLayer(): boolean {
  return layers.length > 0
}

export function closeTopLayer() {
  layers.at(-1)?.()
}
