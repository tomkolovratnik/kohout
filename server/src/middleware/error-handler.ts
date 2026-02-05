import type { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const cause = (err as any).cause;
  console.error('Error:', err.message, cause ? `\n  Cause: ${cause.message || cause}` : '');

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
    });
    return;
  }

  const isExternalApiError = err.message.includes('API error');
  res.status(isExternalApiError ? 502 : 500).json({
    error: isExternalApiError ? err.message : 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
