'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { useWorkspaceStore } from '@/src/store/workspace.store'
import { useAuthStore } from '@/src/store/auth.store'
import { useSocket } from '@/src/hooks/useSocket'

import { KanbanBoard } from '@/src/components/board/kanbanBoard'
import { ChatPanel } from '@/src/components/chat/chatPanel'
import InviteMemberModal from '@/src/components/workspace/InviteMemberModal'

export default function WorkspacePage() {
  const params = useParams()
  const workspaceId = params.workspaceId as string
  const router = useRouter()
  const [inviteOpen, setInviteOpen] = useState(false)

  const { user } = useAuthStore()

  const {
    fetchActivities,
    currentWorkspace,
    onlineUsers,
    fetchWorkspace,
    isLoading,
  } = useWorkspaceStore()

  useSocket(workspaceId)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchActivities(workspaceId)
    fetchWorkspace(workspaceId)
  }, [workspaceId, user])

  if (isLoading || !currentWorkspace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">
          Loading workspace...
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back
            </button>

            <h1 className="font-semibold text-gray-900">
              {currentWorkspace.name}
            </h1>

            {/* Members */}
            <div className="flex flex-wrap gap-2">
              {currentWorkspace.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded-lg"
                >
                  {/* Avatar + Online Status */}
                  <div className="relative">
                    <div className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-medium">
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>

                    {onlineUsers.includes(member.user.id) && (
                      <div
                        className="
                          absolute
                          -bottom-0.5
                          -right-0.5
                          w-3
                          h-3
                          rounded-full
                          bg-green-500
                          border-2
                          border-white
                        "
                      />
                    )}
                  </div>

                  <span className="text-sm">
                    {member.user.name}
                  </span>

                  {member.role === 'OWNER' && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                      Owner
                    </span>
                  )}

                  {member.role === 'ADMIN' && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      Admin
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Invite Member */}
          <button
            onClick={() => setInviteOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Invite Member
          </button>
        </header>

        {/* Main Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Board */}
          <div className="flex-1 overflow-hidden">
            <KanbanBoard
              boards={currentWorkspace.boards}
              workspaceId={workspaceId}
            />
          </div>

          {/* Chat */}
          <div className="w-72 border-l border-gray-200 shrink-0">
            <ChatPanel workspaceId={workspaceId} />
          </div>
        </div>
      </div>

      {/* Invite Member Modal */}
      <InviteMemberModal
        workspaceId={workspaceId}
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />
    </>
  )
}