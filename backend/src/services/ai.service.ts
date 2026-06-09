import { GoogleGenAI } from '@google/genai'
import { z } from 'zod'
import { AppError } from '../middleware/error.middleware'

const textResponseSchema = z
  .string()
  .trim()
  .min(1)
  .max(12000)

let client: GoogleGenAI | null = null

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new AppError(
      'AI service is not configured',
      503
    )
  }

  if (!client) {
    client = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    })
  }

  return client
}

function getModel() {
  return (
    process.env.GEMINI_MODEL ||
    'gemini-2.5-flash'
  )
}

export async function completeText(options: {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxTokens?: number
}) {
  try {
    const response =
      await getClient().models.generateContent({
        model: getModel(),
        contents: `
System:
${options.systemPrompt}

User:
${options.userPrompt}
`,
      })

    const content = response.text

    return textResponseSchema.parse(content)
  } catch (error) {
    if (error instanceof AppError) throw error

    if (error instanceof z.ZodError) {
      throw new AppError(
        'AI returned an invalid response',
        502
      )
    }

    console.error(
      'Gemini request failed'
    )
    console.error(error)

    throw new AppError(
      'AI request failed',
      502
    )
  }
}

export async function completeJson<T>(options: {
  systemPrompt: string
  userPrompt: string
  schema: z.ZodType<T>
  temperature?: number
  maxTokens?: number
}): Promise<T> {
  const response = await completeText({
    systemPrompt: `${options.systemPrompt}
Return only valid JSON.
Do not include markdown fences.`,
    userPrompt: options.userPrompt,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
  })

  try {
    return options.schema.parse(
      JSON.parse(response)
    )
  } catch {
    throw new AppError(
      'AI returned an invalid response',
      502
    )
  }
}

export const AI_SYSTEM_PROMPT = [
  'You are an AI collaborative workspace assistant.',
  'Use only the provided workspace context.',
  'Be specific, concise, and action-oriented.',
  'When data is missing, say what is missing instead of guessing.',
  'Never expose internal IDs unless explicitly requested.',
].join(' ')