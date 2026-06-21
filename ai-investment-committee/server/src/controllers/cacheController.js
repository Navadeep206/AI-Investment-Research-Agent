import cacheService from '../services/cacheService.js';

/**
 * Endpoint controller to retrieve caching statistics and hit rate ratio.
 * GET /api/cache-stats
 */
export const getStats = async (req, res, next) => {
  try {
    const stats = await cacheService.getCacheStats();
    return res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[Cache Controller] Failed to retrieve cache stats:', error.message);
    next(error);
  }
};
