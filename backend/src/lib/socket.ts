import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma'
import { Priority } from '@prisma/client'
import { array } from 'zod'

interface AuthenticatedSocket extends Socket {
  userId?: string
  userName?: string
}

interface JwtPayload {
  userId: string
  email: string
}
const onlineUsers = new Map<string,Set<string>>()

function socketAuthMiddleware(socket: AuthenticatedSocket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token
  if (!token) return next(new Error('Authentication token missing'))
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
    socket.userId = payload.userId
    next()
  } catch {
    next(new Error('Invalid token'))
  }
}

// ─── Shared reorder helper ────────────────────────────────
// Accepts only string IDs — avoids the splice-stub type error
// that occurs when you splice a fake object into a Prisma result array.

async function reorderCards(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  cardId: string,
  sourceColumnId: string,
  destColumnId: string,
  newPosition: number
) {
  const sameColumn = sourceColumnId === destColumnId

  if (sameColumn) {
    const cards = await tx.card.findMany({
      where: { columnId: sourceColumnId, id: { not: cardId } },
      orderBy: { position: 'asc' },
      select: { id: true },
    })
    const ids = cards.map((c) => c.id)
    ids.splice(newPosition, 0, cardId)
    await Promise.all(
      ids.map((id, index) =>
        tx.card.update({ where: { id }, data: { position: index } })
      )
    )
  } else {
    // Close gap in source column
    const sourceCards = await tx.card.findMany({
      where: { columnId: sourceColumnId, id: { not: cardId } },
      orderBy: { position: 'asc' },
      select: { id: true },
    })
    await Promise.all(
      sourceCards.map(({ id }, index) =>
        tx.card.update({ where: { id }, data: { position: index } })
      )
    )

    // Move card to destination column
    await tx.card.update({
      where: { id: cardId },
      data: { columnId: destColumnId },
    })

    // Reorder destination column
    const destCards = await tx.card.findMany({
      where: { columnId: destColumnId, id: { not: cardId } },
      orderBy: { position: 'asc' },
      select: { id: true },
    })
    const destIds = destCards.map((c) => c.id)
    destIds.splice(newPosition, 0, cardId)
    await Promise.all(
      destIds.map((id, index) =>
        tx.card.update({ where: { id }, data: { position: index } })
      )
    )
  }
}

export function registerSocketHandlers(io: Server) {
  io.use(socketAuthMiddleware)

  io.on('connection', async (socket: AuthenticatedSocket) => {
    console.log(`Socket connected: ${socket.id} | User: ${socket.userId}`)

    socket.on('workspace:join', async (workspaceId: string) => {
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId: socket.userId! },
        },
        include: { user: { select: { name: true } } },
      })

      if (!membership) {
        socket.emit('error', { message: 'Not a member of this workspace' })
        return
      }

      socket.join(workspaceId)
      socket.userName = membership.user.name
      if(!onlineUsers.has(workspaceId)){
        onlineUsers.set(workspaceId,new Set())
      }
      onlineUsers.get(workspaceId)!.add(socket.userId!)
      io.to(workspaceId).emit('workspace:online_users',Array.from(onlineUsers.get(workspaceId)!))
      
      socket.to(workspaceId).emit('workspace:user_joined', {
        userId: socket.userId,
        userName: membership.user.name,
      })
      console.log(`User ${membership.user.name} joined workspace ${workspaceId}`)
    })

    socket.on('workspace:leave', (workspaceId: string) => {
      socket.leave(workspaceId)
      onlineUsers.get(workspaceId)?.delete(socket.userId!)
      io.to(workspaceId).emit('workspace:online_users',Array.from(onlineUsers.get(workspaceId)||[]))
      socket.to(workspaceId).emit('workspace:user_left', {
        userId: socket.userId,
        userName: socket.userName,
      })
    })

    socket.on('message:send', async (data: { workspaceId: string; content: string }) => {
      try {
        const message = await prisma.message.create({
          data: {
            content: data.content,
            workspaceId: data.workspaceId,
            userId: socket.userId!,
          },
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        })
        io.to(data.workspaceId).emit('message:new', message)
      } catch {
        socket.emit('error', { message: 'Failed to send message' })
      }
    })

    socket.on('card:move', async (data: {
      workspaceId: string
      cardId: string
      newColumnId: string
      newPosition: number
    }) => {
      try {
        const currentCard = await prisma.card.findUnique({
          where: { id: data.cardId },
          select: { columnId: true },
        })
        if (!currentCard) return

        await prisma.$transaction((tx) =>
          reorderCards(tx, data.cardId, currentCard.columnId, data.newColumnId, data.newPosition)
        )

        const updatedCard = await prisma.card.findUnique({
          where: { id: data.cardId },
          include: { assignee: { select: { id: true, name: true } } },
        })

        socket.to(data.workspaceId).emit('card:moved', updatedCard)
      } catch {
        socket.emit('error', { message: 'Failed to move card' })
      }
    })

    socket.on('card:update', async (data: {
      workspaceId: string
      cardId: string
      // priority must be typed as Priority enum, not plain string,
      // so Prisma's update() accepts it without a type error
      updates: { title?: string; description?: string; priority?: Priority }
    }) => {
      try {
        const card = await prisma.card.update({
          where: { id: data.cardId },
          data: data.updates,
        })
        socket.to(data.workspaceId).emit('card:updated', card)
      } catch {
        socket.emit('error', { message: 'Failed to update card' })
      }
    })

    socket.on('typing:start', (workspaceId: string) => {
      socket.to(workspaceId).emit('typing:user_started', {
        userId: socket.userId,
        userName: socket.userName,
      })
    })

    socket.on('typing:stop', (workspaceId: string) => {
      socket.to(workspaceId).emit('typing:user_stopped', {
        userId: socket.userId,
      })
    })

    socket.on('disconnect',()=>{
      for(const[workspaceId,users,]of onlineUsers.entries()){
        users.delete(socket.userId!)
        io.to(workspaceId).emit(
          'workspace:online_users',
          Array.from(users)
        )
      }
      console.log(`Socket disconnected: ${socket.id}`)
    })
    
  })
}