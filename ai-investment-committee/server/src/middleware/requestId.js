/**
 * Middleware to generate a unique request ID for tracing.
 * Format: REQ-YYYYMMDD-XXXX
 */
const generateRequestId = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randStr = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REQ-${dateStr}-${randStr}`;
};

export default (req, res, next) => {
  req.requestId = generateRequestId();
  res.setHeader('X-Request-Id', req.requestId);
  next();
};
