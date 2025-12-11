import { buildWordsByLength, englishWordsUpper } from '../../../shared/dictionary/englishWords'
import type { WordFinderSubmission, WordGroup } from '../types'

const wordsByLength = buildWordsByLength(englishWordsUpper, 3, 8)

const makeLetterCounts = (letters: string[]) =>
  letters.reduce<Record<string, number>>((map, letter) => {
    const upper = letter.toUpperCase()
    map[upper] = (map[upper] ?? 0) + 1
    return map
  }, {})

const canBuildWord = (word: string, available: Record<string, number>) => {
  const pool = { ...available }
  for (const char of word) {
    if (!pool[char]) return false
    pool[char] -= 1
  }
  return true
}

export const findMatchingWords = ({
  letters,
  wordLength,
}: Pick<WordFinderSubmission, 'letters' | 'wordLength'>): WordGroup[] => {
  if (!letters.length) return []

  const availableCounts = makeLetterCounts(letters)
  const targetLengths = wordLength ? [wordLength] : [3, 4, 5, 6, 7, 8]

  const groups: WordGroup[] = []

  targetLengths.forEach((len) => {
    const candidates = wordsByLength[len] ?? []
    if (!candidates.length) return

    const matches = candidates
      .filter((word) => canBuildWord(word, availableCounts))
      .sort((a, b) => a.localeCompare(b))

    if (matches.length) {
      groups.push({ length: len, words: matches })
    }
  })

  return groups
}
