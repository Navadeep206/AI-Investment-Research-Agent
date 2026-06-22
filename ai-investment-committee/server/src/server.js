import app from './app.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`  AI Investment Committee API Server     `);
  console.log(`  Running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`  Listening on Port: ${PORT}              `);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`=========================================`);
});

// Handle server termination
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
// Trigger nodemon reload
