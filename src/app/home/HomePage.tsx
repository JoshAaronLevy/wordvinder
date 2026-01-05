import { useNavigate } from 'react-router-dom'
import { Card } from 'primereact/card'

import WordleImage from '../../assets/Wordle.png'
import QuartilesImage from '../../assets/Quartiles.png'
import WordscapesImage from '../../assets/Wordscapes.png'

const helpers = [
  {
    key: 'wordscapes',
    title: 'Wordscapes',
    description: 'Enter 4–8 letters and an optional length to find valid words fast.',
    path: '/wordscapes',
    image: WordscapesImage,
    imageAlt: 'Wordscapes solver example letters',
  },
  {
    key: 'wordle',
    title: 'Wordle',
    description: 'Enter your attempts and tile states to narrow down 5-letter answers.',
    path: '/wordle',
    image: WordleImage,
    imageAlt: 'Wordle solver helper interface preview',
  },
  {
    key: 'quartiles',
    title: 'Quartiles',
    description: 'Select tiles, generate 2–4 letter combinations, and page through results.',
    path: '/quartiles',
    image: QuartilesImage,
    imageAlt: 'Quartiles helper tiles example',
  },
]

function HomePage() {
  const navigate = useNavigate()
  const handleNavigate = (path: string) => navigate(path)

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">The Ultimate Word Game Assistant</p>
          <h1>Game Type</h1>
          <p className="muted">
            Select a game type in order to launch the word finder for that game.
          </p>
        </div>
      </div>

      <div className="tile-grid">
        {helpers.map((helper) => (
          <Card
            key={helper.key}
            className="tile-card"
            title={helper.title}
            onClick={() => handleNavigate(helper.path)}
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                handleNavigate(helper.path)
              }
            }}
          >
            <div className="tile-illustration">
              <img src={helper.image} alt={helper.imageAlt} loading="lazy" />
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}

export default HomePage
