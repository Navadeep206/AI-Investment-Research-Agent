import { TavilySearchAPIRetriever } from "@langchain/community/retrievers/tavily_search_api";
import { evidenceSchema } from "../schemas/evidenceSchema.js";

class EvidenceService {
  /**
   * Performs parallel search queries on Tavily for a company,
   * gathers results, and normalizes them directly into evidence objects (0 Gemini calls).
   * 
   * @param {string} company Company name
   * @returns {Promise<Array>} List of evidence items conforming to evidenceSchema
   */
  async collectEvidence(company) {
    if (!company || typeof company !== 'string' || !company.trim()) {
      throw new Error("Valid company name is required to collect evidence.");
    }

    const companyName = company.trim();
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!tavilyKey) {
      throw new Error("Tavily API key is not configured. Please set TAVILY_API_KEY in the environment.");
    }

    console.log(`[Evidence Service] Collecting search evidence for "${companyName}"...`);

    // Instantiate Tavily Search retriever via LangChain Community
    const retriever = new TavilySearchAPIRetriever({
      k: 3,
      apiKey: tavilyKey
    });

    const queries = [
      `${companyName} latest news`,
      `${companyName} investment risks`,
      `${companyName} competitive advantages`,
      `${companyName} growth opportunities`
    ];

    // Execute queries in parallel for high performance
    const searchPromises = queries.map(async (query) => {
      try {
        console.log(`[Evidence Service] Executing Tavily query: "${query}"`);
        const docs = await retriever.invoke(query);

        // Standardize structure: preserve Tavily relevance score for dynamic confidence
        return docs.map((doc) => ({
          title: doc.metadata.title || 'Search Result',
          url: doc.metadata.source || '',
          content: doc.pageContent || '',
          tavilyScore: doc.metadata.score || doc.metadata.relevance_score || null
        }));
      } catch (err) {
        console.error(`[Evidence Service] Query failed: "${query}":`, err.message);
        return [];
      }
    });

    const searchResultsArrays = await Promise.all(searchPromises);
    const allSearchResults = searchResultsArrays.flat().filter(res => res.url && res.content);

    if (allSearchResults.length === 0) {
      console.warn(`[Evidence Service] Zero search results retrieved from Tavily for "${companyName}".`);
      return [];
    }

    console.log(`[Evidence Service] Aggregated ${allSearchResults.length} raw search findings. Performing direct normalization...`);

    // Normalize search results directly to evidence objects (0 Gemini calls)
    const normalizedList = allSearchResults.slice(0, 10).map((res) => {
      let sourceName = "Web Source";
      try {
        const domain = new URL(res.url).hostname;
        sourceName = domain.replace('www.', '');
      } catch (_) {}

      // Constrain claim text length to prevent overflow in downstream agent prompts
      let claim = res.content || res.title || `Latest updates on ${companyName}`;
      if (claim.length > 200) {
        claim = claim.substring(0, 197) + "...";
      }

      return {
        claim: claim,
        source: sourceName,
        url: res.url,
        confidence: (() => {
          // Use Tavily's relevance score (0.0–1.0) scaled to 50–100
          if (res.tavilyScore != null && res.tavilyScore > 0) {
            return Math.round(50 + (res.tavilyScore * 50));
          }
          // Fallback: content richness proxy
          const contentLen = (res.content || '').length;
          if (contentLen >= 400) return 85;
          if (contentLen >= 200) return 75;
          if (contentLen >= 100) return 65;
          return 55;
        })()
      };
    });

    try {
      const validatedData = evidenceSchema.parse(normalizedList);
      console.log(`[Evidence Service] Successfully normalized and validated ${validatedData.length} evidence items.`);
      return validatedData;
    } catch (err) {
      console.error(`[Evidence Service] Schema validation failed:`, err.message);
      return [];
    }
  }
}

export default new EvidenceService();
