/**
 * Centralised Express error handler.
 * Always returns JSON — never leaks stack traces in production.
 */
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;

  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  if (status >= 500) {
    console.error(
      '[ERROR]',
      'method=', req.method,
      'path=', req.path,
      'error=', err
    );
  }

  res.status(status).json({ error: message });
}

/**
 * Wraps an async route handler so thrown errors flow to errorHandler.
 */
function asyncHandler(fn) {
  return (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, asyncHandler };