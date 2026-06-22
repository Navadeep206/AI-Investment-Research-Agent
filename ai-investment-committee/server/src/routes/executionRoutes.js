import express from 'express';
import executionTracker from '../services/executionTracker.js';

const router = express.Router();

/**
 * Endpoint to retrieve real-time multi-agent execution status for a given session.
 * GET /api/execution/:sessionId
 */
router.get('/execution/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Invalid or missing "sessionId" parameter.'
    });
  }

  const cleanSessionId = sessionId.trim();
  const state = executionTracker.getExecutionState(cleanSessionId);

  return res.status(200).json(state);
});

export default router;
