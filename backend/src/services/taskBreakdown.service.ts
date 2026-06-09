import { z } from 'zod'
import { AI_SYSTEM_PROMPT, completeJson } from './ai.service'
import { WorkspaceContext, renderWorkspaceContext } from './workspaceContext.service'

const taskBreakdownSchema = z.object({
  steps: z.array(z.string().min(2).max(160)).min(3).max(10),
})

const cardDescriptionSchema = z.object({
  description: z.string().min(10).max(1200),
  acceptanceCriteria: z.array(z.string().min(4).max(220)).min(2).max(8),
  technicalRequirements: z.array(z.string().min(4).max(220)).min(2).max(8),
  estimatedComplexity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
})

export async function generateTaskBreakdown(
  title: string,
  context: WorkspaceContext
) {
  const result = await completeJson({
    systemPrompt: AI_SYSTEM_PROMPT,
    schema: taskBreakdownSchema,
    maxTokens: 700,
    userPrompt: [
      `Break down this task into implementation steps: ${title}`,
      'Return JSON with this shape: {"steps":["step 1","step 2"]}',
      'Make the steps practical for the current workspace and existing project state.',
      '',
      'Workspace context:',
      renderWorkspaceContext(context),
    ].join('\n'),
  })

  return result.steps
}

export async function generateCardDescription(
  title: string,
  context: WorkspaceContext
) {
  return completeJson({
    systemPrompt: AI_SYSTEM_PROMPT,
    schema: cardDescriptionSchema,
    maxTokens: 1000,
    userPrompt: [
      `Generate a card description for this task: ${title}`,
      'Return JSON with this shape:',
      '{"description":"...","acceptanceCriteria":["..."],"technicalRequirements":["..."],"estimatedComplexity":"MEDIUM"}',
      'The complexity must be one of LOW, MEDIUM, HIGH, URGENT.',
      '',
      'Workspace context:',
      renderWorkspaceContext(context),
    ].join('\n'),
  })
}

export function formatCardDescription(input: z.infer<typeof cardDescriptionSchema>) {
  return [
    input.description,
    '',
    'Acceptance Criteria',
    ...input.acceptanceCriteria.map((item) => `- ${item}`),
    '',
    'Technical Requirements',
    ...input.technicalRequirements.map((item) => `- ${item}`),
    '',
    `Estimated Complexity: ${input.estimatedComplexity}`,
  ].join('\n')
}
