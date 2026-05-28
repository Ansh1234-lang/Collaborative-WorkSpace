import { create } from 'zustand'
import api from '../lib/api'


// types

export interface Card {
    id: string
    title: string
    description?: string
    priority: 'LOW' | 'High' | 'URGENT'
    position: number
    columnId: string
    dueDate?: string
    assignee?: { id: string; name: string; avatarUrl?: string } | null
}

export interface Column {
    id: string
    name: string
    position: number
    cards:Card[]
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
    crearedAt: string
    user: { id: string; name: string; avatarUrl?: string }
}

// store
interface WorkspaceState {
    workspaces: Workspace[]
    currentWorkspace: Workspace | null
    messages: Message[]
    isLoading: boolean

    // Actions
    fetchWorkspaces: () => Promise<void>
    fetchWorkspace: (id: string) => Promise<void>
    createWorkspace: (name: string, description?: string) => Promise<Workspace>

    // Real-time updates (called from socket event handlers)
    addMessage: (message: Message) => void
    moveCard: (cardId: string, newColumnId: string, newPosition: number) => void
    updateCard: (card: Partial<Card> & { id: string }) => void
    addCard: (card: Card) => void
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  currentWorkspace: null,
  messages: [],
  isLoading: false,
 
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
}))
 