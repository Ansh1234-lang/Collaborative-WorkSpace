'use client'

import { useEffect, useRef } from 'react'
import { getSocket } from '../lib/socket'
import { useWorkspaceStore } from '../store/workspace.store'
import { useAuthStore } from '../store/auth.store'
import { connectSocket } from '../lib/socket'

export function useSocket(workspaceId: string | null) {
  const { user } = useAuthStore()

  const {
    addMessage,
    moveCard,
    updateCard,
    addMember,
    setOnlineUsers,
  } = useWorkspaceStore()

  const token = localStorage.getItem('token')
  if (token){
    connectSocket(token)
  }
  const currentRoomRef = useRef<string | null>(null)

  useEffect(() => {
    if (!workspaceId || !user) return

    const socket = getSocket()
    console.log('socke connected',socket.connected)


    socket.emit('workspace:join', workspaceId)
    currentRoomRef.current = workspaceId

    function onMessage(message: any) {
      addMessage(message)
    }

    function onCardMoved(card: any) {
      console.log('card:moved', card)

      moveCard(
        card.id,
        card.columnId,
        card.position
      )
    }

    function onCardUpdated(card: any) {
      updateCard(card)
    }

    function onUserJoined(data: {
      userId: string
      userName: string
    }) {
      console.log(
        `${data.userName} joined workspace`
      )
    }

    function onMemberAdded(member: any) {
      addMember(member)
    }

    function onOnlineUsers(users: string[]) {
      setOnlineUsers(users)
    }

    socket.on('message:new', onMessage)
    socket.on('card:moved', onCardMoved)
    socket.on('card:updated', onCardUpdated)
    socket.on(
      'workspace:user_joined',
      onUserJoined
    )
    socket.on(
      'workspace:member_added',
      onMemberAdded
    )
    socket.on(
      'workspace:online_users',
      onOnlineUsers
    )
    socket.on('connect',()=>{
      console.log("socketr connected successfully")
    })
    socket.on('connected_err',(err)=>{
      console.log('socket error :',err.message )
    })

    return () => {
      if (currentRoomRef.current) {
        socket.emit(
          'workspace:leave',
          currentRoomRef.current
        )
      }

      socket.off('message:new', onMessage)
      socket.off('card:moved', onCardMoved)
      socket.off('card:updated', onCardUpdated)
      socket.off(
        'workspace:user_joined',
        onUserJoined
      )
      socket.off(
        'workspace:member_added',
        onMemberAdded
      )
      socket.off(
        'workspace:online_users',
        onOnlineUsers
      )
    }
  }, [
    workspaceId,
    user,
    addMessage,
    moveCard,
    updateCard,
    addMember,
    setOnlineUsers,
  ])
}