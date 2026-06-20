import companyResearchService from '../services/companyResearchService.js';

/**
 * Controller class to handle requests regarding company details.
 */
export const getCompanyIntelligence = async (req, res, next) => {
  try {
    const { name } = req.params;

    // Validate parameter
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing company name parameter. Please provide a valid company name.'
      });
    }

    const companyName = name.trim();

    // Call service to pull aggregated intelligence
    const researchData = await companyResearchService.getCompanyResearch(companyName);

    return res.status(200).json({
      success: true,
      data: researchData
    });
  } catch (error) {
    console.error(`Error in getCompanyIntelligence for "${req.params.name}":`, error.message);
    
    // Check if error is from missing ticker symbol lookup
    if (error.message.includes('Could not resolve ticker symbol') || error.message.includes('Yahoo Finance research failed')) {
      return res.status(404).json({
        success: false,
        message: `Could not find company profile or stock market listing matching "${req.params.name}".`
      });
    }

    // Default error fallback passing to global error handler
    next(error);
  }
};

/**
 * Controller to handle temporary debug requests with raw metrics.
 */
export const getCompanyDebugIntelligence = async (req, res, next) => {
  try {
    const { name } = req.params;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing company name parameter.'
      });
    }

    const companyName = name.trim();
    const debugData = await companyResearchService.getCompanyDebugInfo(companyName);

    return res.status(200).json(debugData);
  } catch (error) {
    console.error(`Error in getCompanyDebugIntelligence for "${req.params.name}":`, error.message);
    if (error.message.includes('Could not find') || error.message.includes('No candidates')) {
      return res.status(404).json({
        success: false,
        message: `Could not debug company "${req.params.name}": Ticker not found.`
      });
    }
    next(error);
  }
};

