'use client'

import { useEffect, useRef, useState } from 'react'
import { useWorkspaceStore } from '@/src/store/workspace.store'
import { useAuthStore } from '@/src/store/auth.store'
import { getSocket } from '@/src/lib/socket'
import { format } from 'date-fns'

interface ChatPanelProps {
  workspaceId: string
}

export function ChatPanel({ workspaceId }: ChatPanelProps) {
  const { messages } = useWorkspaceStore()
  const { user } = useAuthStore()
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Listen for typing indicators
  useEffect(() => {
    const socket = getSocket()

    socket.on('typing:user_started', (data: { userId: string; userName: string }) => {
      if (data.userId !== user?.id) {
        setIsTyping((prev) =>
          prev.includes(data.userName) ? prev : [...prev, data.userName]
        )
      }
    })

    socket.on('typing:user_stopped', (data: { userId: string }) => {
      setIsTyping((prev) => prev.filter((_, i) => i !== prev.indexOf(data.userId)))
    })

    return () => {
      socket.off('typing:user_started')
      socket.off('typing:user_stopped')
    }
  }, [user])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value)

    const socket = getSocket()

    // Emit typing:start and debounce typing:stop
    socket.emit('typing:start', workspaceId)

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing:stop', workspaceId)
    }, 1500)
  }

  function sendMessage(e: React.FormEvent) {
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
        <h2 className="text-sm font-semibold text-gray-800">Team chat</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin">
        {messages.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-8">
            No messages yet. Say hello!
          </p>
        )}

        {messages.map((msg) => {
          const isOwn = msg.user.id === user?.id

          return (
            <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
              {!isOwn && (
                <span className="text-[10px] text-gray-400 mb-1 ml-1">{msg.user.name}</span>
              )}
              <div
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${isOwn
                  ? 'bg-brand-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
              >
                {msg.content}
              </div>
              <span className="text-[10px] text-gray-300 mt-1 px-1">
                {format(new Date(msg.crearedAt), 'HH:mm')}
              </span>
            </div>
          )
        })}

        {/* Typing indicator */}
        {isTyping.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <div className="flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>{isTyping.join(', ')} {isTyping.length === 1 ? 'is' : 'are'} typing</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-3 border-t border-gray-200 shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Message..."
            className="flex-1 text-sm px-3 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="w-8 h-8 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}