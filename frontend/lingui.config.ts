import { defineConfig } from '@lingui/conf'
import { formatter } from '@lingui/format-po'

export default defineConfig({
  sourceLocale: 'en',
  locales: ['en', 'pl'],
  catalogs: [
    {
      path: '<rootDir>/src/locales/{locale}',
      include: ['<rootDir>/src'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '<rootDir>/src/test/**'],
    },
  ],
  format: formatter({ lineNumbers: false }),
})
