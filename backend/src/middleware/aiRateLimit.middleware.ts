import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth.middleware'

const WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS = 30

const buckets = new Map<string, { count: number; resetAt: number }>()

export function aiRateLimit(req: AuthRequest, res: Response, next: NextFunction) {
  const key = req.userId || req.ip || 'anonymous'
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS,
    })
    return next()
  }

  if (bucket.count >= MAX_REQUESTS) {
    return res.status(429).json({
      message: 'Too many AI requests. Please try again later.',
    })
  }

  bucket.count += 1
  next()
}
