'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Column } from '@/src/store/workspace.store' 
import { useWorkspaceStore } from '@/src/store/workspace.store' 
import { CardItem } from './CardItem' 
import api from '@/src/lib/api'

interface KanbanColumnProps {
  column: Column
  workspaceId: string
}

const PRIORITY_COLORS = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
}

export function KanbanColumn({ column, workspaceId }: KanbanColumnProps) {
  const { addCard } = useWorkspaceStore()
  const [addingCard, setAddingCard] = useState(false)
  const [newCardTitle, setNewCardTitle] = useState('')
  const [creating, setCreating] = useState(false)

  // useDroppable makes this column a drop target
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: 'column', columnId: column.id },
  })

  async function handleAddCard(e: React.FormEvent) {
    e.preventDefault()
    if (!newCardTitle.trim()) return
    setCreating(true)

    try {
      const { data } = await api.post(`/boards/columns/${column.id}/cards`, {
        title: newCardTitle.trim(),
      })
      addCard(data.card)
      setNewCardTitle('')
      setAddingCard(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col w-64 shrink-0">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-800 text-sm">{column.name}</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
            {column.cards.length}
          </span>
        </div>
      </div>

      {/* Cards drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2 min-h-[100px] rounded-xl p-2 transition-colors ${
          isOver ? 'bg-brand-50 border-2 border-brand-200' : 'bg-gray-100'
        }`}
      >
        <SortableContext
          items={column.cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {column.cards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
        </SortableContext>

        {/* Add card form */}
        {addingCard ? (
          <form onSubmit={handleAddCard} className="bg-white rounded-lg p-2 shadow-sm">
            <textarea
              autoFocus
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Card title"
              rows={2}
              className="w-full text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleAddCard(e as any)
                }
                if (e.key === 'Escape') setAddingCard(false)
              }}
            />
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                disabled={creating}
                className="bg-brand-600 text-white text-xs px-3 py-1.5 rounded-md disabled:opacity-60"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => { setAddingCard(false); setNewCardTitle('') }}
                className="text-gray-400 text-xs px-2 py-1.5 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAddingCard(true)}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 text-sm px-2 py-1.5 rounded-lg text-left transition-colors w-full"
          >
            + Add card
          </button>
        )}
      </div>
    </div>
  )
}