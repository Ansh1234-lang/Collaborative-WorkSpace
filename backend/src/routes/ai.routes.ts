import { Router } from 'express'
import { authenticate } from '../middleware/auth.middleware'
import { aiRateLimit } from '../middleware/aiRateLimit.middleware'
import {
  cardDescription,
  chatWithAssistant,
  projectSummary,
  taskBreakdown,
} from '../controllers/ai.controller'

export const aiRouter = Router()

aiRouter.use(authenticate)
aiRouter.use(aiRateLimit)

aiRouter.post('/chat', chatWithAssistant)
aiRouter.post('/project-summary', projectSummary)
aiRouter.post('/task-breakdown', taskBreakdown)
aiRouter.post('/card-description', cardDescription)
