export const CARD_STATUS = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
} as const

export type CardStatus = keyof typeof CARD_STATUS