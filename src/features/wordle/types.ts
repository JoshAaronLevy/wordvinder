export const WORDLE_LETTER_COUNT = 5 as const

export type LetterState = 'correct' | 'present' | 'absent'

export type LetterSlot = {
  letter: string
  state: LetterState
}

export type Attempt = {
  letters: LetterSlot[]
}

export type AttemptHints = {
  positionHints: (string | null)[]
  letterStates: Record<string, LetterState>
}
