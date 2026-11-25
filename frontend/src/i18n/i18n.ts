import { i18n } from '@lingui/core'
import { messages as englishMessages } from '@/locales/en.po'

export const supportedLocales = ['en', 'pl'] as const
export type Locale = (typeof supportedLocales)[number]

const sourceLocale: Locale = 'en'

i18n.load(sourceLocale, englishMessages)
i18n.activate(sourceLocale)

function isSupportedLocale(language: string): language is Locale {
  return (supportedLocales as readonly string[]).includes(language)
}

/** The first browser language we have a catalog for, matched on its base tag ("pl-PL" → "pl"). */
export function resolveLocale(
  languages: readonly string[] = navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language],
): Locale {
  for (const language of languages) {
    const baseLanguage = language.toLowerCase().split('-')[0]
    if (isSupportedLocale(baseLanguage)) {
      return baseLanguage
    }
  }
  return sourceLocale
}

// Call once at boot: core `t` strings and the cached Intl formatters don't follow a later switch,
// so changing the language at runtime needs a reload.
export async function activateLocale(locale: Locale): Promise<void> {
  if (locale === 'pl') {
    const { messages } = await import('@/locales/pl.po')
    i18n.load('pl', messages)
  }
  i18n.activate(locale)
  document.documentElement.lang = locale
}

/** The active UI locale, for the `Accept-Language` header. */
export function currentLocale(): Locale {
  return isSupportedLocale(i18n.locale) ? i18n.locale : sourceLocale
}

// International English: day-first dates ("Wed, 22 Oct") and Monday-first weeks, without a country.
const formattingLocales: Record<Locale, string> = { en: 'en-001', pl: 'pl-PL' }

/** The BCP-47 tag `Intl` formatters use for the active locale. */
export function formattingLocale(): string {
  return formattingLocales[currentLocale()]
}
