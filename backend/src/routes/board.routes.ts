import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { prisma } from '../lib/prisma'
import { AuthRequest } from '../middleware/auth.middleware'
import { Response, NextFunction } from 'express'
import { Priority } from '@prisma/client'

export const boardRouter = Router()
boardRouter.use(authenticate)

// ─── Shared helper: reorder cards in one or two columns ───
// Uses string[] (IDs only) to avoid Prisma type conflicts.
// Working with plain IDs instead of full Card objects means
// TypeScript never sees the splice stub — no type errors.

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
    ids.splice(newPosition, 0, cardId)          // insert moved card ID at new index
    await Promise.all(
      ids.map((id, index) =>
        tx.card.update({ where: { id }, data: { position: index } })
      )
    )
  } else {
    // Close the gap in source column
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

    // Move card to new column first so it's visible in destCards query
    await tx.card.update({
      where: { id: cardId },
      data: { columnId: destColumnId },
    })

    // Reorder destination column with card inserted at newPosition
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

// ─── Create card ──────────────────────────────────────────

boardRouter.post('/columns/:columnId/cards', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const columnId = req.params.columnId as string
    const { title, description, priority } = req.body

    const lastCard = await prisma.card.findFirst({
      where: { columnId },
      orderBy: { position: 'desc' },
    })
    const position = lastCard ? lastCard.position + 1 : 0

    const card = await prisma.card.create({
      data: {
        title,
        description,
        priority: (priority as Priority) || Priority.MEDIUM,
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

// ─── Move card (drag and drop) ────────────────────────────

boardRouter.patch('/cards/:cardId/move', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cardId = req.params.cardId as string
    const { newColumnId, newPosition } = req.body
    console.log('BODY:',req.body)
    console.log('PARAMS:',req.params)


    if (!newColumnId || newPosition === undefined) {
      return res.status(400).json({ message: 'newColumnId and newPosition are required' })
    }

    const currentCard = await prisma.card.findUnique({
      where: { id: cardId },
      select: { columnId: true },
    })

    if (!currentCard) {
      return res.status(404).json({ message: 'Card not found' })
    }

    await prisma.$transaction((tx) =>
      reorderCards(tx, cardId, currentCard.columnId, newColumnId as string, newPosition as number)
    )

    const updatedCard = await prisma.card.findUnique({
      where: { id: cardId },
      include: { assignee: { select: { id: true, name: true, avatarUrl: true } } },
    })

    res.json({ card: updatedCard })
  } catch (err) {
    next(err)
  }
})

// ─── Update card fields ───────────────────────────────────

boardRouter.patch('/cards/:cardId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cardId = req.params.cardId as string
    const { title, description, priority, assigneeId, dueDate } = req.body

    const card = await prisma.card.update({
      where: { id: cardId },
      data: {
        title,
        description,
        // Cast to Priority enum — Prisma rejects plain string
        ...(priority && { priority: priority as Priority }),
        assigneeId,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
      },
    })

    res.json({ card })
  } catch (err) {
    next(err)
  }
})

// ─── Delete card ──────────────────────────────────────────

boardRouter.delete('/cards/:cardId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cardId = req.params.cardId as string
    await prisma.card.delete({ where: { id: cardId } })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

// ─── Message routes ───────────────────────────────────────

export const messageRouter = Router()
messageRouter.use(authenticate)

messageRouter.get('/workspace/:workspaceId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const workspaceId = req.params.workspaceId as string
    const cursor = req.query.cursor as string | undefined
    const limit = 50

    const messages = await prisma.message.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    })

    res.json({
      messages: messages.reverse(),
      nextCursor: messages.length === limit ? messages[0].id : null,
    })
  } catch (err) {
    next(err)
  }
})
