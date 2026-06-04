'use client'

import { useWorkspaceStore } from '@/src/store/workspace.store'

export default function ActivityPanel() {
  const { activities } =
    useWorkspaceStore()

  return (
    <div className="w-80 border-l bg-white overflow-y-auto">
      <div className="p-4 border-b">
        <h2 className="font-semibold">
          Activity Feed
        </h2>
      </div>

      <div className="p-4 space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="border rounded-lg p-3"
          >
            <p className="text-sm">
              {activity.description}
            </p>

            <p className="text-xs text-gray-500 mt-1">
              {activity.user.name}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}