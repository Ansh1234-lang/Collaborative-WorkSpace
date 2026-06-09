'use client'

import { useState } from 'react'
import { Bot, Send, Sparkles } from 'lucide-react'
import { useAiStore } from '@/src/store/ai.store'

interface AiChatPanelProps {
  workspaceId: string
}

const QUICK_PROMPTS = [
  'What tasks are overdue?',
  "Summarize today's work",
  'Who is the most active member?',
  'Show project progress',
]

export default function AiChatPanel({ workspaceId }: AiChatPanelProps) {
  const { messages, isLoading, sendMessage, generateProjectSummary } = useAiStore()
  const [input, setInput] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const message = input.trim()
    if (!message || isLoading) return

    setInput('')
    await sendMessage(workspaceId, message)
  }

  async function handlePrompt(prompt: string) {
    if (isLoading) return
    await sendMessage(workspaceId, prompt)
  }

  async function handleSummary() {
    if (isLoading) return
    await generateProjectSummary(workspaceId)
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Bot size={16} />
          </div>
          <h2 className="text-sm font-semibold text-gray-800">
            AI Assistant
          </h2>
        </div>

        <button
          type="button"
          onClick={handleSummary}
          disabled={isLoading}
          title="Generate weekly project summary"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-indigo-600 disabled:opacity-50"
        >
          <Sparkles size={16} />
        </button>
      </div>

      <div className="border-b border-gray-100 px-3 py-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => handlePrompt(prompt)}
              disabled={isLoading}
              className="shrink-0 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="py-8 text-center text-xs text-gray-400">
            Ask about tasks, progress, members, or sprint planning.
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-5 ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="text-xs text-gray-400">
            Thinking...
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI..."
            className="flex-1 rounded-full bg-gray-100 px-3 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            title="Send"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  )
}
