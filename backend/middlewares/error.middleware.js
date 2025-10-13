export class ApiError extends Error {
  constructor(statusCode = 500, message = 'Internal Server Error', details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    if (details !== undefined) this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export const notFound = (req, res, next) => {
  next(new ApiError(404, 'Not Found', { path: req.originalUrl }));
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = Number(err?.statusCode) || 500;
  const isProd = process.env.NODE_ENV === 'production';

  const payload = {
    success: false,
    message: err?.message || 'Something went wrong',
    code: statusCode,
  };

  if (err?.details !== undefined) payload.details = err.details;
  if (!isProd && err?.stack) payload.stack = err.stack;

  if (err.code === 11000) {
    payload.message = 'Duplicate key error';
    payload.details = err.keyValue;
  }

  res.status(statusCode).json(payload);
};

export default errorHandler;

