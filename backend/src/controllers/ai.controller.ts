import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { completeText, AI_SYSTEM_PROMPT } from '../services/ai.service'
import {
  collectWorkspaceContext,
  renderWorkspaceContext,
} from '../services/workspaceContext.service'
import { generateProjectSummary } from '../services/summary.service'
import {
  formatCardDescription,
  generateCardDescription,
  generateTaskBreakdown,
} from '../services/taskBreakdown.service'
import { AuthRequest } from '../middleware/auth.middleware'

const workspaceRequestSchema = z.object({
  workspaceId: z.string().min(1),
})

const chatRequestSchema = workspaceRequestSchema.extend({
  message: z.string().min(2).max(1000),
})

const taskRequestSchema = workspaceRequestSchema.extend({
  title: z.string().min(2).max(200),
})

function sendValidationError(res: Response, error: z.ZodError) {
  return res.status(400).json({
    message: 'Validation failed',
    errors: error.issues,
  })
}

export async function chatWithAssistant(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const body = chatRequestSchema.parse(req.body)
    const context = await collectWorkspaceContext(body.workspaceId, req.userId!)

    const answer = await completeText({
      systemPrompt: AI_SYSTEM_PROMPT,
      userPrompt: [
        'Answer the user question using the workspace context.',
        'If the user asks for overdue, pending, completed, activity, progress, sprint planning, or member activity, ground the response in the context.',
        '',
        `User question: ${body.message}`,
        '',
        'Workspace context:',
        renderWorkspaceContext(context),
      ].join('\n'),
    })

    res.json({ answer })
  } catch (err) {
    if (err instanceof z.ZodError) return sendValidationError(res, err)
    next(err)
  }
}

export async function projectSummary(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const body = workspaceRequestSchema.parse(req.body)
    const context = await collectWorkspaceContext(body.workspaceId, req.userId!)
    const summary = await generateProjectSummary(context)

    res.json({ summary })
  } catch (err) {
    if (err instanceof z.ZodError) return sendValidationError(res, err)
    next(err)
  }
}

export async function taskBreakdown(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const body = taskRequestSchema.parse(req.body)
    const context = await collectWorkspaceContext(body.workspaceId, req.userId!)
    const steps = await generateTaskBreakdown(body.title, context)

    res.json({ steps })
  } catch (err) {
    if (err instanceof z.ZodError) return sendValidationError(res, err)
    next(err)
  }
}

export async function cardDescription(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const body = taskRequestSchema.parse(req.body)
    const context = await collectWorkspaceContext(body.workspaceId, req.userId!)
    const generated = await generateCardDescription(body.title, context)

    res.json({
      ...generated,
      formattedDescription: formatCardDescription(generated),
    })
  } catch (err) {
    if (err instanceof z.ZodError) return sendValidationError(res, err)
    next(err)
  }
}
