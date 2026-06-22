import rateLimit from 'express-rate-limit';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      timestamp: new Date().toISOString(),
      requestId: req.requestId || null,
      error: {
        message: 'Too many requests from this IP, please try again after 15 minutes',
        status: 429
      }
    });
  }
});
