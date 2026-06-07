import { Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { createWorkspace,getMyWorkspaces,getWorkspace,inviteMember,updateWorkspace,deleteWorkspace } from "../controllers/workspace.controller";

export const workspaceRouter = Router()

workspaceRouter.use(authenticate)

workspaceRouter.get('/',getMyWorkspaces)
workspaceRouter.post('/',createWorkspace)
workspaceRouter.get('/:workspaceId',getWorkspace)
workspaceRouter.post('/:workspaceId/invite',inviteMember)
workspaceRouter.patch('/:workspaceId',authenticate,updateWorkspace)
workspaceRouter.delete('/:workspaceId',authenticate,deleteWorkspace)