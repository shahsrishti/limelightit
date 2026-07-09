import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { errorResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Handle Prisma Errors
  if (err.code === 'P2002') {
    err.statusCode = 409;
    err.message = 'Duplicate field value entered';
  }
  
  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    err.statusCode = 401;
    err.message = 'Invalid token. Please log in again!';
  }
  if (err.name === 'TokenExpiredError') {
    err.statusCode = 401;
    err.message = 'Your token has expired! Please log in again.';
  }

  if (process.env.NODE_ENV === 'development') {
    logger.error(err);
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.stack,
      timestamp: new Date().toISOString(),
    });
  } else {
    // Production Error Handling
    if (err.isOperational) {
      res.status(err.statusCode).json(errorResponse(err.message));
    } else {
      // 1) Log error
      logger.error('ERROR 💥', err);
      // 2) Send generic message
      res.status(500).json(errorResponse('Something went very wrong!'));
    }
  }
};
