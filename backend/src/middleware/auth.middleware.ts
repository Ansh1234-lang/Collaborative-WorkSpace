import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../lib/jwt'

// Extend Express Request to carry the authenticated user
export interface AuthRequest extends Request {
  userId?: string
  userEmail?: string
}

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  // Token comes in the Authorization header: "Bearer <token>"
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const payload = verifyToken(token)
    req.userId = payload.userId
    req.userEmail = payload.email
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}