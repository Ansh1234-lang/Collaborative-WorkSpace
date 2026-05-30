'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card } from '@/src/store/workspace.store' 
import { format } from 'date-fns' 


interface CardItemProps {
  card: Card
  isDragging?: boolean
}

const PRIORITY_STYLES = {
  LOW:    'bg-gray-100 text-gray-500',
  MEDIUM: 'bg-blue-50 text-blue-600',
  HIGH:   'bg-orange-50 text-orange-600',
  URGENT: 'bg-red-50 text-red-600',
}

const PRIORITY_LABELS = {
  LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent',
}

export function CardItem({ card, isDragging = false }: CardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: card.id,
    data: { type: 'card', card, columnId: card.columnId, position: card.position },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        bg-white rounded-lg p-3 shadow-sm border border-gray-100
        cursor-grab active:cursor-grabbing select-none
        hover:shadow-md hover:border-gray-200 transition-all
        ${isDragging ? 'shadow-xl rotate-2 border-brand-200' : ''}
      `}
    >
      <p className="text-sm text-gray-800 font-medium leading-snug mb-2">
        {card.title}
      </p>

      {card.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{card.description}</p>
      )}

      <div className="flex items-center justify-between">
        {/* Priority badge */}
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${PRIORITY_STYLES[card.priority]}`}>
          {PRIORITY_LABELS[card.priority]}
        </span>

        <div className="flex items-center gap-1.5">
          {/* Due date */}
          {card.dueDate && (
            <span className="text-[10px] text-gray-400">
              {format(new Date(card.dueDate), 'MMM d')}
            </span>
          )}

          {/* Assignee avatar */}
          {card.assignee && (
            <div
              className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-[9px] font-semibold text-brand-700"
              title={card.assignee.name}
            >
              {card.assignee.name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}