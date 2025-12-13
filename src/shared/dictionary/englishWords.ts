const ALPHA = /^[A-Za-z]+$/
const DICTIONARY_API_URL = 'https://word-vinder-server.onrender.com/api/v1/dictionary'

type WordsByLength = Record<number, string[]>

let dictionaryPromise: Promise<string[]> | null = null
let lowerWordsPromise: Promise<string[]> | null = null
let upperWordsPromise: Promise<string[]> | null = null
let lowerSetPromise: Promise<Set<string>> | null = null
let wordleWordsPromise: Promise<string[]> | null = null
let wordscapesPromise: Promise<WordsByLength> | null = null

const normalizeWords = (payload: unknown): string[] => {
  if (!Array.isArray(payload)) {
    throw new Error('Dictionary payload must be an array')
  }

  return payload
    .filter(
      (word): word is string =>
        typeof word === 'string' && word.length > 0 && ALPHA.test(word),
    )
    .map((word) => word.trim())
}

const loadDictionary = async (): Promise<string[]> => {
  if (!dictionaryPromise) {
    dictionaryPromise = fetch(DICTIONARY_API_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load dictionary')
        }
        return response.json()
      })
      .then((data) => normalizeWords(data))
  }
  return dictionaryPromise
}

const getLowerWords = async () => {
  if (!lowerWordsPromise) {
    lowerWordsPromise = loadDictionary().then((words) => words.map((word) => word.toLowerCase()))
  }
  return lowerWordsPromise
}

const getUpperWords = async () => {
  if (!upperWordsPromise) {
    upperWordsPromise = loadDictionary().then((words) => words.map((word) => word.toUpperCase()))
  }
  return upperWordsPromise
}

export const getLowerWordSet = async () => {
  if (!lowerSetPromise) {
    lowerSetPromise = getLowerWords().then((words) => new Set(words))
  }
  return lowerSetPromise
}

export const getWordleWordList = async () => {
  if (!wordleWordsPromise) {
    wordleWordsPromise = getLowerWords().then((words) => words.filter((word) => word.length === 5))
  }
  return wordleWordsPromise
}

export const buildWordsByLength = (list: string[], min: number, max: number) =>
  list.reduce<WordsByLength>((acc, word) => {
    const len = word.length
    if (len >= min && len <= max) {
      const bucket = acc[len] ?? []
      bucket.push(word)
      acc[len] = bucket
    }
    return acc
  }, {})

export const getWordscapesWordsByLength = async () => {
  if (!wordscapesPromise) {
    wordscapesPromise = getUpperWords().then((words) => buildWordsByLength(words, 3, 8))
  }
  return wordscapesPromise
}
