'uae client'

import { useEffect, useRef } from "react"
import { getSocket } from "../lib/socket"
import { useWorkspaceStore } from "../store/workspace.store"
import { useAuthStore } from "../store/auth.store"



/**
 * useSocket — call this once inside a workspace page.
 * It joins the socket room for the workspace and registers
 * all real-time event handlers.
 *
 * When the component unmounts (user navigates away),
 * it leaves the room and cleans up all listeners.
 */

export function useSocket(workspaceId: string | null) {
    const { user } = useAuthStore()
    const { addMessage, moveCard, updateCard, addMember,setOnlineUsers } = useWorkspaceStore()

    // track current workspaceId in a ref so we can leave the room
    // even if the component re-renders with a different value
    const currentRoomRef = useRef<string | null>(null)
    useEffect(() => {
        if (!workspaceId || !user) return

        const socket = getSocket()

        // join the workspace room
        socket.emit('workspace:join', workspaceId)
        currentRoomRef.current = workspaceId

        // event handler
        function onMessage(message: any) {
            addMessage(message)
        }
        function onCardMoved(card: any) {
            console.log('cardmoved received',card)
            moveCard(card.id, card.columnId, card.position)
        }
        function onCardUpdated(card: any) {
            updateCard(card)
        }
        function onUserJoined(data: { userId: string; userName: string }) {
            console.log(`${data.userName} joined the workspace`)
        }
        function onMemberAdded(member:any){
            addMember(member)
        }
        function onOnlineUsers(users:string[]){
            setOnlineUsers(users)
        }

        // register handler
        socket.on('message:new', onMessage)
        socket.on('card:moved', onCardMoved)
        socket.on('card:updated', onCardUpdated)
        socket.on('workspace:user_joined', onUserJoined)
        socket.on('workspace:member_added',onMemberAdded)
        socket.on('workspace:online_users',onOnlineUsers)

        // cleanup on unmount or workspaceId change
        return () => {
            if (currentRoomRef.current) {
                socket.emit('workspace:leave', currentRoomRef.current)
            }
            socket.off('message:new', onMessage)
            socket.off('card:moved', onCardMoved)
            socket.off('card:updated', onCardUpdated)
            socket.off('workspace:user_joined', onUserJoined)
            socket.off('workspace:member_added',onMemberAdded)
            socket.off('workspace:online_users',onOnlineUsers)
        }
    }, [workspaceId, user])
}