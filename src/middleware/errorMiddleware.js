const AppError = require('../utils/AppError');

const notFound = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let errors;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path === '_id' ? 'id' : err.path}`;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    statusCode = 409;
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} is already in use`;
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Not authorized, token has expired';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Not authorized, invalid token';
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Invalid JSON in request body';
  }

  if (statusCode === 500) {
    console.error(err);
  }

  const response = { success: false, message };
  if (errors) response.errors = errors;

  res.status(statusCode).json(response);
};

module.exports = { notFound, errorHandler };
