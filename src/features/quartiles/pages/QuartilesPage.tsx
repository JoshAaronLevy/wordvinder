import { useEffect, useMemo, useState } from 'react'
import { Message } from 'primereact/message'
import Board from '../components/Board'
import BoardControls from '../components/BoardControls'
import SavedBoards from '../components/SavedBoards'
import WordList from '../components/WordList'
import { calculateTotalPossibilities, generateCombinations } from '../logic/generator'
import type { QuartileWords } from '../types'
import { getLowerWordSet } from '../../../shared/dictionary/englishWords'

const BOARD_SIZE = 20

function QuartilesPage() {
  const [tiles, setTiles] = useState<string[]>(Array(BOARD_SIZE).fill(''))
  const [selected, setSelected] = useState<number[]>([])
  const [words, setWords] = useState<QuartileWords>({
    twoTiles: [],
    threeTiles: [],
    fourTiles: [],
  })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [wordSet, setWordSet] = useState<Set<string> | null>(null)
  const [isDictionaryLoading, setIsDictionaryLoading] = useState(true)
  const [dictionaryError, setDictionaryError] = useState<string | null>(null)

  const selectedTiles = selected.map((index) => tiles[index]).filter(Boolean)
  const totalPossibilities = useMemo(
    () => calculateTotalPossibilities(selectedTiles.length),
    [selectedTiles.length],
  )

  useEffect(() => {
    let isMounted = true
    getLowerWordSet()
      .then((set) => {
        if (!isMounted) return
        setWordSet(set)
        setDictionaryError(null)
      })
      .catch((error: Error) => {
        if (!isMounted) return
        console.error(error)
        setWordSet(null)
        setDictionaryError('Unable to load dictionary data.')
      })
      .finally(() => {
        if (isMounted) {
          setIsDictionaryLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleToggleTile = (index: number) => {
    setSelected((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    )
  }

  const handleAddTile = (value: string) => {
    const next = [...tiles]
    const emptyIndex = next.findIndex((tile) => !tile)
    if (emptyIndex === -1) return
    next[emptyIndex] = value
    setTiles(next)
  }

  const handleAnalyze = () => {
    if (!wordSet) return
    setIsAnalyzing(true)
    const combos = generateCombinations(selectedTiles, wordSet)
    setWords(combos)
    setIsAnalyzing(false)
  }

  const handleClearSelection = () => setSelected([])
  const handleClearBoard = () => {
    setTiles(Array(BOARD_SIZE).fill(''))
    setSelected([])
    setWords({ twoTiles: [], threeTiles: [], fourTiles: [] })
  }

  const handleLoadBoard = (loadedTiles: string[]) => {
    const next = loadedTiles.slice(0, BOARD_SIZE)
    if (next.length < BOARD_SIZE) {
      next.push(...Array(BOARD_SIZE - next.length).fill(''))
    }
    setTiles(next)
    setSelected([])
    setWords({ twoTiles: [], threeTiles: [], fourTiles: [] })
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Quartiles Vinder (Finder)</p>
          <h1>Select tiles and discover words comprised of 1-5 tiles.</h1>
          <p className="muted">
            Add tile text, select any tiles on the grid, and analyze to find valid words. Save or
            load boards to continue later.
          </p>
        </div>
      </div>
      {dictionaryError ? (
        <Message severity="error" text="Dictionary failed to load. Analysis is unavailable." />
      ) : (
        isDictionaryLoading && <Message severity="info" text="Loading dictionary data..." />
      )}

      <div className="quartiles-layout">
        <div className="quartiles-board-column">
          <BoardControls
            tiles={tiles}
            selected={selected}
            onAddTile={handleAddTile}
            onAnalyze={handleAnalyze}
            onClearSelection={handleClearSelection}
            onClearBoard={handleClearBoard}
            disabled={isAnalyzing}
            canAnalyze={!!wordSet}
          >
            <Board tiles={tiles} selected={selected} onToggle={handleToggleTile} />
          </BoardControls>
          <SavedBoards tiles={tiles} onLoad={handleLoadBoard} />
        </div>
        <div className="quartiles-sidebar">
          <WordList
            words={words}
            totalPossibilities={totalPossibilities}
            isAnalyzing={isAnalyzing}
          />
        </div>
      </div>
    </section>
  )
}

export default QuartilesPage
