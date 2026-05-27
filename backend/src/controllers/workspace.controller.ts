import { Response, NextFunction } from "express";
import { z } from 'zod'
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error.middleware";
import { AuthRequest } from "../middleware/auth.middleware";


const createWorkspaceSchema = z.object({
    name: z.string().min(50),
    description: z.string().max(200).optional(),
});

// create workspace

export async function createWorkspace(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const body = createWorkspaceSchema.parse(req.body)

        // generate a url-fiendly slug from the name
        const baseUrl = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const slug = `${baseUrl}-${Date.now().toString(36)}`

        const workspace = await prisma.workspace.create({
            data: {
                name: body.name,
                description: body.description,
                slug,
                // create aaaautomatically becomes OWNER member
                member: {
                    create: {
                        userId: req.userId!,
                        role: 'OWNER',
                    },
                },
                // create a default board with starter column
                board: {
                    create: {
                        name: 'Main Board',
                        position: 0,
                        column: {
                            create: [
                                { name: 'To Do', position: 0 },
                                { name: 'In Progress', position: 1 },
                                { name: "In Review", poition: 2 },
                                { name: 'Done', position: 3 },
                            ],
                        },
                    },
                },
                include: {
                    member: {
                        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
                    },
                    board: {
                        include: { column: true },
                    },
                },
            },
        })
        res.status(201).json({ workspace })

    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({ message: 'validateion failed', errors: err.issues })
        }
        next(err)
    }
}


// get all workspace for current user
export async function getMyWorkspaces(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const memberships = await prisma.workspaceMembre.findMany({
            where: { userId: req.userId },
            include: {
                workspace: {
                    include: {
                        member: {
                            include: {
                                user: { select: { id: true, name: true, avatarUrl: true } }
                            },
                        },
                        _count: { select: { board: true } },
                    }
                }
            }
        })
        const workspaces = memberships.map((m: any) => ({
            ...m.workspace,
            myRole: m.role,
        }))
        res.json({ workspaces })
    } catch (err) {
        next(err)
    }
}

// get single workspace
export async function getWorkspace(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const { workspaceId } = req.params

        // check membership first
        const membership = await prisma.workspaceMembre.findUnique({
            where: {
                workspaceId_userId: { workspaceId, userId: req.userId! },
            }
        })
        if (!membership) throw new AppError('Workspace not found or aceess denied', 404)
        const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: {
                members: {
                    include: {
                        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
                    },
                },
                boards: {
                    include: {
                        column: {
                            include: {
                                cards: {
                                    include: {
                                        assignee: { select: { id: true, name: true, avatarUrl: true } },
                                    },
                                    orderBy: { position: 'asc' },
                                },
                            },
                            orderBy: { position: 'asc' }
                        },
                    },
                    orderBy: { position: 'asc' }
                },
            },
        })
        res.json({ workspace, myRole: membership.role })
    }
    catch (err) {
        next(err)
    }
}


// invite member
export async function inviteMember(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const { workspaceId } = req.params
        const { email } = req.body

        // only owner and admin can invite
        const inviter = await prisma.workspaceMembre.findUnique({
            where: { workspaceId_userId: { workspaceId, userId: req.userId } },
        })
        if (!inviter || !['OWNER', 'ADMIN'].includes(inviter.role)) {
            throw new AppError('only owner and admin can inviter member', 403)
        }

        const userToInvite = await prisma.user.findUnique({ where: { email } })
        if (!userToInvite) throw new AppError('user with the exmailnot found', 404)
        const member = await prisma.workspaceMembre.create({
            data: {
                workspaceId,
                userId: userToInvite.id,
                role: 'MEMBER'
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true, avatarUrl: true }
                }
            }
        })
        res.status(201).json({ member })
    } catch (err) {
        next(err)
    }
}
