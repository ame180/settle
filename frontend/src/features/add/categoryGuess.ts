import type { ExpenseCategory } from '@/api/types'

// Word stems, matched at the start of any word in the title, without diacritics. Polish words
// inflect, so stems ("zakup" matches "zakupy", "zakupów") do most of the work. Stems of three
// letters or fewer, and stems ending in ".", must be the whole word ("bus" isn't "business").
// First match wins, so the more specific categories come first.
const keywords: [ExpenseCategory, string][] = [
  [
    'groceries',
    'zakup biedronk lidl auchan carrefour kaufland zabk netto dino stokrot spozyw warzyw owoc ' +
      'chleb mleko grocer supermarket shopping tesco aldi frisco',
  ],
  [
    'food_and_drink',
    'pizz obiad kolac sniadan lunch dinner breakfast brunch kawa kawy kawe kawk kawiarn coffee piwo piwa piwk beer wino wina wine drink ' +
      'restaur bar pub kebab sushi burger mcdonald kfc pyszne glovo wolt eats lody ciast cafe. ' +
      'jedzeni food takeaway pierog ramen',
  ],
  [
    'transport',
    'uber bolt taxi taks paliw benzyn fuel petrol orlen shell bilet ticket pkp pociag train. trains ' +
      'autobus bus tramwaj metro parking flight lot lotnisk samolot ryanair wizz flixbus car auto ' +
      'myjni toll autostrad',
  ],
  [
    'home_and_bills',
    'czynsz rent. prad electric gaz gas woda water internet wifi rachun bill. bills oplat media ikea ' +
      'castorama leroy mebl sprzat clean netflix spotify abonament subscription telefon phone ' +
      'home. dom mieszkan flat.',
  ],
  [
    'entertainment',
    'kino cinema movie film teatr theatre theater koncert concert muzeum museum gra gry game ' +
      'bowling escape festiwal festival impreza party karaoke basen pool silown gym wycieczk ' +
      'trip. trips hotel nocleg airbnb booking wakacj holiday',
  ],
  ['gifts', 'prezent gift urodzin birthday imienin swiet swiateczn christmas kwiat flower'],
  [
    'health',
    'aptek pharmac leki lekow lekarz medic doctor dentyst dentist szpital hospital witamin vitamin fizjo ' +
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
    stems.split(' ').some((stem) => words.some((word) => matchesStem(word, stem))),
  )

  return match?.[0] ?? null
}

function matchesStem(word: string, stem: string): boolean {
  if (stem.endsWith('.') || stem.length <= 3) {
    return word === stem.replace(/\.$/, '')
  }

  return word.startsWith(stem)
}
