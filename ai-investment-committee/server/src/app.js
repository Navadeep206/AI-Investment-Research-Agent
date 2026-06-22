import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import healthRoutes from './routes/health.js';
import companyRoutes from './routes/companyRoutes.js';
import researchRoutes from './routes/researchRoutes.js';
import scoringRoutes from './routes/scoringRoutes.js';
import challengeRoutes from './routes/challengeRoutes.js';
import analysisRoutes from './routes/analysisRoutes.js';
import evidenceRoutes from './routes/evidenceRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import cacheRoutes from './routes/cacheRoutes.js';
import comparisonRoutes from './routes/comparisonRoutes.js';
import executionRoutes from './routes/executionRoutes.js';
import portfolioRoutes from './routes/portfolioRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import systemHealthRoutes from './routes/healthRoutes.js';

// Custom Hardening Middlewares
import requestIdMiddleware from './middleware/requestId.js';
import { requestMonitor } from './middleware/requestMonitor.js';
import responseStandardizer from './middleware/responseStandardizer.js';
import { rateLimiter } from './middleware/rateLimiter.js';

// Load environment variables
dotenv.config();

const app = express();

// Apply tracing and monitoring middlewares first
app.use(requestIdMiddleware);
app.use(requestMonitor);
app.use(responseStandardizer);

// Apply rate limiting to protected endpoints
app.use('/api/analyze', rateLimiter);
app.use('/api/compare', rateLimiter);
app.use('/api/portfolio', rateLimiter);

// Standard Middlewares
app.use(cors({
  origin: '*', // For development purposes. Can configure to specific origins if required.
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', healthRoutes);
app.use('/api', companyRoutes);
app.use('/api', researchRoutes);
app.use('/api', scoringRoutes);
app.use('/api', challengeRoutes);
app.use('/api', analysisRoutes);
app.use('/api', evidenceRoutes);
app.use('/api', historyRoutes);
app.use('/api', cacheRoutes);
app.use('/api', comparisonRoutes);
app.use('/api', executionRoutes);
app.use('/api', portfolioRoutes);
app.use('/api', reportRoutes);
app.use('/api', systemHealthRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    timestamp: new Date().toISOString(),
    requestId: req.requestId || null,
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

export default app;
