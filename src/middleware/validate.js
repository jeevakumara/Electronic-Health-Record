const { AppError } = require('./errorHandler');

/**
 * Middleware factory to validate required request body fields
 * @param {Array<string>} requiredFields - List of mandatory fields in req.body
 */
function requireBodyFields(requiredFields) {
  return (req, res, next) => {
    const missing = [];
    if (!req.body || typeof req.body !== 'object') {
      return next(new AppError('Request body must be a valid JSON object', 400, 'VALIDATION_ERROR'));
    }

    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(`Field '${field}' is required and cannot be empty`);
      }
    }

    if (missing.length > 0) {
      return next(new AppError('Validation failed: Missing required fields', 400, 'VALIDATION_ERROR', missing));
    }

    next();
  };
}

module.exports = {
  requireBodyFields
};
