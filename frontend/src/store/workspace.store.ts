import { create } from 'zustand'
import api from '../lib/api'
import { promises } from 'dns'


// types

export interface Card {
  id: string
  title: string
  description?: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  position: number
  columnId: string
  dueDate?: string
  assignee?: { id: string; name: string; avatarUrl?: string } | null
}

export interface Column {
  id: string
  name: string
  position: number
  cards: Card[]
}

export interface Board {
  id: string
  name: string
  position: number
  columns: Column[]
}

export interface WorkspaceMember {
  id: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  user: { id: string; name: string; email: string; avatarUrl?: string }
}

export interface Workspace {
  id: string
  name: string
  slug: string
  description?: string
  members: WorkspaceMember[]
  boards: Board[]
}
export interface Message {
  id: string
  content: string
  createdAt: string
  user: { id: string; name: string; avatarUrl?: string }
}
export interface Activity {
  id: string
  action: string
  description: string
  createdAt: string

  user: {
    id: string
    name: string
    avatarUrl?: string
  }
}

// store
interface WorkspaceState {
  activities: Activity[]
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  messages: Message[]
  isLoading: boolean

  // Actions
  fetchActivities: (workspaceId: string) => Promise<void>
  fetchWorkspaces: () => Promise<void>
  fetchWorkspace: (id: string) => Promise<void>
  createWorkspace: (name: string, description?: string) => Promise<Workspace>
  addActivity: (activity: Activity) => void
  // Real-time updates (called from socket event handlers)
  onlineUsers: string[]
  setOnlineUsers: (users: string[]) => void
  addMessage: (message: Message) => void
  moveCard: (cardId: string, newColumnId: string, newPosition: number) => void
  updateCard: (card: Partial<Card> & { id: string }) => void
  addCard: (card: Card) => void
  deleteCard: (cardId: string) => void
  inviteMember: (WorkspaceId: string, email: string) => Promise<void>
  addMember: (member: WorkspaceMember) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  activities: [],
  onlineUsers: [],
  workspaces: [],
  currentWorkspace: null,
  messages: [],
  isLoading: false,


  fetchActivities: async (workspaceId) => {
    const { data } = await api.get(
      `/activities/workspace/${workspaceId}`
    )

    set({
      activities: data.activities,
    })
  },
  addActivity: (activity) => {
    set((state) => ({
      activities: [
        activity,
        ...state.activities,
      ],
    }))
  },
  fetchWorkspaces: async () => {
    set({ isLoading: true })
    const { data } = await api.get('/workspaces')
    set({ workspaces: data.workspaces, isLoading: false })
  },

  fetchWorkspace: async (id: string) => {
    set({ isLoading: true })
    const { data } = await api.get(`/workspaces/${id}`)
    // Also load recent messages
    const msgData = await api.get(`/messages/workspace/${id}`)
    set({
      currentWorkspace: data.workspace,
      messages: msgData.data.messages,
      isLoading: false,
    })
  },

  createWorkspace: async (name, description) => {
    const { data } = await api.post('/workspaces', { name, description })
    set((state) => ({ workspaces: [...state.workspaces, data.workspace] }))
    return data.workspace
  },


  // ── Real-time mutations ─────────────────────────────────
  // These are called by socket event handlers.
  // They do optimistic-style updates directly to the store.

  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }))
  },

  moveCard: (cardId, newColumnId, newPosition) => {
    set((state) => {
      if (!state.currentWorkspace) return state

      const boards = state.currentWorkspace.boards.map((board) => ({
        ...board,
        columns: board.columns.map((col) => ({
          ...col,
          cards: col.id === newColumnId
            // Add to new column
            ? [...col.cards.filter((c) => c.id !== cardId), {
              ...col.cards.find((c) => c.id === cardId) ||
              state.currentWorkspace!.boards
                .flatMap((b) => b.columns)
                .flatMap((c) => c.cards)
                .find((c) => c.id === cardId)!,
              columnId: newColumnId,
              position: newPosition,
            }].sort((a, b) => a.position - b.position)
            // Remove from old column
            : col.cards.filter((c) => c.id !== cardId),
        })),
      }))

      return { currentWorkspace: { ...state.currentWorkspace, boards } }
    })
  },

  updateCard: (updatedCard) => {
    set((state) => {
      if (!state.currentWorkspace) return state

      const boards = state.currentWorkspace.boards.map((board) => ({
        ...board,
        columns: board.columns.map((col) => ({
          ...col,
          cards: col.cards.map((card) =>
            card.id === updatedCard.id ? { ...card, ...updatedCard } : card
          ),
        })),
      }))

      return { currentWorkspace: { ...state.currentWorkspace, boards } }
    })
  },

  addCard: (card) => {
    set((state) => {
      if (!state.currentWorkspace) return state

      const boards = state.currentWorkspace.boards.map((board) => ({
        ...board,
        columns: board.columns.map((col) =>
          col.id === card.columnId
            ? { ...col, cards: [...col.cards, card].sort((a, b) => a.position - b.position) }
            : col
        ),
      }))

      return { currentWorkspace: { ...state.currentWorkspace, boards } }
    })
  },
  setOnlineUsers: (users) => {
    set({ onlineUsers: users })
  },
  deleteCard: (cardId) => {
    set((state) => {
      if (!state.currentWorkspace) return state

      const boards = state.currentWorkspace.boards.map((board) => ({
        ...board,
        columns: board.columns.map((column) => ({
          ...column,
          cards: column.cards.filter(
            (card) => card.id !== cardId
          ),
        })),
      }))

      return {
        currentWorkspace: {
          ...state.currentWorkspace,
          boards,
        },
      }
    })
  },
  inviteMember: async (workspaceId, email) => {
    const { data } = await api.post(
      `/workspaces/${workspaceId}/invite`,
      { email }
    )

    set((state) => {
      if (!state.currentWorkspace) return state

      return {
        currentWorkspace: {
          ...state.currentWorkspace,
          members: [
            ...state.currentWorkspace.members,
            data.member,
          ],
        },
      }
    })
  },
  addMember: (member) => {
    set((state) => {
      if (!state.currentWorkspace) return state
      const alreadyExists = state.currentWorkspace.members.some((m) => m.id === member.id)
      if (alreadyExists) return state
      return {
        currentWorkspace: {
          ...state.currentWorkspace,
          members: [
            ...state.currentWorkspace.members,
            member,
          ],
        },
      }
    })
  },

}))
