import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

export async function getWorkspaceActivities(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const workspaceId = req.params.workspaceId as string

    const activities = await prisma.activity.findMany({
      where: {
        workspaceId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    })

    res.json({ activities })
  } catch (err) {
    next(err)
  }
}