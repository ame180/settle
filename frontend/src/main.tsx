import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { I18nProvider } from '@lingui/react'
import { i18n } from '@lingui/core'
import { activateLocale, resolveLocale } from './i18n/i18n'
import { createQueryClient } from './app/queryClient'
import { router } from './app/router'
import { Toaster } from './components/ui/toast'
import './index.css'

const queryClient = createQueryClient()

// English is bundled, so a Polish catalog that fails to load still leaves a working app.
await activateLocale(resolveLocale()).catch(() => activateLocale('en'))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
    </I18nProvider>
  </StrictMode>,
)
