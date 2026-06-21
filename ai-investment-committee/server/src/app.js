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

// Load environment variables
dotenv.config();

const app = express();

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

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

export default app;
