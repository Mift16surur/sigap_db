/**
 * Custom Application Errors
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode = 400, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource tidak ditemukan.") {
    super(message, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Autentikasi diperlukan untuk mengakses resource ini.") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Akses ditolak: Anda tidak memiliki wewenang.") {
    super(message, 403);
  }
}

