/** True when the previous history entry is a screen of this app, so going back stays in the app. */
export function hasInAppHistory(): boolean {
  return (window.history.state?.idx ?? 0) > 0
}
