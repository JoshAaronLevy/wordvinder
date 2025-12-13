import { type ReactNode, useState } from 'react'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { InputText } from 'primereact/inputtext'
import { Tag } from 'primereact/tag'

type BoardControlsProps = {
  tiles: string[]
  selected: number[]
  onAddTile: (value: string) => void
  onAnalyze: () => void
  onClearSelection: () => void
  onClearBoard: () => void
  disabled?: boolean
  canAnalyze?: boolean
  children?: ReactNode
}

function BoardControls({
  tiles,
  selected,
  onAddTile,
  onAnalyze,
  onClearSelection,
  onClearBoard,
  disabled,
  canAnalyze = true,
  children,
}: BoardControlsProps) {
  const [newTile, setNewTile] = useState('')

  const hasEmptySpot = tiles.some((tile) => !tile)
  const selectedCount = selected.length

  const handleAdd = () => {
    if (!newTile.trim() || !hasEmptySpot) return
    onAddTile(newTile.trim().toLowerCase())
    setNewTile('')
  }

  return (
    <Card className="quartiles-card" title="Board controls">
      <div className="board-controls-layout">
        <div className="board-controls-panel">
          <div className="controls-grid">
            <div className="field">
              <label className="label" htmlFor="new-tile">
                New tile text
              </label>
              <InputText
                id="new-tile"
                value={newTile}
                onChange={(e) => setNewTile(e.target.value)}
                maxLength={4}
                placeholder="Enter letters"
              />
              <small className="muted">Up to 4 characters. Fills the next empty tile.</small>
            </div>
            <div className="actions">
              <Button
                label="Add tile"
                icon="pi pi-plus"
                onClick={handleAdd}
                disabled={!newTile.trim() || !hasEmptySpot || disabled}
              />
              <Button
                label="Analyze selected"
                icon="pi pi-chart-bar"
                severity="success"
                onClick={onAnalyze}
                disabled={!selectedCount || disabled || !canAnalyze}
              />
              <Button
                label="Clear selection"
                icon="pi pi-times"
                severity="secondary"
                outlined
                onClick={onClearSelection}
                disabled={!selectedCount || disabled}
              />
              <Button
                label="Clear board"
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                onClick={onClearBoard}
                disabled={tiles.every((tile) => !tile) || disabled}
              />
            </div>
          </div>

          <div className="controls-footer">
            <Tag value={`Tiles filled: ${tiles.filter(Boolean).length}/20`} severity="info" />
            <Tag value={`Selected: ${selectedCount}`} severity="info" />
          </div>
        </div>
        {children ? <div className="board-preview">{children}</div> : null}
      </div>
    </Card>
  )
}

export default BoardControls
