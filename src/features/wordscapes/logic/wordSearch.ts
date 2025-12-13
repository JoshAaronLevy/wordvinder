import type { WordFinderSubmission, WordGroup } from '../types'

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

export const findMatchingWords = (
  {
    letters,
    wordLengths,
  }: Pick<WordFinderSubmission, 'letters' | 'wordLengths'>,
  wordsByLength: Record<number, string[]>,
): WordGroup[] => {
  if (!letters.length) return []

  const availableCounts = makeLetterCounts(letters)
  const targetLengths = wordLengths?.length ? wordLengths : [3, 4, 5, 6, 7, 8]

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
