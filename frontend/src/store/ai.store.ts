import { create } from 'zustand'
import api from '../lib/api'

export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface CardDescriptionResponse {
  description: string
  acceptanceCriteria: string[]
  technicalRequirements: string[]
  estimatedComplexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  formattedDescription: string
}

interface AiState {
  messages: AiMessage[]
  isLoading: boolean
  sendMessage: (workspaceId: string, message: string) => Promise<void>
  generateProjectSummary: (workspaceId: string) => Promise<string>
  generateTaskBreakdown: (workspaceId: string, title: string) => Promise<string[]>
  generateCardDescription: (
    workspaceId: string,
    title: string
  ) => Promise<CardDescriptionResponse>
  clearMessages: () => void
}

function createMessage(role: AiMessage['role'], content: string): AiMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  }
}

export const useAiStore = create<AiState>((set, get) => ({
  messages: [],
  isLoading: false,

  sendMessage: async (workspaceId, message) => {
    const userMessage = createMessage('user', message)
    set((state) => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
    }))

    try {
      const { data } = await api.post('/ai/chat', {
        workspaceId,
        message,
      })

      set((state) => ({
        messages: [...state.messages, createMessage('assistant', data.answer)],
        isLoading: false,
      }))
    } catch (error) {
      set((state) => ({
        messages: [
          ...state.messages,
          createMessage(
            'assistant',
            'AI assistant is unavailable right now. Please try again in a moment.'
          ),
        ],
        isLoading: false,
      }))
      throw error
    }
  },

  generateProjectSummary: async (workspaceId) => {
    set({ isLoading: true })

    try {
      const { data } = await api.post('/ai/project-summary', { workspaceId })
      const summary = data.summary as string

      set((state) => ({
        messages: [...state.messages, createMessage('assistant', summary)],
        isLoading: false,
      }))

      return summary
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  generateTaskBreakdown: async (workspaceId, title) => {
    const { data } = await api.post('/ai/task-breakdown', {
      workspaceId,
      title,
    })

    return data.steps
  },

  generateCardDescription: async (workspaceId, title) => {
    const { data } = await api.post('/ai/card-description', {
      workspaceId,
      title,
    })

    return data
  },

  clearMessages: () => {
    set({ messages: [] })
  },
}))
