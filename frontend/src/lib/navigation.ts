import type { NavigateFunction } from 'react-router'

export function hasInAppHistory(): boolean {
  return (window.history.state?.idx ?? 0) > 0
}

/** Back to the previous in-app screen; `fallback` when the page was opened directly. */
export function navigateBack(navigate: NavigateFunction, fallback: string) {
  if (hasInAppHistory()) {
    navigate(-1)
    return
  }
  navigate(fallback, { replace: true })
}
