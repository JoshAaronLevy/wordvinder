import { useMemo, useState } from 'react'
import { Tag } from 'primereact/tag'
import ResultsPanel from '../components/ResultsPanel'
import WordFinderForm from '../components/WordFinderForm'
import { findMatchingWords } from '../logic/wordSearch'
import type { WordFinderSubmission, WordGroup } from '../types'

function WordscapesPage() {
  const [submission, setSubmission] = useState<WordFinderSubmission | null>(null)
  const [results, setResults] = useState<WordGroup[]>([])

  const totalCount = useMemo(
    () => results.reduce((sum, group) => sum + group.words.length, 0),
    [results],
  )

  const handleSubmit = (payload: WordFinderSubmission) => {
    setSubmission(payload)
    setResults(findMatchingWords(payload))
  }

  const handleReset = () => {
    setSubmission(null)
    setResults([])
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Wordscapes Vinder (Finder)</p>
          <h1>Filter words by letters and length</h1>
          <p className="muted">
            Choose 4–8 letters, optionally pick a target word length, and instantly see valid
            matches grouped by length.
          </p>
        </div>
        <div className="header-tags">
          <Tag value={`Total matches: ${totalCount}`} severity="info" />
          <Tag
            value={submission?.wordLength ? `${submission.wordLength}-letter focus` : 'All lengths'}
            severity="secondary"
          />
        </div>
      </div>

      <div className="wordscapes-layout">
        <div className="wordscapes-column">
          <WordFinderForm onSubmit={handleSubmit} onReset={handleReset} />
        </div>
        <div className="wordscapes-column">
          <ResultsPanel submission={submission} results={results} />
        </div>
      </div>
    </section>
  )
}

export default WordscapesPage
