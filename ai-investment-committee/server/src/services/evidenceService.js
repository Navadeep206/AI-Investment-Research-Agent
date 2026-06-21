import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TavilySearchAPIRetriever } from "@langchain/community/retrievers/tavily_search_api";
import { evidenceSchema } from "../schemas/evidenceSchema.js";

/**
 * Helper to strip markdown code blocks (e.g. ```json ... ```) if returned by the LLM.
 */
const cleanResponseText = (text) => {
  if (typeof text !== 'string') return '';
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(json)?/i, '');
  cleaned = cleaned.replace(/```$/, '');
  return cleaned.trim();
};

class EvidenceService {
  /**
   * Performs parallel search queries on Tavily for a company,
   * gathers results, and uses Gemini to extract the top 10 evidence items.
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
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!tavilyKey) {
      throw new Error("Tavily API key is not configured. Please set TAVILY_API_KEY in the environment.");
    }
    if (!geminiKey) {
      throw new Error("Gemini API key is not configured. Please set GEMINI_API_KEY or GOOGLE_API_KEY in the environment.");
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

        // Standardize structure to: { title, url, content }
        return docs.map((doc) => ({
          title: doc.metadata.title || "Search Result",
          url: doc.metadata.source || "",
          content: doc.pageContent || ""
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

    console.log(`[Evidence Service] Aggregated ${allSearchResults.length} raw search findings. Extracting key claims using Gemini...`);

    // Instantiate Gemini model for extraction
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      apiKey: geminiKey,
      temperature: 0.1
    });

    const prompt = `You are a professional equity research assistant.
You are given a list of raw search results from the web regarding "${companyName}".
Your goal is to extract the top 10 most relevant, concrete, and high-quality evidence items from these search results.

Raw Web Search Results:
${JSON.stringify(allSearchResults, null, 2)}

INSTRUCTIONS:
1. Synthesize the findings and extract exactly 10 distinct, key evidence items (or fewer if there is insufficient data, but aim for 10).
2. For each evidence item, you must populate:
   - "claim": A concise, clear, and factual statement of the finding, latest event, risk, advantage, or metrics found.
   - "source": The exact domain name or publication name (e.g. "Reuters", "Bloomberg", "TechCrunch", "CNBC") extracted from the title/URL.
   - "url": The exact source URL corresponding to the claim.
   - "confidence": An integer between 0 and 100 indicating the reliability of the source and strength of the claim.
3. Return ONLY a valid JSON array matching the required structure.
4. Do NOT wrap your response in markdown code blocks.
5. Do NOT write any introduction, footnotes, notes, or explanations. Return ONLY the raw JSON string.

REQUIRED JSON FORMAT:
[
  {
    "claim": "Example statement of evidence",
    "source": "Source Name",
    "url": "https://example.com",
    "confidence": 90
  },
  ...
]`;

    let responseText = "";
    try {
      const response = await model.invoke(prompt);
      responseText = response.content;

      const cleanedText = cleanResponseText(responseText);
      const parsedData = JSON.parse(cleanedText);
      const validatedData = evidenceSchema.parse(parsedData);

      console.log(`[Evidence Service] Successfully synthesized and validated ${validatedData.length} evidence items.`);
      return validatedData;
    } catch (err) {
      console.error(`[Evidence Service] LLM extraction or schema validation failed:`, err.message);
      
      // Fallback: build up to 10 basic evidence objects directly from search results if LLM fails
      const fallbackList = allSearchResults.slice(0, 10).map((res) => {
        // Extract a simple source name from URL
        let sourceName = "Web Source";
        try {
          const domain = new URL(res.url).hostname;
          sourceName = domain.replace('www.', '');
        } catch (_) {}

        return {
          claim: res.title || "Latest updates on " + companyName,
          source: sourceName,
          url: res.url,
          confidence: 70
        };
      });

      try {
        return evidenceSchema.parse(fallbackList);
      } catch (_) {
        return [];
      }
    }
  }
}

export default new EvidenceService();
