import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/api'
import { disconnectSocket } from '../lib/socket'
// import { connectSocket } from '../lib/socket'

interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean

  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })

        try {
          const { data } = await api.post('/auth/login', {
            email,
            password,
          })

          localStorage.setItem('token', data.token)

          set({
            user: data.user,
            token: data.token,
            isLoading: false,
          })

          // connectSocket(data.token)
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (name, email, password) => {
        set({ isLoading: true })

        try {
          const { data } = await api.post('/auth/register', {
            name,
            email,
            password,
          })

          localStorage.setItem('token', data.token)

          set({
            user: data.user,
            token: data.token,
            isLoading: false,
          })

          // connectSocket(data.token)
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: () => {
        localStorage.removeItem('token')

        disconnectSocket()

        set({
          user: null,
          token: null,
          isLoading: false,
        })
      },

      initialize: async () => {
        console.log('INIT START')

        const token = localStorage.getItem('token')

        if (!token) {
          console.log('NO TOKEN FOUND')

          set({
            user: null,
            token: null,
            isLoading: false,
          })

          return
        }

        try {
          console.log('CALLING /auth/me')

          const { data } = await api.get('/auth/me')

          console.log('AUTH SUCCESS', data)

          set({
            user: data.user,
            token,
            isLoading: false,
          })

          // connectSocket(token)
        } catch (error) {
          console.error('INIT FAILED', error)

          localStorage.removeItem('token')

          set({
            user: null,
            token: null,
            isLoading: false,
          })
        }
      },
    }),
    {
      name: 'auth-storage',

      partialize: (state) => ({
        token: state.token,
      }),
    }
  )
)