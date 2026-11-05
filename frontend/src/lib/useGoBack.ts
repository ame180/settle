import { useLocation, useNavigate } from 'react-router'

/**
 * Back to the previous in-app screen, or to `fallback` when this page was the first one opened
 * (React Router keys that first location 'default').
 */
export function useGoBack(fallback: string) {
  const navigate = useNavigate()
  const hasInAppHistory = useLocation().key !== 'default'

  const goBack = () => {
    if (hasInAppHistory) {
      navigate(-1)
      return
    }
    navigate(fallback, { replace: true })
  }

  return { hasInAppHistory, goBack }
}
