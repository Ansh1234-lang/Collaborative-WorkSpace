'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Board,Card } from '@/src/store/workspace.store' 
import { useWorkspaceStore } from '@/src/store/workspace.store' 
import { getSocket } from '@/src/lib/socket' 
import { KanbanColumn } from './kanbanColumn' 
import { CardItem } from './card'
import api from '@/src/lib/api' 

interface KanbanBoardProps {
  boards: Board[]
  workspaceId: string
}

export function KanbanBoard({ boards, workspaceId }: KanbanBoardProps) {
  const { moveCard } = useWorkspaceStore()
  const [activeCard, setActiveCard] = useState<Card | null>(null)

  // PointerSensor with a small activation distance prevents
  // accidental drags when clicking to open a card
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  function onDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === 'card') {
      setActiveCard(event.active.data.current.card)
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveCard(null)
    const { active, over } = event

    if (!over || active.id === over.id) return

    const activeData = active.data.current
    if (activeData?.type !== 'card') return

    const card: Card = activeData.card
    const newColumnId = over.data.current?.columnId || over.id as string
    const newPosition = over.data.current?.position ?? 0

    // 1. Optimistic update — move in local store immediately
    moveCard(card.id, newColumnId as string, newPosition)

    // 2. Emit to socket — other users see the change instantly
    const socket = getSocket()
    socket.emit('card:move', {
      workspaceId,
      cardId: card.id,
      newColumnId,
      newPosition,
    })

    // 3. Persist to DB via REST (socket handler also does this,
    //    but REST gives us a direct error response if it fails)
    try {
      console.log({newColumnId,newPosition})
      await api.patch(`/boards/cards/${card.id}/move`, {
        newColumnId: newColumnId,
        newPosition: newPosition,
      })
    } catch (err) {
      console.error('Failed to persist card move', err)
      // In production: revert the optimistic update here
    }
  }

  // Use the first board for now (multi-board support comes later)
  const board = boards[0]
  if (!board) return (
    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
      No boards yet
    </div>
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto px-5 py-5">
        {board.columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            workspaceId={workspaceId}
          />
        ))}
      </div>

      {/* DragOverlay renders the card being dragged */}
      <DragOverlay>
        {activeCard && <CardItem card={activeCard} isDragging />}
      </DragOverlay>
    </DndContext>
  )
}