import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/error.middleware'

const RECENT_ACTIVITY_LIMIT = 50
const RECENT_MESSAGE_LIMIT = 30

export interface WorkspaceContext {
  workspace: {
    id: string
    name: string
    description: string | null
    createdAt: Date
  }
  members: {
    id: string
    role: string
    name: string
    email: string
    joinedAt: Date
  }[]
  boards: {
    id: string
    name: string
    columns: {
      id: string
      name: string
      cards: {
        id: string
        title: string
        description: string | null
        priority: string
        dueDate: Date | null
        createdAt: Date
        updatedAt: Date
        assigneeName: string | null
        creatorName: string
        columnName: string
      }[]
    }[]
  }[]
  activities: {
    action: string
    description: string
    createdAt: Date
    userName: string
  }[]
  messages: {
    content: string
    createdAt: Date
    userName: string
  }[]
  stats: {
    totalCards: number
    completedCards: number
    inProgressCards: number
    pendingCards: number
    overdueCards: number
    completedThisWeek: number
    mostActiveMember: string
  }
}

function isDoneColumn(columnName: string) {
  return ['done', 'complete', 'completed'].includes(columnName.toLowerCase())
}

function isInProgressColumn(columnName: string) {
  const normalized = columnName.toLowerCase()
  return normalized.includes('progress') || normalized.includes('review')
}

function getWeekStart(date: Date) {
  const weekStart = new Date(date)
  const day = weekStart.getDay()
  const diff = day === 0 ? -6 : 1 - day
  weekStart.setDate(weekStart.getDate() + diff)
  weekStart.setHours(0, 0, 0, 0)
  return weekStart
}

export async function collectWorkspaceContext(
  workspaceId: string,
  userId: string
): Promise<WorkspaceContext> {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  })

  if (!membership) {
    throw new AppError('Workspace not found or access denied', 404)
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
      },
      boards: {
        include: {
          columns: {
            include: {
              cards: {
                include: {
                  assignee: { select: { name: true } },
                  creator: { select: { name: true } },
                },
                orderBy: { position: 'asc' },
              },
            },
            orderBy: { position: 'asc' },
          },
        },
        orderBy: { position: 'asc' },
      },
      activities: {
        include: {
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: RECENT_ACTIVITY_LIMIT,
      },
      messages: {
        include: {
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: RECENT_MESSAGE_LIMIT,
      },
    },
  })

  if (!workspace) {
    throw new AppError('Workspace not found', 404)
  }

  const now = new Date()
  const weekStart = getWeekStart(now)
  const activityCounts = new Map<string, number>()

  for (const activity of workspace.activities) {
    activityCounts.set(
      activity.user.name,
      (activityCounts.get(activity.user.name) || 0) + 1
    )
  }

  const mostActiveMember =
    [...activityCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ||
    'No recent activity'

  const boards = workspace.boards.map((board) => ({
    id: board.id,
    name: board.name,
    columns: board.columns.map((column) => ({
      id: column.id,
      name: column.name,
      cards: column.cards.map((card) => ({
        id: card.id,
        title: card.title,
        description: card.description,
        priority: card.priority,
        dueDate: card.dueDate,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
        assigneeName: card.assignee?.name || null,
        creatorName: card.creator.name,
        columnName: column.name,
      })),
    })),
  }))

  const cards = boards.flatMap((board) =>
    board.columns.flatMap((column) => column.cards)
  )

  const completedCards = cards.filter((card) => isDoneColumn(card.columnName))
  const inProgressCards = cards.filter((card) =>
    isInProgressColumn(card.columnName)
  )
  const pendingCards = cards.filter(
    (card) => !isDoneColumn(card.columnName) && !isInProgressColumn(card.columnName)
  )
  const overdueCards = cards.filter(
    (card) =>
      card.dueDate &&
      card.dueDate < now &&
      !isDoneColumn(card.columnName)
  )
  const completedThisWeek = completedCards.filter(
    (card) => card.updatedAt >= weekStart
  )

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      createdAt: workspace.createdAt,
    },
    members: workspace.members.map((member) => ({
      id: member.user.id,
      role: member.role,
      name: member.user.name,
      email: member.user.email,
      joinedAt: member.joinedAt,
    })),
    boards,
    activities: workspace.activities.map((activity) => ({
      action: activity.action,
      description: activity.description,
      createdAt: activity.createdAt,
      userName: activity.user.name,
    })),
    messages: workspace.messages.reverse().map((message) => ({
      content: message.content,
      createdAt: message.createdAt,
      userName: message.user.name,
    })),
    stats: {
      totalCards: cards.length,
      completedCards: completedCards.length,
      inProgressCards: inProgressCards.length,
      pendingCards: pendingCards.length,
      overdueCards: overdueCards.length,
      completedThisWeek: completedThisWeek.length,
      mostActiveMember,
    },
  }
}

export function renderWorkspaceContext(context: WorkspaceContext) {
  const boardLines = context.boards
    .map((board) => {
      const columnLines = board.columns
        .map((column) => {
          const cardLines = column.cards.length
            ? column.cards
                .map((card) => {
                  const dueDate = card.dueDate
                    ? card.dueDate.toISOString().slice(0, 10)
                    : 'none'
                  return `      - ${card.title} | priority: ${card.priority} | assignee: ${card.assigneeName || 'unassigned'} | due: ${dueDate} | updated: ${card.updatedAt.toISOString()}`
                })
                .join('\n')
            : '      - No cards'

          return `    Column: ${column.name}\n${cardLines}`
        })
        .join('\n')

      return `  Board: ${board.name}\n${columnLines}`
    })
    .join('\n')

  const memberLines = context.members
    .map((member) => `  - ${member.name} (${member.role})`)
    .join('\n')

  const activityLines = context.activities.length
    ? context.activities
        .map(
          (activity) =>
            `  - ${activity.createdAt.toISOString()} | ${activity.userName}: ${activity.description}`
        )
        .join('\n')
    : '  - No recent activity'

  const messageLines = context.messages.length
    ? context.messages
        .map(
          (message) =>
            `  - ${message.createdAt.toISOString()} | ${message.userName}: ${message.content}`
        )
        .join('\n')
    : '  - No recent chat messages'

  return [
    `Workspace: ${context.workspace.name}`,
    `Description: ${context.workspace.description || 'No description'}`,
    '',
    'Members:',
    memberLines,
    '',
    'Stats:',
    `  - Total cards: ${context.stats.totalCards}`,
    `  - Completed cards: ${context.stats.completedCards}`,
    `  - In progress cards: ${context.stats.inProgressCards}`,
    `  - Pending cards: ${context.stats.pendingCards}`,
    `  - Overdue cards: ${context.stats.overdueCards}`,
    `  - Completed this week: ${context.stats.completedThisWeek}`,
    `  - Most active member: ${context.stats.mostActiveMember}`,
    '',
    'Boards:',
    boardLines || '  - No boards',
    '',
    'Recent Activities:',
    activityLines,
    '',
    'Recent Chat Messages:',
    messageLines,
  ].join('\n')
}
