'use client'

import { useEffect, useRef, useState } from 'react'
import { useWorkspaceStore } from '@/src/store/workspace.store'
import { useAuthStore } from '@/src/store/auth.store'
import { getSocket } from '@/src/lib/socket'
import { format } from 'date-fns'

interface ChatPanelProps {
  workspaceId: string
}

interface TypingUser {
  userId: string
  userName: string
}

export function ChatPanel({ workspaceId }: ChatPanelProps) {
  const { messages } = useWorkspaceStore()
  const { user } = useAuthStore()

  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState<TypingUser[]>([])

  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [messages])

  // Listen for typing events
  useEffect(() => {
    const socket = getSocket()

    socket.on(
      'typing:user_started',
      (data: { userId: string; userName: string }) => {
        if (data.userId === user?.id) return

        setIsTyping((prev) => {
          const exists = prev.some(
            (u) => u.userId === data.userId
          )

          if (exists) return prev

          return [...prev, data]
        })
      }
    )

    socket.on(
      'typing:user_stopped',
      (data: { userId: string }) => {
        setIsTyping((prev) =>
          prev.filter(
            (u) => u.userId !== data.userId
          )
        )
      }
    )

    return () => {
      socket.off('typing:user_started')
      socket.off('typing:user_stopped')
    }
  }, [user])

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    setInput(e.target.value)

    const socket = getSocket()

    socket.emit('typing:start', workspaceId)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', workspaceId)
    }, 1500)
  }

  function sendMessage(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault()

    if (!input.trim()) return

    const socket = getSocket()

    socket.emit('message:send', {
      workspaceId,
      content: input.trim(),
    })

    socket.emit('typing:stop', workspaceId)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    setInput('')
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 shrink-0">
        <h2 className="text-sm font-semibold text-gray-800">
          Team Chat
        </h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {messages.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-8">
            No messages yet. Say hello 👋
          </p>
        )}

        {messages.map((msg) => {
          const isOwn = msg.user.id === user?.id

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${
                isOwn
                  ? 'items-end'
                  : 'items-start'
              }`}
            >
              {!isOwn && (
                <span className="text-[10px] text-gray-400 mb-1 ml-1">
                  {msg.user.name}
                </span>
              )}

              <div
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                  isOwn
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>

              <span className="text-[10px] text-gray-400 mt-1">
                {format(
                  new Date(msg.createdAt),
                  'HH:mm'
                )}
              </span>
            </div>
          )
        })}

        {/* Typing Indicator */}
        {isTyping.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="flex gap-1">
              <span
                className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>

            <span>
              {isTyping
                .map((u) => u.userName)
                .join(', ')}
              {isTyping.length === 1
                ? ' is typing...'
                : ' are typing...'}
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="p-3 border-t border-gray-200 shrink-0"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 text-sm bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />

          <button
            type="submit"
            disabled={!input.trim()}
            className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center"
          >
            ➤
          </button>
        </div>
      </form>
    </div>
  )
}