import type { Attempt, LetterState } from '../types'

const WORD_LENGTH = 5

const isPositiveState = (state: LetterState) => state === 'correct' || state === 'present'

export function suggestWords(attempts: Attempt[], candidates: string[]): string[] {
  if (!attempts.length) return candidates.filter((word) => word.length === WORD_LENGTH)

  return candidates.filter((candidate) =>
    candidate.length === WORD_LENGTH &&
    attempts.every((attempt) =>
      attempt.letters.every((slot, index) => {
        const letter = slot.letter.toLowerCase()
        const currentChar = candidate[index]

        if (!letter || letter.length !== 1) {
          return true
        }

        switch (slot.state) {
          case 'correct':
            return letter === currentChar
          case 'present':
            return letter !== currentChar && candidate.includes(letter)
          case 'absent': {
            if (!candidate.includes(letter)) return true

            const markedElsewhere = attempt.letters.some(
              (other, otherIndex) =>
                otherIndex !== index &&
                other.letter.toLowerCase() === letter &&
                isPositiveState(other.state),
            )

            return markedElsewhere
          }
          default:
            return true
        }
      }),
    ),
  )
}
