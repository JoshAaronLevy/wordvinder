import { useState } from 'react'
import { Button } from 'primereact/button'
import { Card } from 'primereact/card'
import { Dialog } from 'primereact/dialog'
import { InputText } from 'primereact/inputtext'
import { Message } from 'primereact/message'
import { Tag } from 'primereact/tag'
import { clearBoards, deleteBoard, loadBoards, saveBoard } from '../storage/localBoards'
import type { SavedBoard } from '../types'

type SavedBoardsProps = {
  tiles: string[]
  onLoad: (tiles: string[]) => void
}

function SavedBoards({ tiles, onLoad }: SavedBoardsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [boards, setBoards] = useState<SavedBoard[]>(() => loadBoards())

  const handleSave = () => {
    if (!name.trim()) return
    const newBoard = saveBoard(name.trim(), tiles)
    setBoards((prev) => [...prev, newBoard])
    setName('')
  }

  const handleDelete = (id: string) => {
    deleteBoard(id)
    setBoards(loadBoards())
  }

  const handleClear = () => {
    clearBoards()
    setBoards([])
  }

  const footer = (
    <div className="dialog-footer">
      <Button label="Close" icon="pi pi-times" severity="secondary" onClick={() => setIsOpen(false)} />
      <Button
        label="Clear all"
        icon="pi pi-trash"
        severity="secondary"
        outlined
        onClick={handleClear}
        disabled={!boards.length}
      />
    </div>
  )

  return (
    <Card className="quartiles-card" title="Saved boards">
      <div className="actions">
        <Button label="Open saved boards" icon="pi pi-folder" onClick={() => setIsOpen(true)} />
      </div>

      <Dialog
        header="Saved boards"
        visible={isOpen}
        onHide={() => setIsOpen(false)}
        footer={footer}
        style={{ width: '500px' }}
      >
        <div className="save-form">
          <label className="label" htmlFor="board-name">
            Save current board
          </label>
          <div className="save-controls">
            <InputText
              id="board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Board name"
            />
            <Button
              label="Save"
              icon="pi pi-save"
              onClick={handleSave}
              disabled={!name.trim()}
            />
          </div>
        </div>

        {boards.length === 0 ? (
          <Message severity="warn" text="No boards saved yet." />
        ) : (
          <div className="boards-list">
            {boards.map((board) => (
              <div key={board.id} className="board-row">
                <div>
                  <p className="board-name">{board.name}</p>
                  <small className="muted">
                    {new Date(board.createdAt).toLocaleString()} • {board.tiles.filter(Boolean).length}{' '}
                    tiles
                  </small>
                </div>
                <div className="board-actions">
                  <Tag value={`${board.tiles.filter(Boolean).length}/20`} severity="secondary" />
                  <Button
                    label="Load"
                    icon="pi pi-download"
                    onClick={() => {
                      onLoad(board.tiles)
                      setIsOpen(false)
                    }}
                  />
                  <Button
                    label="Delete"
                    icon="pi pi-trash"
                    severity="secondary"
                    outlined
                    onClick={() => handleDelete(board.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </Dialog>
    </Card>
  )
}

export default SavedBoards
