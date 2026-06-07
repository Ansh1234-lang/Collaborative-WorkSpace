import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { AppError } from '../middleware/error.middleware'
import { AuthRequest } from '../middleware/auth.middleware'


const createWorkspaceSchema = z.object({
    name: z.string().min(3).max(50),
    description: z.string().max(200).optional(),
})

const workspaceIdParamSchema = z.preprocess((val) => {
    if (Array.isArray(val)) return val[0]
    return val
}, z.string().min(1))

// Create Workspace
export async function createWorkspace(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const body = createWorkspaceSchema.parse(req.body)

        const baseSlug = body.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')

        const slug = `${baseSlug}-${Date.now().toString(36)}`

        const workspace = await prisma.workspace.create({
            data: {
                name: body.name,
                description: body.description,
                slug,

                members: {
                    create: {
                        userId: req.userId!,
                        role: 'OWNER',
                    },
                },

                boards: {
                    create: {
                        name: 'Main Board',
                        position: 0,

                        columns: {
                            create: [
                                { name: 'To Do', position: 0 },
                                { name: 'In Progress', position: 1 },
                                { name: 'In Review', position: 2 },
                                { name: 'Done', position: 3 },
                            ],
                        },
                    },
                },
            },

            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },

                boards: {
                    include: {
                        columns: true,
                    },
                },
            },
        })

        res.status(201).json({ workspace })
    } catch (err) {
        if (err instanceof z.ZodError) {
            return res.status(400).json({
                message: 'Validation failed',
                errors: err.issues,
            })
        }

        next(err)
    }
}

// Get All Workspaces For Current User
export async function getMyWorkspaces(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const memberships = await prisma.workspaceMember.findMany({
            where: {
                userId: req.userId!,
            },

            include: {
                workspace: {
                    include: {
                        members: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        avatarUrl: true,
                                    },
                                },
                            },
                        },

                        _count: {
                            select: {
                                boards: true,
                            },
                        },
                    },
                },
            },
        })

        const workspaces = memberships.map((m) => ({
            ...m.workspace,
            myRole: m.role,
        }))

        res.json({ workspaces })
    } catch (err) {
        next(err)
    }
}

// Get Single Workspace
export async function getWorkspace(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        const workspaceId = workspaceIdParamSchema.parse(req.params.workspaceId)

        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: req.userId!,
                },
            },
        })

        if (!membership) {
            throw new AppError(
                'Workspace not found or access denied',
                404
            )
        }

        const workspace = await prisma.workspace.findUnique({
            where: {
                id: workspaceId,
            },

            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },

                boards: {
                    include: {
                        columns: {
                            include: {
                                cards: {
                                    include: {
                                        assignee: {
                                            select: {
                                                id: true,
                                                name: true,
                                                avatarUrl: true,
                                            },
                                        },

                                        creator: {
                                            select: {
                                                id: true,
                                                name: true,
                                                avatarUrl: true,
                                            },
                                        },
                                    },

                                    orderBy: {
                                        position: 'asc',
                                    },
                                },
                            },

                            orderBy: {
                                position: 'asc',
                            },
                        },
                    },

                    orderBy: {
                        position: 'asc',
                    },
                },
            },
        })

        res.json({
            workspace,
            myRole: membership.role,
        })
    } catch (err) {
        next(err)
    }
}

// Invite Member
export async function inviteMember(
    req: AuthRequest,
    res: Response,
    next: NextFunction
) {
    try {
        console.log('Invite Request')
        console.log('Workspace ID:', req.params.workspaceId)
        console.log('Body:', req.body)
        console.log('User:', req.userId)


        const workspaceId = workspaceIdParamSchema.parse(req.params.workspaceId)
        const { email } = req.body

        const inviter = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: req.userId!,
                },
            },
        })

        if (
            !inviter ||
            !['OWNER', 'ADMIN'].includes(inviter.role)
        ) {
            throw new AppError(
                'Only owner and admin can invite members',
                403
            )
        }

        const userToInvite = await prisma.user.findUnique({
            where: {
                email,
            },
        })

        if (!userToInvite) {
            throw new AppError(
                'User with this email not found',
                404
            )
        }

        const existingMember =
            await prisma.workspaceMember.findUnique({
                where: {
                    workspaceId_userId: {
                        workspaceId,
                        userId: userToInvite.id,
                    },
                },
            })

        if (existingMember) {
            throw new AppError(
                'User is already a member of this workspace',
                400
            )
        }

        const member =
            await prisma.workspaceMember.create({
                data: {
                    workspaceId,
                    userId: userToInvite.id,
                    role: 'MEMBER',
                },

                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatarUrl: true,
                        },
                    },
                },
            })
        const io = req.app.get('io')
        io.to(workspaceId).emit('workspace:member_added', member)
        res.status(201).json({ member })
    } catch (err) {
        next(err)
    }

}


// Updated workspace
export async function updateWorkspace(req:AuthRequest,res:Response,next:NextFunction) { 
    try{
        const workspaceId = req.params.workspaceId as string
        const {name,description}= req.body

        const member = await prisma.workspaceMember.findUnique({
            where:{
                workspaceId_userId:{
                    workspaceId,
                    userId:req.userId!,
                }
            }
        })
        if(
            !member||
            !['OWNER','ADMIN'].includes(member.role)
        ){
            throw new AppError(
                'Only Woner or Admin can edit Workspace',403
            )
        }
        const workspace = await prisma.workspace.update({
            where:{
                id:workspaceId
            },
            data:{
                name,description
            }
        })
        res.json({workspace})
    }catch(err){
        next(err)
    }
    
}

// delte workspace

export async function deleteWorkspace(req:AuthRequest,res:Response,next:NextFunction){
    try{
        const workspaceId = req.params.workspaceId as string

        const member = await prisma.workspaceMember.findUnique({
            where:{
                workspaceId_userId:{
                    workspaceId,
                    userId:req.userId!
                }
            }
        })

        if(!member || member.role != 'OWNER'){
            throw new AppError(
                'Only workspace owner can delete Workspace',403
            )
        }
        await prisma.workspace.delete({
            where:{
                id:workspaceId,
            }
        })
        res.json({
            message:'Workspace deleted successfully'
        })
    }catch(err){
        next(err)
    }
}