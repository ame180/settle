import type { ExpenseCategory } from '@/api/types'

// Word stems, matched at the start of any word in the title, without diacritics. Polish words
// inflect, so stems ("zakup" matches "zakupy", "zakupów") do most of the work. First match wins,
// so the more specific categories come first.
const keywords: [ExpenseCategory, string][] = [
  [
    'groceries',
    'zakup biedronk lidl auchan carrefour kaufland zabk netto dino stokrot spozyw warzyw owoc ' +
      'chleb mleko grocer supermarket shopping tesco aldi frisco',
  ],
  [
    'food_and_drink',
    'pizz obiad kolac sniadan lunch dinner breakfast brunch kaw coffee piw beer win drink ' +
      'restaur bar pub kebab sushi burger mcdonald kfc pyszne glovo wolt eats lody ciast cafe ' +
      'jedzeni food takeaway pierog ramen',
  ],
  [
    'transport',
    'uber bolt taxi taks paliw benzyn fuel petrol orlen shell bilet ticket pkp pociag train ' +
      'autobus bus tramwaj metro parking flight lot samolot ryanair wizz flixbus car auto ' +
      'myjni toll autostrad',
  ],
  [
    'home_and_bills',
    'czynsz rent prad electric gaz gas woda water internet wifi rachun bill oplat media ikea ' +
      'castorama leroy mebl sprzat clean netflix spotify abonament subscription telefon phone ' +
      'home dom mieszkan flat',
  ],
  [
    'entertainment',
    'kino cinema movie film teatr theatre theater koncert concert muzeum museum gra game ' +
      'bowling escape festiwal festival impreza party karaoke basen pool silown gym wycieczk ' +
      'trip hotel nocleg airbnb booking wakacj holiday',
  ],
  ['gifts', 'prezent gift urodzin birthday imienin swiat christmas kwiat flower'],
  [
    'health',
    'aptek pharmac lek medic doctor dentyst dentist szpital hospital witamin vitamin fizjo ' +
      'physio okulist badani',
  ],
]

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l')
}

/** The category a title suggests, or null when nothing matches (the form keeps General). */
export function guessCategory(title: string): ExpenseCategory | null {
  const words = normalize(title)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
  const match = keywords.find(([, stems]) =>
    stems.split(' ').some((stem) => words.some((word) => word.startsWith(stem))),
  )

  return match?.[0] ?? null
}
