import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/api'
import { connectSocket, disconnectSocket } from '../lib/socket'



interface User {
    id: string,
    name: string,
    email: string,
    avatarUrl?: string
}
interface AuthState {
    user: User | null,
    token: string | null
    isLoading: boolean

    // action
    login: (email: string, password: string,) => Promise<void>
    register: (name: string, email: string, password: string) => Promise<void>
    logout: () => void
    initialize: () => Promise<void>
}

export const userAuthStore = create<AuthState>()(
    // persisit middleware saves state to localstorage automatically
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isLoading: false,

            login: async (email, password) => {
                set({ isLoading: true })
                try {
                    const { data } = await api.post('/auth/login', { email, password })
                    localStorage.setItem('token', data.token)
                    connectSocket(data.token) //connect socket right after login
                } catch (err) {
                    set({ isLoading: false })
                    throw err
                }

            },
            register: async (name, email, password) => {
                set({ isLoading: true })
                try {
                    const { data } = await api.post('/auth/register', { name, email, password })
                    localStorage.setItem('token', data.token)
                    connectSocket(data.token)
                    set({ user: data.user, token: data.token, isLoading: false })
                } catch (err) {
                    set({ isLoading: false })
                    throw err
                }
            },
            logout: () => {
                localStorage.removeItem('token')
                disconnectSocket()
                set({user:null,token:null})
            },
            // called on app startup - re - fetch user if we have a stored token
            initialize: async () => {
                const token = localStorage.getItem('token')
                if (!token) return
                try{
                    const {data} = await api.get('/auth/me')
                    connectSocket(token)
                    set({user:data.user,token})
                }catch(err){
                    localStorage.removeItem('token')
                    set({user:null,token:null})
                }
            },
        }),
        {
            name: 'auth-storage',
            // only paersist the token - user grts re fetching on init
            partialize: (state) => ({ token: state.token }),
        }

    )
)