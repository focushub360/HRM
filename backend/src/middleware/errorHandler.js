export const notFound = (req, res, next) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
};

// Central error handler - keeps error response shape identical to the
// old backend: { error: 'message' }
export const errorHandler = (err, req, res, next) => {
  console.error('❌', err.stack || err);
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode).json({ error: err.message || 'Internal Server Error' });
};