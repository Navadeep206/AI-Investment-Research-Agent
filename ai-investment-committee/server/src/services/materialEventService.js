import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TavilySearchAPIRetriever } from "@langchain/community/retrievers/tavily_search_api";

const cleanResponseText = (text) => {
  if (typeof text !== 'string') return '';
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(json)?/i, '');
  cleaned = cleaned.replace(/```$/, '');
  return cleaned.trim();
};

const getMockEvents = () => [
  {
    type: "EARNINGS",
    title: "Company Reports Record Q1 Earnings and Raises Guidance",
    source: "Bloomberg",
    publishedAt: new Date(Date.now() - 30 * 1000).toISOString() // 30 seconds ago
  },
  {
    type: "CEO_CHANGE",
    title: "Company Announces Executive CFO Transition Plan",
    source: "Reuters",
    publishedAt: new Date(Date.now() - 25 * 1000).toISOString() // 25 seconds ago
  }
];

class MaterialEventService {
  /**
   * Detects whether new material events occurred after the analysis timestamp.
   * 
   * @param {string} company Target company name
   * @param {string|Date} analysisTimestamp The time when the existing analysis was generated
   * @returns {Promise<Object>} The material event detection result
   */
  async detectMaterialEvents(company, analysisTimestamp) {
    const targetDate = new Date(analysisTimestamp);

    if (process.env.MOCK_LLM === 'true') {
      console.log(`[Material Event Service] [MOCK MODE] Checking material events for "${company}" since ${targetDate.toISOString()}`);
      
      const mockEvents = getMockEvents();
      // Filter mock events newer than targetDate
      const events = mockEvents.filter(e => new Date(e.publishedAt) > targetDate);
      const hasMaterialEvent = events.length > 0;
      const latestEventTimestamp = hasMaterialEvent ? events[0].publishedAt : null;

      return {
        hasMaterialEvent,
        latestEventTimestamp,
        eventCount: events.length,
        events
      };
    }

    const tavilyKey = process.env.TAVILY_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!tavilyKey || !geminiKey) {
      console.warn("[Material Event Service] Missing API keys. Defaulting to no material events.");
      return { hasMaterialEvent: false, latestEventTimestamp: null, eventCount: 0, events: [] };
    }

    try {
      console.log(`[Material Event Service] Searching material news for "${company}" since ${targetDate.toISOString()}...`);
      const retriever = new TavilySearchAPIRetriever({
        k: 5,
        apiKey: tavilyKey
      });

      const query = `"${company}" material events news earnings guidance CEO CFO filings lawsuits merger`;
      const docs = await retriever.invoke(query);
      const searchResults = docs.map(doc => ({
        title: doc.metadata.title || "News",
        url: doc.metadata.source || "",
        content: doc.pageContent || ""
      }));

      if (searchResults.length === 0) {
        return { hasMaterialEvent: false, latestEventTimestamp: null, eventCount: 0, events: [] };
      }

      const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.5-flash",
        apiKey: geminiKey,
        temperature: 0.1
      });

      const prompt = `You are a financial analyst.
You are given a list of search results about the company "${company}".
We need to determine if any major material events occurred *after* the analysis timestamp: ${targetDate.toISOString()} (UTC).

Material events to look for:
- Earnings releases
- Revenue guidance changes
- SEC filings (10-K, 10-Q, 8-K)
- CEO or CFO changes
- Mergers & acquisitions
- Product launches
- Regulatory actions or major lawsuits
- Analyst rating changes

Search Results:
${JSON.stringify(searchResults, null, 2)}

INSTRUCTIONS:
1. Examine the search results. If any material event occurred AFTER ${targetDate.toISOString()}, set "hasMaterialEvent" to true.
2. For each detected event:
   - "type": Choose one of: "EARNINGS", "GUIDANCE", "CEO_CHANGE", "REGULATORY", "LAWSUIT", "PRODUCT_LAUNCH", "MERGER_ACQUISITION", "ANALYST_RATING", "OTHER".
   - "title": A brief description of the event.
   - "source": Domain name/publication name.
   - "publishedAt": ISO 8601 string of when it was published. (Estimate if not exact, but must be in ISO format).
3. Return ONLY a valid JSON object in the exact format shown below.
4. Do NOT wrap inside markdown blocks. Do NOT write any introduction or notes.

REQUIRED JSON FORMAT:
{
  "hasMaterialEvent": true or false,
  "latestEventTimestamp": "ISO String or null",
  "eventCount": number,
  "events": [
    {
      "type": "EARNINGS",
      "title": "...",
      "source": "...",
      "publishedAt": "..."
    }
  ]
}`;

      const response = await model.invoke(prompt);
      const cleaned = cleanResponseText(response.content);
      const result = JSON.parse(cleaned);

      return {
        hasMaterialEvent: !!result.hasMaterialEvent,
        latestEventTimestamp: result.latestEventTimestamp || null,
        eventCount: Number(result.eventCount || 0),
        events: Array.isArray(result.events) ? result.events : []
      };

    } catch (err) {
      console.error("[Material Event Service] Real mode execution failed:", err.message);
      return { hasMaterialEvent: false, latestEventTimestamp: null, eventCount: 0, events: [] };
    }
  }
}

export default new MaterialEventService();
