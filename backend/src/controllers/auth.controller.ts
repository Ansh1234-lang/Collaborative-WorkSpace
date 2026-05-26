import { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { signToken } from '../lib/jwt'
import { AppError } from '../middleware/error.middleware'

// ─── Validation schemas (Zod) ─────────────────────────────
// Validate before hitting the DB. Fail fast with clear errors.

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password required'),
})

// ─── Register ─────────────────────────────────────────────

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const body = registerSchema.parse(req.body)

    // Check if email already taken
    const existing = await prisma.user.findUnique({
      where: { email: body.email },
    })

    if (existing) {
      throw new AppError('Email already registered', 409)
    }

    // Hash password — NEVER store plain text
    // bcrypt cost factor 12 = ~300ms on modern hardware (good balance)
    const hashedPassword = await bcrypt.hash(body.password, 12)

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        // password deliberately excluded
      },
    })

    const token = signToken({ userId: user.id, email: user.email })

    res.status(201).json({ user, token })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.issues })
    }
    next(err)
  }
}

// ─── Login ────────────────────────────────────────────────

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const body = loginSchema.parse(req.body)

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    })

    // Use constant-time comparison — don't leak "user not found" vs "wrong password"
    const passwordValid = user
      ? await bcrypt.compare(body.password, user.password)
      : false

    if (!user || !passwordValid) {
      throw new AppError('Invalid email or password', 401)
    }

    const token = signToken({ userId: user.id, email: user.email })

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      token,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.issues })
    }
    next(err)
  }
}

// ─── Get current user (me) ────────────────────────────────

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).userId

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
    })

    if (!user) throw new AppError('User not found', 404)

    res.json({ user })
  } catch (err) {
    next(err)
  }
}