import { useMemo, useState } from 'react'
import { Card } from 'primereact/card'
import { Dropdown } from 'primereact/dropdown'
import { Message } from 'primereact/message'
import { Tag } from 'primereact/tag'
import type { QuartileWords } from '../types'

type WordListProps = {
  words: QuartileWords
  totalPossibilities: number
  isAnalyzing?: boolean
}

const tabOptions = [
  { label: 'All words', value: 'all' },
  { label: '2 tiles', value: 'twoTiles' },
  { label: '3 tiles', value: 'threeTiles' },
  { label: '4 tiles', value: 'fourTiles' },
]

type TabKey = 'all' | 'twoTiles' | 'threeTiles' | 'fourTiles'

function WordList({ words, totalPossibilities, isAnalyzing }: WordListProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('all')

  const totalCount = useMemo(
    () =>
      (words.twoTiles?.length || 0) + (words.threeTiles?.length || 0) + (words.fourTiles?.length || 0),
    [words],
  )

  const items = useMemo(() => {
    if (activeTab === 'all') {
      return [...(words.twoTiles || []), ...(words.threeTiles || []), ...(words.fourTiles || [])]
    }
    return words[activeTab] || []
  }, [activeTab, words])

  return (
    <Card className="quartiles-card" title="Possible words">
      <div className="wordlist-header">
        <Tag value={`${totalCount} matches`} severity="info" />
        <Tag value={`${totalPossibilities} permutations`} severity="secondary" />
      </div>

      <div className="wordlist-controls">
        <Dropdown
          value={activeTab}
          options={tabOptions}
          onChange={(e) => setActiveTab(e.value)}
          placeholder="Filter by size"
        />
      </div>

      {isAnalyzing ? (
        <Message severity="info" text="Analyzing combinations..." />
      ) : items.length === 0 ? (
        <Message
          severity="warn"
          text="Select tiles and analyze to see matching words for 2–4 tile combos."
        />
      ) : (
        <div className="wordlist-grid" aria-live="polite">
          {items.map((word) => (
            <span key={word} className="word-pill">
              {word.toUpperCase()}
            </span>
          ))}
        </div>
      )}
    </Card>
  )
}

export default WordList
