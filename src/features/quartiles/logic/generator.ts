import type { QuartileWords } from '../types'

const factorial = (num: number): number => {
  if (num < 0) return 0
  if (num <= 1) return 1
  return num * factorial(num - 1)
}

export const calculateTotalPossibilities = (numTiles: number): number => {
  let total = 0
  for (let size = 2; size <= 4; size++) {
    if (numTiles >= size) {
      const combinations = factorial(numTiles) / (factorial(size) * factorial(numTiles - size))
      const permutationsPerCombination = factorial(size)
      total += Math.round(combinations * permutationsPerCombination)
    }
  }
  return total
}

const getCombinations = <T,>(array: T[], k: number): T[][] => {
  if (k === 0) return [[]]
  if (k > array.length) return []

  const [first, ...rest] = array
  const withFirst = getCombinations(rest, k - 1).map((combo) => [first, ...combo])
  const withoutFirst = getCombinations(rest, k)
  return [...withFirst, ...withoutFirst]
}

const getPermutations = <T,>(array: T[]): T[][] => {
  if (array.length <= 1) return [array]

  const result: T[][] = []
  array.forEach((current, index) => {
    const remaining = [...array.slice(0, index), ...array.slice(index + 1)]
    getPermutations(remaining).forEach((perm) => {
      result.push([current, ...perm])
    })
  })
  return result
}

const generateCombinationsOfSize = (tiles: string[], size: number, wordSet: Set<string>): string[] => {
  if (tiles.length < size) return []

  const combinations = getCombinations(tiles, size)
  const permutations = combinations.flatMap((combo) =>
    getPermutations(combo).map((perm) => perm.join('')),
  )

  return [...new Set(permutations)]
    .map((word) => word.toLowerCase())
    .filter((word) => wordSet.has(word))
}

export const generateCombinations = (tiles: string[], wordSet: Set<string>): QuartileWords => {
  const result: QuartileWords = {
    twoTiles: [],
    threeTiles: [],
    fourTiles: [],
  }

  if (tiles.length >= 2) {
    result.twoTiles = generateCombinationsOfSize(tiles, 2, wordSet)
  }

  if (tiles.length >= 3) {
    result.threeTiles = generateCombinationsOfSize(tiles, 3, wordSet)
  }

  if (tiles.length >= 4) {
    result.fourTiles = generateCombinationsOfSize(tiles, 4, wordSet)
  }

  return result
}
