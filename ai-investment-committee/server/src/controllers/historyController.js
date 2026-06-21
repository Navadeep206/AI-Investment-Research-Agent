import analysisService from '../services/analysisService.js';

/**
 * Retrieves the list of all completed analyses, newest first.
 * GET /api/history
 */
export const getHistory = async (req, res, next) => {
  try {
    const historyList = await analysisService.getAnalysisHistory();
    return res.status(200).json({
      success: true,
      count: historyList.length,
      history: historyList
    });
  } catch (error) {
    console.error('[History Controller] Failed to retrieve history:', error.message);
    next(error);
  }
};

/**
 * Retrieves a single analysis record by ID.
 * GET /api/history/:id
 */
export const getAnalysis = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing analysis ID param.'
      });
    }

    const record = await analysisService.getAnalysisById(id.trim());

    if (!record) {
      return res.status(404).json({
        success: false,
        message: `Analysis record not found for ID: ${id}`
      });
    }

    return res.status(200).json({
      success: true,
      analysis: record
    });
  } catch (error) {
    console.error(`[History Controller] Failed to retrieve record ID ${req.params.id}:`, error.message);
    next(error);
  }
};

/**
 * Deletes a single analysis record by ID.
 * DELETE /api/history/:id
 */
export const deleteAnalysis = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing analysis ID param.'
      });
    }

    const targetId = id.trim();
    try {
      await analysisService.deleteAnalysis(targetId);
      return res.status(200).json({
        success: true,
        message: `Analysis record with ID ${targetId} has been successfully deleted.`
      });
    } catch (err) {
      // Prisma error code for record not found: P2025
      if (err.code === 'P2025' || err.message.includes('Record to delete does not exist')) {
        return res.status(404).json({
          success: false,
          message: `Cannot delete. Analysis record not found for ID: ${targetId}`
        });
      }
      throw err;
    }
  } catch (error) {
    console.error(`[History Controller] Failed to delete record ID ${req.params.id}:`, error.message);
    next(error);
  }
};
