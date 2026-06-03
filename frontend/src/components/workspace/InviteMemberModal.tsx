'use client'

import { useState } from 'react'
import { useWorkspaceStore } from '@/src/store/workspace.store'

interface Props {
  workspaceId: string
  isOpen: boolean
  onClose: () => void
}

export default function InviteMemberModal({
  workspaceId,
  isOpen,
  onClose,
}: Props) {
  const { inviteMember } = useWorkspaceStore()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  async function handleInvite() {
    try {
      setLoading(true)

      await inviteMember(workspaceId, email)

      setEmail('')
      onClose()
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          'Failed to invite member'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">
          Invite Member
        </h2>

        <input
          type="email"
          placeholder="Enter email"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          className="w-full border rounded-lg p-2"
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={handleInvite}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            {loading
              ? 'Inviting...'
              : 'Invite'}
          </button>
        </div>
      </div>
    </div>
  )
}