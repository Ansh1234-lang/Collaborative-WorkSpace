import { AI_SYSTEM_PROMPT, completeText } from './ai.service'
import { WorkspaceContext, renderWorkspaceContext } from './workspaceContext.service'

export async function generateProjectSummary(context: WorkspaceContext) {
  return completeText({
    systemPrompt: AI_SYSTEM_PROMPT,
    maxTokens: 1400,
    userPrompt: [
      'Generate a weekly project summary using the exact section labels below.',
      'Use actual workspace data from the context.',
      'Keep each section concise and include member names or task names when relevant.',
      '',
      'Required format:',
      'Weekly Summary',
      '',
      'Completed Tasks:',
      '',
      'In Progress:',
      '',
      'Pending:',
      '',
      'Most Active Member:',
      '',
      'Recent Activities:',
      '',
      'Workspace context:',
      renderWorkspaceContext(context),
    ].join('\n'),
  })
}
