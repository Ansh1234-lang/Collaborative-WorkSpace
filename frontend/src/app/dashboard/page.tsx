'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/src/store/auth.store'
import { useWorkspaceStore } from '@/src/store/workspace.store'

export default function DashboardPage() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { workspaces, fetchWorkspaces, createWorkspace, isLoading } = useWorkspaceStore()

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchWorkspaces()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const ws = await createWorkspace(newName.trim())
      setNewName('')
      setShowCreate(false)
      router.push(`/workspace/${ws.id}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-900">Collab Workspace</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.name}</span>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Your workspaces</h1>
            <p className="text-gray-500 mt-1">Select a workspace or create a new one</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + New workspace
          </button>
        </div>

        {/* Create workspace form */}
        {showCreate && (
          <form onSubmit={handleCreate} className="bg-white border border-gray-200 rounded-xl p-5 mb-6 flex gap-3">
            <input
              autoFocus
              type="text"
              placeholder="Workspace name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={creating}
              className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-sm text-gray-500 hover:text-gray-800 px-3 py-2"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Workspaces grid */}
        {isLoading ? (
          <div className="text-gray-400 text-sm">Loading workspaces...</div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg font-medium text-gray-600 mb-1">No workspaces yet</p>
            <p className="text-sm">Create your first workspace to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => router.push(`/workspace/${ws.id}`)}
                className="bg-white border border-gray-200 rounded-xl p-5 text-left hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-brand-200 transition-colors">
                  <span className="text-brand-700 font-semibold text-sm">
                    {ws.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{ws.name}</h3>
                {ws.description && (
                  <p className="text-xs text-gray-500 mb-3 line-clamp-2">{ws.description}</p>
                )}
                <p className="text-xs text-gray-400">
                  {ws.members?.length || 0} member{ws.members?.length !== 1 ? 's' : ''}
                </p>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

// workspace page kanban +chat layout page.tsx