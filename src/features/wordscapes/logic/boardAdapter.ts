import type { BoardState } from '../../../services/analyzeBoard'
import type { WordFinderSubmission, WordGroup } from '../types'

const normalizeToken = (value: string) => value.trim().toUpperCase()

const buildTargetLengths = (slots: BoardState['unsolvedSlots']) => {
  const lengths = slots
    .filter((slot) => Number.isFinite(slot.length) && slot.length > 0 && slot.count > 0)
    .map((slot) => slot.length)

  const unique = Array.from(new Set(lengths))
  unique.sort((a, b) => a - b)
  return unique
}

export const mapBoardToSubmission = (board: BoardState): WordFinderSubmission => {
  const letters = board.letters.map(normalizeToken).filter(Boolean)
  const wordLengths = buildTargetLengths(board.unsolvedSlots ?? [])

  return {
    letters,
    letterCount: letters.length,
    wordLengths: wordLengths.length ? wordLengths : undefined,
  }
}

export const filterSolvedWords = (groups: WordGroup[], solvedWords: string[]): WordGroup[] => {
  if (!solvedWords.length) return groups

  const solvedSet = new Set(solvedWords.map(normalizeToken).filter(Boolean))
  if (!solvedSet.size) return groups

  return groups.reduce<WordGroup[]>((acc, group) => {
    const words = group.words.filter((word) => !solvedSet.has(word.toUpperCase()))
    if (words.length) {
      acc.push({ ...group, words })
    }
    return acc
  }, [])
}
