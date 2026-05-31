'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useWorkspaceStore } from '@/src/store/workspace.store'
import { useAuthStore } from '@/src/store/auth.store'
import { useSocket } from '@/src/hooks/useSocket'
import { KanbanBoard } from '@/src/components/board/kanbanBoard'
import { ChatPanel } from '@/src/components/chat/chatPanel'

export default function WorkspacePage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const router = useRouter()

  const { user } = useAuthStore()
  const { currentWorkspace, fetchWorkspace, isLoading } = useWorkspaceStore()

  // Connect to Socket.IO room for this workspace
  useSocket(workspaceId)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchWorkspace(workspaceId)
  }, [workspaceId, user])

  if (isLoading || !currentWorkspace) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading workspace...</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-4 shrink-0">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Back
        </button>
        <h1 className="font-semibold text-gray-900">{currentWorkspace.name}</h1>
        <div className="flex items-center gap-1 ml-2">
          {currentWorkspace.members?.slice(0, 4).map((m) => (
            <div
              key={m.id}
              className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-medium text-brand-700 border-2 border-white -ml-1 first:ml-0"
              title={m.user.name}
            >
              {m.user.name.slice(0, 1).toUpperCase()}
            </div>
          ))}
        </div>
      </header>

      {/* Main content: kanban + chat side by side */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <KanbanBoard
            boards={currentWorkspace.boards}
            workspaceId={workspaceId}
          />
        </div>

        {/* Chat panel — fixed width on the right */}
        <div className="w-72 border-l border-gray-200 shrink-0">
          <ChatPanel workspaceId={workspaceId} />
        </div>
      </div>
    </div>
  )
}