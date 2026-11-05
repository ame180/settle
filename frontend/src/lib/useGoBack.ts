import { useLocation, useNavigate } from 'react-router'

/**
 * Back to the previous in-app screen, or to `fallback` when this page is the first entry.
 * The browser router stores the entry's index in history.state; a replace keeps it, so a page
 * reached by redirect from /login still counts as first. The memory router (tests) has no index,
 * so there the first location's 'default' key decides.
 */
export function useGoBack(fallback: string) {
  const navigate = useNavigate()
  const { key } = useLocation()
  const historyIndex: unknown = window.history.state?.idx
  const hasInAppHistory = typeof historyIndex === 'number' ? historyIndex > 0 : key !== 'default'

  const goBack = () => {
    if (hasInAppHistory) {
      navigate(-1)
      return
    }
    navigate(fallback, { replace: true })
  }

  return { hasInAppHistory, goBack }
}
