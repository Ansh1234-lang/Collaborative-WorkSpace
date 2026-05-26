import { Server, Socket } from "socket.io";
import jwt from 'jsonwebtoken'
import { prisma } from "./prisma";
import { includes } from "zod";
import { userInfo } from "node:os";


// types

interface AuthenticateSocket extends Socket {
    userId?: string
    userName?: string
}

interface JwtPayLoad {
    UserId: string
    email: string
}

// ─── Auth middleware for Socket.IO ────────────────────────
// Every socket connection must send a valid JWT.
// This runs BEFORE any event handlers.

function socketAuthMiddleware(socket: AuthenticateSocket, next: (err?: Error) => void) {
    const token = socket.handshake.auth?.token

    if (!token) {
        return next(new Error('Authentication token missing'))
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayLoad
        socket.userId = payload.UserId
        next()
    } catch {
        next(new Error('Invalid tokrn'))
    }
}


// main Socket Handkler

export function registerSocketHandlers(io: Server) {
    io.use(socketAuthMiddleware)

    io.on('connection', async (socket: AuthenticateSocket) => {
        console.log(`Socket Connected : ${socket.id} | ${socket.userId}`)

        // ── Room management ────────────────────────────────────
        // Rooms = workspaces. A client "joins a room" when they
        // open a workspace. Socket.IO automatically routes events
        // only to sockets in the same room.
        socket.on('workspace:join', async (worksapaceId: string) => {
            // verify th euser is actually a member before joining
            const membership = await prisma.workspaceMember.finfUnique({
                where: {
                    worksapaceId_userId: {
                        worksapaceId,
                        userId: socket.userId!,

                    },
                },
                include: { user: { select: { name: true } } },
            })

            if (!membership) {
                socket.emit('error', { message: 'not a member of this workspace' })
                return
            }
            socket.join(worksapaceId)
            socket.userName = membership.user.name

            // tell everyone in the room this user came online
            socket.to(worksapaceId).emit('workspace:user_joined', {
                userId: socket.userId,
                userName: membership.user.name,
            })
            console.log(`User ${membership.user.name} joined workspace ${worksapaceId}`)
        })
        socket.on('workspace:leave', (workspaceId: string) => {
            socket.leave(workspaceId)
            socket.to(workspaceId).emit('workspace:user_left', {
                userId: socket.userId,
                userName: socket.userName,
            })
        })

        // ── Chat messages ──────────────────────────────────────
        // When a message arrives: save to DB first, THEN broadcast.
        // This ensures chat history persists and all clients get
        // the DB-assigned ID and timestamp.

        socket.on('message:send', async (data: {
            workspaceId: string
            content: string
        }) => {
            try {
                const message = await prisma.message.create({
                    data: {
                        content: data.content,
                        workspaceId: data.workspaceId,
                        userId: socket.userId
                    },
                    include: {
                        user: { select: { id: true, name: true, avatarUrl: true } }
                    }
                })
                io.to(data.workspaceId).emit('message', message)
            } catch (err) {
                socket.emit('error', { message: 'Failed to send message' })
            }
        })

        // ── Kanban card events ─────────────────────────────────
        // When a card moves, update DB then broadcast to room.
        // Other clients apply the update to their local state.

        socket.on('card:move', async (data: {
            workspaceId: string
            cardId: string
            newColumnId: string
            newPosition: number
        }) => {
            try {
                const card = await prisma.card.update({
                    where: { id: data.cardId },
                    data: {
                        columnId: data.newColumnId,
                        position: data.newPosition,
                    },
                    include: { assignee: { select: { id: true, name: true } } },
                })
                // broardcast to everyone Except the sender 
                socket.to(data.workspaceId).emit('card:moved', card)
            } catch (err) {
                socket.emit('error', { message: 'failed to move card' })
            }
        })

        socket.on('card:update', async (data: {
            workspaceId: string
            cardId: string
            updates: { title?: string; description?: string; priority?: string }
        }) => {
            try {
                const card = await prisma.card.update({
                    where: { id: data.cardId },
                    data: data.updates,
                })
                socket.to(data.workspaceId).emit('card:updated', card)
            } catch (err) {
                socket.emit('error', { message: 'failedto update card' })
            }
        })

        // ── Typing indicators ──────────────────────────────────
        // Pure real-time — no DB needed. Just relay to the room.

        socket.on('typind:start', (workspaceId: string) => {
            socket.to(workspaceId).emit('typing:user_started', {
                userId: socket.userId,
                userName: socket.userName
            })
        })

        socket.on('typing:stop', (workspaseId: string) => {
            socket.to(workspaseId).emit('typing:user_stopped', {
                userId: socket.userId,
            })
        })

        // disconnect
        socket.on('disconnect', () => {
            console.log(`socket disconnected : ${socket.id}`)
        })
    })
}