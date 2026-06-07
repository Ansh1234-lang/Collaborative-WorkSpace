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
  const [showEdit, setShowEdit] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const {
    fetchActivities,
    currentWorkspace,
    onlineUsers,
    fetchWorkspace,
    isLoading,
    deleteWorkspace,
    updateWorkspace
  } = useWorkspaceStore()

  async function handleDelete() {
    const confirmed = window.confirm(
      'Are you sure you want to delete this workspace?'
    )

    if (!confirmed) return

    try {
      await deleteWorkspace(workspaceId)
      router.push('/dashboard')
    } catch (error) {
      console.error(error)
    }
  }

  async function handleUpdate() {
    try {
      await updateWorkspace(workspaceId, {
        name,
        description,
      })

      setShowEdit(false)
    } catch (error) {
      console.error(error)
    }
  }

  useSocket(workspaceId)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }
    fetchActivities(workspaceId)
    fetchWorkspace(workspaceId)
  }, [workspaceId, user])
  useEffect(() => {
    if (currentWorkspace) {
      setName(currentWorkspace.name)
      setDescription(currentWorkspace.description || '')
    }
  }, [currentWorkspace])

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
            </h1><div className="flex items-center gap-2">
              <button
                onClick={() => setShowEdit(true)}
                className="px-3 py-1 text-sm rounded bg-blue-500 text-white"
              >
                Edit
              </button>

              <button
                onClick={handleDelete}
                className="px-3 py-1 text-sm rounded bg-red-500 text-white"
              >
                Delete
              </button>
            </div>

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
        {/* Edit Workspace Modal */}
        {showEdit && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-semibold mb-4">
                Edit Workspace
              </h2>

              <div className="space-y-4">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Workspace Name"
                  className="w-full border rounded-lg px-3 py-2"
                />

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description"
                  rows={4}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowEdit(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>

                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
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