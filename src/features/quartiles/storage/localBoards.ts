import type { SavedBoard } from '../types'

const STORAGE_KEY = 'quartilesBoards'

const safeParse = (value: string | null): SavedBoard[] => {
  if (!value) return []
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) {
      return parsed
    }
    return []
  } catch {
    return []
  }
}

export const loadBoards = (): SavedBoard[] => {
  if (typeof localStorage === 'undefined') return []
  return safeParse(localStorage.getItem(STORAGE_KEY))
}

export const saveBoard = (name: string, tiles: string[]): SavedBoard => {
  const boards = loadBoards()
  const board: SavedBoard = {
    id: crypto.randomUUID(),
    name,
    tiles,
    createdAt: new Date().toISOString(),
  }

  const next = [...boards, board]
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }
  return board
}

export const deleteBoard = (id: string) => {
  const boards = loadBoards().filter((board) => board.id !== id)
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards))
  }
}

export const clearBoards = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY)
  }
}
