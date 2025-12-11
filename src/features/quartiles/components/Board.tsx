import classNames from 'classnames'

type BoardProps = {
  tiles: string[]
  selected: number[]
  onToggle: (index: number) => void
}

const GRID_ROWS = 5
const GRID_COLS = 4

function Board({ tiles, selected, onToggle }: BoardProps) {
  return (
    <div className="quartiles-board" role="grid" aria-label="Quartiles board">
      {Array.from({ length: GRID_ROWS }).map((_, row) => (
        <div key={row} className="quartiles-row" role="row">
          {Array.from({ length: GRID_COLS }).map((_, col) => {
            const index = row * GRID_COLS + col
            const value = tiles[index]
            const isSelected = selected.includes(index)

            return (
              <button
                key={col}
                type="button"
                className={classNames('quartiles-tile', { selected: isSelected, empty: !value })}
                onClick={() => value && onToggle(index)}
                aria-pressed={isSelected}
                aria-label={value ? `Tile ${index + 1}: ${value}` : `Empty tile ${index + 1}`}
              >
                {value || '—'}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export default Board
