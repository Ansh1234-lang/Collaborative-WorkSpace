import { CardContentProps } from './card.type'

const PRIORITY_COLORS = {
  LOW: 'bg-gray-100 text-gray-600',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
}

export default function CardContent({ card }: CardContentProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-gray-800 break-words">
          {card.title}
        </h4>

        <span
          className={`text-[10px] px-2 py-1 rounded-full font-medium ${
            PRIORITY_COLORS[card.priority]
          }`}
        >
          {card.priority}
        </span>
      </div>

      {card.description && (
        <p className="text-xs text-gray-500">
          {card.description}
        </p>
      )}

      {card.assignee && (
        <div className="flex items-center gap-2 pt-1">
          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
            {card.assignee.name.charAt(0)}
          </div>

          <span className="text-xs text-gray-600">
            {card.assignee.name}
          </span>
        </div>
      )}

      {card.dueDate && (
        <div className="text-xs text-gray-400">
          Due: {new Date(card.dueDate).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}