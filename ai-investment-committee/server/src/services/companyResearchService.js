import axios from 'axios';
import YahooFinance from 'yahoo-finance2';

// Instantiate the YahooFinance class
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

/**
 * Service to aggregate company intelligence from Wikipedia and Yahoo Finance.
 */
class CompanyResearchService {
  /**
   * Fetch company overview summary from Wikipedia REST API.
   * Falls back to a search query if direct page is not found.
   */
  async fetchWikipediaSummary(name) {
    const userAgent = 'AI-Investment-Committee/1.0 (contact: admin@investmentcommittee.ai)';
    const headers = { 'User-Agent': userAgent };

    try {
      // Try fetching direct summary page
      const directUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`;
      const response = await axios.get(directUrl, { headers });
      return {
        description: response.data.extract || 'Overview description not available.',
        title: response.data.title || name
      };
    } catch (err) {
      // If direct fetch fails (e.g. 404), search Wikipedia for the top matching page name
      try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&origin=*`;
        const searchRes = await axios.get(searchUrl, { headers });
        const firstHit = searchRes.data?.query?.search?.[0];
        
        if (firstHit) {
          const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(firstHit.title)}`;
          const summaryRes = await axios.get(summaryUrl, { headers });
          return {
            description: summaryRes.data.extract || 'Overview description not available.',
            title: summaryRes.data.title || firstHit.title
          };
        }
      } catch (searchErr) {
        console.error(`Wikipedia fallback search failed for "${name}":`, searchErr.message);
      }
      
      return {
        description: 'Overview description not available.',
        title: name
      };
    }
  }

  /**
   * Formats a raw numeric market capitalization into a human readable string.
   */
  formatMarketCap(num) {
    if (!num || isNaN(num)) return 'N/A';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  }

  /**
   * Helper function to prioritize and select the best stock symbol from search quotes.
   * 
   * Priority Ordering:
   * Priority 1: Type is EQUITY AND exchange is major US exchange (NMS, NCM, NAS, NYQ)
   * Priority 2: Type is EQUITY AND search quote object has pre-populated marketCap
   * Priority 3: Type is EQUITY
   * Priority 4: First available search quote
   */
  selectBestTicker(quotes) {
    const US_EXCHANGES = ['NMS', 'NCM', 'NAS', 'NYQ'];

    return [...quotes].sort((a, b) => {
      const getPriorityScore = (q) => {
        const isEquity = q.quoteType === 'EQUITY';
        const isUSExchange = isEquity && US_EXCHANGES.includes(q.exchange);
        const hasMarketCap = isEquity && (q.marketCap !== undefined && q.marketCap !== null);

        if (isUSExchange) return 1;
        if (hasMarketCap) return 2;
        if (isEquity) return 3;
        return 4;
      };

      return getPriorityScore(a) - getPriorityScore(b);
    });
  }

  /**
   * Search for a ticker and fetch financial statistics from Yahoo Finance.
   * Employs robust error boundary checks and resolves glitched market cap issues.
   */
  async fetchMarketData(name) {
    try {
      // Search for symbol using company name
      const searchResults = await yahooFinance.search(name);
      const quotes = searchResults.quotes || [];
      
      if (quotes.length === 0) {
        throw new Error(`Could not find any search listings on Yahoo Finance for "${name}"`);
      }

      // Rank candidate quotes based on the robust selection algorithm
      const rankedQuotes = this.selectBestTicker(quotes);

      // Loop through candidate tickers and validate
      for (const quoteCandidate of rankedQuotes) {
        const symbol = quoteCandidate.symbol;
        if (!symbol) continue;

        const exchange = quoteCandidate.exchange || 'Unknown';
        const quoteType = quoteCandidate.quoteType || 'Unknown';
        const shortname = quoteCandidate.shortname || 'Unknown';

        // Development logging requirement
        console.log({
          symbol,
          exchange,
          quoteType,
          shortname
        });

        try {
          // Fetch quote and asset details in parallel
          const quotePromise = yahooFinance.quote(symbol).catch((e) => {
            console.warn(`Yahoo Finance quote query failed for ticker "${symbol}":`, e.message);
            return {};
          });

          const quoteSummaryPromise = yahooFinance.quoteSummary(symbol, {
            modules: ['summaryDetail', 'assetProfile', 'price']
          }).catch((e) => {
            console.warn(`Yahoo Finance quoteSummary query failed for ticker "${symbol}":`, e.message);
            return {};
          });

          const [quoteData, quoteSummary] = await Promise.all([quotePromise, quoteSummaryPromise]);

          const assetProfile = quoteSummary?.assetProfile || {};
          const summaryDetail = quoteSummary?.summaryDetail || {};
          const priceModule = quoteSummary?.price || {};

          // Resolve market cap from different available modules
          const marketCapRaw = quoteData.marketCap || summaryDetail.marketCap || priceModule.marketCap;

          // Validation: If marketCap > 10 trillion, log warning and attempt next best candidate
          if (marketCapRaw && marketCapRaw > 10e12) {
            console.warn(`[Warning] Ticker "${symbol}" returned an unrealistic market cap of ${marketCapRaw} (> 10T). Skipping to next candidate.`);
            continue;
          }

          // Parse details
          const officialName = priceModule.longName || quoteData.longName || quoteCandidate.shortname || quoteCandidate.longname || symbol;
          const industry = assetProfile.industry || quoteData.industry || 'Unknown';
          const website = assetProfile.website || 'N/A';
          
          // Assemble headquarters
          const city = assetProfile.city;
          const state = assetProfile.state;
          const country = assetProfile.country;
          const headquarters = [city, state, country].filter(Boolean).join(', ') || 'N/A';

          const employees = assetProfile.fullTimeEmployees || 'N/A';
          const marketCap = this.formatMarketCap(marketCapRaw);

          // Return extra metadata along with required fields
          return {
            symbol,
            exchange,
            companyName: officialName,
            industry,
            website,
            headquarters,
            employees,
            marketCap
          };
        } catch (candidateErr) {
          console.warn(`[Warning] Attempt for ticker "${symbol}" failed: ${candidateErr.message}. Trying next candidate.`);
        }
      }

      throw new Error(`No candidates in Yahoo Finance search results returned valid metrics for "${name}"`);
    } catch (err) {
      throw new Error(`Yahoo Finance research failed: ${err.message}`);
    }
  }

  /**
   * Main orchestrator combining Wikipedia and Yahoo Finance details.
   */
  async getCompanyResearch(name) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new Error('Valid company name parameter is required');
    }

    const trimmedName = name.trim();

    // Fire requests in parallel for maximum performance
    const [wikiInfo, marketInfo] = await Promise.all([
      this.fetchWikipediaSummary(trimmedName),
      this.fetchMarketData(trimmedName)
    ]);

    return {
      company: marketInfo.companyName,
      industry: marketInfo.industry,
      description: wikiInfo.description,
      website: marketInfo.website,
      headquarters: marketInfo.headquarters,
      employees: marketInfo.employees,
      marketCap: marketInfo.marketCap,
      source: 'Wikipedia + Yahoo Finance'
    };
  }

  /**
   * Temporary debug method retrieving raw Yahoo Finance metrics for validation.
   */
  async getCompanyDebugInfo(name) {
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new Error('Valid company name parameter is required');
    }

    const trimmedName = name.trim();
    const searchResults = await yahooFinance.search(trimmedName);
    const quotes = searchResults.quotes || [];
    
    if (quotes.length === 0) {
      throw new Error(`Could not find any search listings on Yahoo Finance for "${trimmedName}"`);
    }

    const rankedQuotes = this.selectBestTicker(quotes);

    for (const quoteCandidate of rankedQuotes) {
      const symbol = quoteCandidate.symbol;
      if (!symbol) continue;

      try {
        const quotePromise = yahooFinance.quote(symbol).catch(() => ({}));
        const quoteSummaryPromise = yahooFinance.quoteSummary(symbol, {
          modules: ['summaryDetail', 'price']
        }).catch(() => ({}));

        const [quoteData, quoteSummary] = await Promise.all([quotePromise, quoteSummaryPromise]);

        const summaryDetail = quoteSummary?.summaryDetail || {};
        const priceModule = quoteSummary?.price || {};
        
        const marketCapRaw = quoteData.marketCap || summaryDetail.marketCap || priceModule.marketCap;

        // Use same limit validation to ensure it mirrors fetchMarketData exactly
        if (marketCapRaw && marketCapRaw > 10e12) {
          continue;
        }

        const marketCapFormatted = this.formatMarketCap(marketCapRaw);

        return {
          symbol,
          exchange: quoteCandidate.exchange || null,
          quoteType: quoteCandidate.quoteType || null,
          marketCapRaw: marketCapRaw !== undefined ? marketCapRaw : null,
          marketCapFormatted,
          shortname: quoteCandidate.shortname || null,
          longname: priceModule.longName || quoteData.longName || quoteCandidate.longname || null
        };
      } catch (err) {
        // Suppress and try next candidate
      }
    }

    throw new Error(`No candidates in Yahoo Finance search results returned valid metrics for "${trimmedName}"`);
  }
}

export default new CompanyResearchService();
