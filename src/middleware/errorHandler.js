/**
 * Centralized error handler middleware
 * Formats all uncaught errors into a standardized JSON response envelope
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');

  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message || err);

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: err.message || 'An unexpected internal error occurred',
      details: err.details || []
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * Custom application error class
 */
class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST', details = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

module.exports = {
  errorHandler,
  AppError
};
