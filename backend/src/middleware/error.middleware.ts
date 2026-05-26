import { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
    statusCode: number

    constructor(message: string, statusCode: number) {
        super(message)
        this.statusCode = statusCode
        Error.captureStackTrace(this, this.constructor)
    }
}

// Express recognizes a 4-argument function as an error handler
export function errorHandler(
    err: Error | AppError,
    _req: Request,
    res: Response,
    _next: NextFunction
) {
    const statusCode = 'statusCode' in err ? err.statusCode : 500
    const message = err.message || 'Internal server error'

    if (process.env.NODE_ENV === 'development') {
        console.error(err)
    }

    res.status(statusCode).json({
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    })
}