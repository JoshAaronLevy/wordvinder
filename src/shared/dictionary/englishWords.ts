import rawWords from 'an-array-of-english-words'

const ALPHA = /^[A-Za-z]+$/

const sourceWords = (rawWords as string[]).filter((word) => ALPHA.test(word))

export const englishWordsLower: string[] = sourceWords.map((word) => word.toLowerCase())

export const englishWordsUpper: string[] = sourceWords.map((word) => word.toUpperCase())

export const englishWordsLowerSet = new Set(englishWordsLower)

export const buildWordsByLength = (list: string[], min: number, max: number) =>
  list.reduce<Record<number, string[]>>((acc, word) => {
    const len = word.length
    if (len >= min && len <= max) {
      acc[len] = acc[len] ? [...acc[len], word] : [word]
    }
    return acc
  }, {})
