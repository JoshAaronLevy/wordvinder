import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './app/layout/Layout'
import NotFoundPage from './app/NotFoundPage'
import HomePage from './app/home/HomePage'
import QuartilesPage from './features/quartiles/pages/QuartilesPage'
import WordlePage from './features/wordle/pages/WordlePage'
import WordscapesPage from './features/wordscapes/pages/WordscapesPage'
import { pingDifyMarco } from './services/ping'
import './styles/tokens.css'
import './App.css'

function App() {
  useEffect(() => {
    void pingDifyMarco()
  }, [])

  return (
    <div className="app-shell">
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/wordle" element={<WordlePage />} />
          <Route path="/wordle-helper" element={<WordlePage />} />
          <Route path="/quartiles" element={<QuartilesPage />} />
          <Route path="/quartiles-helper" element={<QuartilesPage />} />
          <Route path="/wordscapes" element={<WordscapesPage />} />
          <Route path="/wordscapes-helper" element={<WordscapesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App
