import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'
import { Response, NextFunction } from 'express'

// ─── Board routes ─────────────────────────────────────────

export const boardRouter = Router()
boardRouter.use(authenticate)

// Create a card in a column
boardRouter.post('/columns/:columnId/cards', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { columnId } = req.params
        const { title, priority } = req.body

        // Get highest position in column
        const lastCard = await prisma.card.findFirst({
            where: { columnId },
            orderBy: { position: 'desc' },
        })
        const position = lastCard ? lastCard.position + 1 : 0

        const card = await prisma.card.create({
            data: {
                title,
                priority: priority || 'MEDIUM',
                columnId,
                creatorId: req.userId!,
                position,
            },
            include: {
                assignee: { select: { id: true, name: true, avatarUrl: true } },
                creator: { select: { id: true, name: true } },
            },
        })

        res.status(201).json({ card })
    } catch (err) {
        next(err)
    }
})

// Update a card
boardRouter.patch('/cards/:cardId', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { cardId } = req.params
        const { title, description, priority, assigneeId, dueDate } = req.body

        const card = await prisma.card.update({
            where: { id: cardId },
            data: { title, description, priority, assigneeId, dueDate },
            include: {
                assignee: { select: { id: true, name: true, avatarUrl: true } },
            },
        })

        res.json({ card })
    } catch (err) {
        next(err)
    }
})

// Delete a card
boardRouter.delete('/cards/:cardId', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await prisma.card.delete({ where: { id: req.params.cardId } })
        res.status(204).send()
    } catch (err) {
        next(err)
    }
})

// ─── Message routes ───────────────────────────────────────

export const messageRouter = Router()
messageRouter.use(authenticate)

// Get message history for a workspace (paginated)
messageRouter.get('/workspace/:workspaceId', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { workspaceId } = req.params
        const cursor = req.query.cursor as string | undefined
        const limit = 50

        const messages = await prisma.message.findMany({
            where: { workspaceId },
            include: {
                user: { select: { id: true, name: true, avatarUrl: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            ...(cursor && {
                skip: 1,
                cursor: { id: cursor },
            }),
        })

        // Return in chronological order
        res.json({
            messages: messages.reverse(),
            nextCursor: messages.length === limit ? messages[0].id : null,
        })
    } catch (err) {
        next(err)
    }
})