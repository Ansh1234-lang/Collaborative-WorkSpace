'use client'

import { useEffect, useState } from 'react'
import api from '@/src/lib/api'
import { Card, useWorkspaceStore } from '@/src/store/workspace.store'
import { WorkspaceMember } from '@/src/store/workspace.store'
import { useAiStore } from '@/src/store/ai.store'
import { Sparkles } from 'lucide-react'

interface CardModalProps {
  card: Card
  members: WorkspaceMember[]
  isOpen: boolean
  onClose: () => void
}

export default function CardModal({
  card,
  members,
  isOpen,
  onClose,
}: CardModalProps) {
  const { updateCard, deleteCard, currentWorkspace } = useWorkspaceStore()
  const { generateCardDescription } = useAiStore()

  const [assigneeId, setAssigneeId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<
    'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  >('MEDIUM')

  const [saving, setSaving] = useState(false)
  const [generatingDescription, setGeneratingDescription] = useState(false)

  useEffect(() => {
    if (!card) return

    setTitle(card.title)
    setDescription(card.description || '')
    setPriority(card.priority),

      setDueDate(
        card.dueDate
          ? new Date(card.dueDate)
            .toISOString()
            .split('T')[0]
          : ''
      )
    setAssigneeId(card.assignee?.id || '')
  }, [card])

  if (!isOpen) return null
  async function handleDelete() {
    if (!window.confirm('Delete this card')) return
    try {
      await api.delete(`/boards/cards/${card.id}`)

      deleteCard(card.id)

      onClose()
    } catch (err) {
      console.log('Failed to delete card', err)
    }

  }

  async function handleSave() {
    try {
      setSaving(true)

      const { data } = await api.patch(
        `/boards/cards/${card.id}`,
        {
          title,
          description,
          priority,
          dueDate,
          assigneeId: assigneeId || null,
        }
      )

      updateCard(data.card)

      onClose()
    } catch (error) {
      console.error('Failed to update card:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleGenerateDescription() {
    if (!currentWorkspace?.id || !title.trim()) return

    try {
      setGeneratingDescription(true)
      const generated = await generateCardDescription(
        currentWorkspace.id,
        title.trim()
      )
      setDescription(generated.formattedDescription)
      setPriority(generated.estimatedComplexity)
    } finally {
      setGeneratingDescription(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Card Details
          </h2>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">

          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Title
            </label>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>

              <button
                type="button"
                onClick={handleGenerateDescription}
                disabled={!title.trim() || generatingDescription}
                title="Generate AI Description"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
              >
                <Sparkles size={16} />
              </button>
            </div>

            <textarea
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add description..."
            />
          </div>

          {/* Priority */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Priority
            </label>

            <select
              value={priority}
              onChange={(e) =>
                setPriority(
                  e.target.value as
                  | 'LOW'
                  | 'MEDIUM'
                  | 'HIGH'
                  | 'URGENT'
                )
              }
              className="w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>

          {/*DueDate  */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Due Date
            </label>

            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2"
            />
          </div>
          {/* assignee Dropdown */}
          <div>
            <label className='mb-1 block text-sm font-medium text-gray-700'>
              Assignee
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2"
            >
              <option value="">
                Unassigned
              </option>
              {members.map((member) => (
                <option
                  key={member.user.id}
                  value={member.user.id}
                >
                  {member.user.name}
                </option>
              ))}
            </select>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4">
            <button 
            onClick={handleDelete} 
            className='rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700'>
              Delete Card
            </button>
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
