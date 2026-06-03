'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useWorkspaceStore } from '@/src/store/workspace.store'
import CardContent from './CardContent'
import CardModal from './CardModal'
import { CardItemProps } from './card.type'

export default function CardItem({
  card,
  isDragging = false,
}: CardItemProps) {
  const [open, setOpen] = useState(false)
  const {currentWorkspace} = useWorkspaceStore()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: card.id,
    data: {
      type: 'card',
      card,
      columnId: card.columnId,
      position: card.position,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`
          bg-white rounded-xl border border-gray-200
          p-3 shadow-sm cursor-grab active:cursor-grabbing
          hover:shadow-md transition-shadow
          ${isDragging ? 'opacity-50' : ''}
        `}
      >
        <div
          onClick={(e) => {
            e.stopPropagation()
            setOpen(true)
          }}
        >
          <CardContent card={card} />
        </div>
      </div>

      <CardModal
        card={card}
        members={currentWorkspace?.members ||[]}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  )
}