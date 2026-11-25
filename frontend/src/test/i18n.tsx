import { I18nProvider } from '@lingui/react'
import { i18n } from '@lingui/core'
import type { ReactNode } from 'react'
import '@/i18n/i18n'

/** Wrap anything rendered outside `renderRoutes` that uses Lingui (`<Trans>`, `useLingui`). */
export function TestI18nProvider({ children }: { children: ReactNode }) {
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>
}
