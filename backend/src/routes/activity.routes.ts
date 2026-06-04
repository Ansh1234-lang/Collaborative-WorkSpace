import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { getWorkspaceActivities } from '../controllers/activity.controller'

export const activityRouter = Router()

activityRouter.use(authenticate)

activityRouter.get(
  '/workspace/:workspaceId',
  getWorkspaceActivities
)