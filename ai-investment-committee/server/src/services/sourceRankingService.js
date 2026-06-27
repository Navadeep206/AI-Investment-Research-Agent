/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         EVIDENCE QUALITY ENGINE v2 — Hardened               ║
 * ║                                                              ║
 * ║  Computes a dynamic, multi-factor Evidence Quality Score     ║
 * ║  from collected evidence. Fully deterministic. No AI.        ║
 * ║  No hardcoded scores. Every factor derived from evidence.    ║
 * ║                                                              ║
 * ║  Factors & Weights:                                          ║
 * ║    1. Source Credibility   40%  — Tier-weighted + best bonus ║
 * ║    2. Evidence Freshness   20%  — Age decay + URL signals    ║
 * ║    3. Source Diversity     15%  — Unique domains (smooth)    ║
 * ║    4. Evidence Completeness 15% — Category coverage          ║
 * ║    5. Claim Specificity    10%  — Numbers, dates, entities   ║
 * ╚══════════════════════════════════════════════════════════════╝
 */
class SourceRankingService {

  // ════════════════════════════════════════════════
  // TIER CLASSIFICATION
  // ════════════════════════════════════════════════

  /**
   * Classifies a source into credibility tiers A–D.
   *
   * Classification is based on source name string matching and URL domain
   * matching. Checks are ordered from highest to lowest credibility.
   * An unmatched source defaults to Tier C.
   *
   * @param {string} sourceName  Source display name
   * @param {string} url         Source URL
   * @returns {{ tier: string, weight: number }}
   */
  classifySource(sourceName, url = '') {
    const src  = (sourceName || '').toLowerCase().trim();
    const link = (url        || '').toLowerCase().trim();

    // ── Tier A: Institutional financial, regulatory, wire services ──
    // Weight 1.0 — highest credibility
    if (
      src.includes('reuters')              || link.includes('reuters.com')       ||
      src.includes('bloomberg')            || link.includes('bloomberg.com')     ||
      src.includes('wall street journal')  || src.includes('wsj')                || link.includes('wsj.com')          ||
      src.includes('financial times')      || src.includes('ft.com')             || link.includes('ft.com')           ||
      src.includes('sec')                  || link.includes('sec.gov')           ||
      src.includes('yahoo finance')        || src.includes('yahoofinance')       || link.includes('finance.yahoo')    ||
      src.includes('nasdaq')               || link.includes('nasdaq.com')        ||
      src.includes('investopedia')         || link.includes('investopedia.com')  ||
      src.includes('barron')               || link.includes('barrons.com')       ||
      src.includes('ap ')                  || src === 'ap'                       || link.includes('apnews.com')
    ) {
      return { tier: 'Tier A', weight: 1.0 };
    }

    // ── Tier B: Established financial media & major tech press ──
    // Weight 0.75
    if (
      src.includes('marketwatch')    || link.includes('marketwatch.com')  ||
      src.includes('cnbc')           || link.includes('cnbc.com')         ||
      src.includes('morningstar')    || link.includes('morningstar.com')  ||
      src.includes('seeking alpha')  || src.includes('seekingalpha')      || link.includes('seekingalpha.com')  ||
      src.includes('cmc markets')    || link.includes('cmcmarkets.com')   ||
      src.includes('motley fool')    || link.includes('fool.com')         ||
      src.includes('thestreet')      || link.includes('thestreet.com')    ||
      src.includes('zacks')          || link.includes('zacks.com')        ||
      src.includes('benzinga')       || link.includes('benzinga.com')     ||
      src.includes('techcrunch')     || link.includes('techcrunch.com')   ||
      src.includes('forbes')         || link.includes('forbes.com')       ||
      src.includes('business insider') || src.includes('businessinsider') || link.includes('businessinsider.com')
    ) {
      return { tier: 'Tier B', weight: 0.75 };
    }

    // ── Tier D: Social media, forums, low-signal sources ──
    // Weight 0.2 — lowest credibility; penalises low-quality evidence
    if (
      src.includes('youtube')    || link.includes('youtube.com')   ||
      src.includes('twitter')    || link.includes('twitter.com')   ||
      src.includes('x.com')      || link.includes('/x.com')        ||
      src === 'x'                ||
      src.includes('reddit')     || link.includes('reddit.com')    ||
      src.includes('facebook')   || link.includes('facebook.com')  ||
      src.includes('instagram')  || link.includes('instagram.com') ||
      src.includes('tiktok')     || link.includes('tiktok.com')    ||
      src.includes('forum')      || src.includes('fora')           ||
      src.includes('discord')    || link.includes('discord.gg')    ||
      src.includes('quora')      || link.includes('quora.com')
    ) {
      return { tier: 'Tier D', weight: 0.2 };
    }

    // ── Tier C: General web, regional news, blogs, press releases ──
    // Weight 0.5
    return { tier: 'Tier C', weight: 0.5 };
  }

  // ════════════════════════════════════════════════
  // FACTOR 1: SOURCE CREDIBILITY (weight 0.40)
  // ════════════════════════════════════════════════

  /**
   * Credibility = weighted average of tier weights × 100,
   * PLUS a best-tier bonus that rewards having at least one high-tier source.
   *
   * Rationale: raw average penalises portfolios that have many Tier C
   * sources alongside a Tier A source. The bonus corrects for this by
   * rewarding "at least one authoritative source" without ignoring the mix.
   *
   * Formula:
   *   base   = avg(tierWeights) × 100          [0–100]
   *   bonus  = bestTierWeight × 10             [0–10]
   *   score  = clamp(base + bonus × 0.5, 0, 100)
   *
   * @param {Array} rankedItems
   * @returns {number} 0–100
   */
  _computeCredibilityScore(rankedItems) {
    if (!rankedItems.length) return 0;

    const totalWeight  = rankedItems.reduce((sum, i) => sum + i.credibilityWeight, 0);
    const avgWeight    = totalWeight / rankedItems.length;
    const bestWeight   = Math.max(...rankedItems.map(i => i.credibilityWeight));

    // Base: average tier weight, scaled to 0–100
    const base  = avgWeight * 100;

    // Best-tier bonus: rewards having at least one Tier A (weight=1.0 → +5pt max)
    // Tier A=+5, Tier B=+3.75, Tier C=+2.5, Tier D=+1
    const bonus = bestWeight * 5;

    return Math.min(100, Math.round(base + bonus));
  }

  // ════════════════════════════════════════════════
  // FACTOR 2: EVIDENCE FRESHNESS (weight 0.20)
  // ════════════════════════════════════════════════

  /**
   * Freshness score decays with age.
   *
   * When a timestamp is available: decays from 100 (< 1h) to 20 (> 30 days).
   *
   * When no timestamp (most Tavily results): uses URL signals to infer
   * recency. Wire-service domains (Reuters, Bloomberg) are assumed current.
   * General blog/unknown domains are treated as moderately stale.
   * Additionally, the search query was sent now — so results without a
   * timestamp are "at most a few hours old" by construction.
   *
   * The URL-based inference provides variance beyond the previous 3-bucket
   * system (60/72/82) by scanning for date patterns in the URL itself.
   *
   * @param {Array} items
   * @returns {number} 0–100
   */
  _computeFreshnessScore(items) {
    const now = Date.now();

    const scores = items.map(item => {
      // 1. Parse explicit timestamp if present
      const rawTs = item.publishedTime || null;
      if (rawTs) {
        const ts = new Date(rawTs).getTime();
        if (!isNaN(ts)) {
          const ageHours = (now - ts) / (1000 * 60 * 60);
          if (ageHours <   1) return 100;
          if (ageHours <   6) return 95;
          if (ageHours <  24) return 85;
          if (ageHours <  72) return 70;
          if (ageHours < 168) return 55;
          if (ageHours < 720) return 40;
          return 20;
        }
      }

      // 2. No timestamp — infer from URL date pattern (e.g. /2025/06/ or /20250625)
      const urlStr = item.url || '';
      const yearMatch = urlStr.match(/\/(202[3-9]|2030)\/(0[1-9]|1[0-2])\//);
      if (yearMatch) {
        try {
          const urlDate = new Date(`${yearMatch[1]}-${yearMatch[2]}-01`);
          const ageHours = (now - urlDate.getTime()) / (1000 * 60 * 60);
          if (ageHours <  168) return 75;  // within 1 week
          if (ageHours <  720) return 60;  // within 1 month
          return 45;
        } catch (_) {}
      }

      // 3. No timestamp, no URL date — infer from source credibility tier
      //    Wire services are real-time; unknown sources are treated as stale
      const w = item.credibilityWeight;
      if (w >= 1.0)  return 80;  // Tier A  — wire services, assumed live
      if (w >= 0.75) return 70;  // Tier B  — established media, likely recent
      if (w >= 0.5)  return 58;  // Tier C  — general web, unknown age
      return 42;                 // Tier D  — social/forum, treat as stale
    });

    if (!scores.length) return 0;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  // ════════════════════════════════════════════════
  // FACTOR 3: SOURCE DIVERSITY (weight 0.15)
  // ════════════════════════════════════════════════

  /**
   * Smooth diversity score using a logarithmic formula rather than
   * a coarse step function.
   *
   * Formula: score = min(100, round(30 + 70 × log(n) / log(maxN)))
   *   where n = unique domain count, maxN = 8 (saturation point)
   *
   * This gives proportional incremental gains:
   *   1→2: +25pt  2→3: +16pt  3→4: +12pt  4→5: +9pt  5→6: +8pt  …
   *
   * Duplicate domains (same root hostname appearing multiple times)
   * count only once. Mirrors of the same article are de-duplicated.
   *
   * @param {Array} items
   * @returns {number} 0–100
   */
  _computeDiversityScore(items) {
    if (!items.length) return 0;

    const uniqueDomains = new Set();
    items.forEach(item => {
      try {
        const hostname = new URL(item.url || '').hostname.replace(/^www\./, '');
        // Extract root domain (e.g. "finance.yahoo.com" → "yahoo.com")
        const parts = hostname.split('.');
        const root = parts.length >= 2 ? parts.slice(-2).join('.') : hostname;
        uniqueDomains.add(root);
      } catch (_) {
        if (item.source) uniqueDomains.add(item.source.toLowerCase().trim());
      }
    });

    const n    = uniqueDomains.size;
    const maxN = 8;  // Saturation: 8+ unique domains = 100

    if (n === 0) return 0;
    if (n >= maxN) return 100;

    // Smooth logarithmic scaling
    const score = 30 + 70 * (Math.log(n) / Math.log(maxN));
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  // ════════════════════════════════════════════════
  // FACTOR 4: EVIDENCE COMPLETENESS (weight 0.15)
  // ════════════════════════════════════════════════

  /**
   * Scores coverage across 6 investment research categories.
   *
   * Hardening vs V1: A category is only "covered" if at least 2 distinct
   * keywords from that category appear in the combined claim text.
   * This prevents a single incidental word (e.g. "challenge") from
   * claiming full category coverage.
   *
   * Each covered category contributes 1/6 of the max score.
   *
   * Categories:
   *   1. Business Overview
   *   2. Financial Performance
   *   3. Growth Catalysts
   *   4. Competitive Position
   *   5. Risk Factors
   *   6. Recent Material Events
   *
   * @param {Array} items
   * @returns {number} 0–100
   */
  _computeCompletenessScore(items) {
    if (!items.length) return 0;

    const allText = items.map(i => (i.claim || '').toLowerCase()).join(' ');

    const categories = [
      {
        name: 'Business Overview',
        keywords: ['business', 'company', 'product', 'service', 'operations', 'segment',
                   'division', 'model', 'platform', 'offering', 'portfolio']
      },
      {
        name: 'Financial Performance',
        keywords: ['revenue', 'earnings', 'profit', 'income', 'eps', 'margin', 'cash',
                   'debt', 'quarterly', 'financial', 'balance sheet', 'ebitda', 'capex',
                   'dividend', 'buyback', 'guidance']
      },
      {
        name: 'Growth Catalysts',
        keywords: ['growth', 'expansion', 'opportunity', 'market share', 'forecast', 'outlook',
                   'target', 'upside', 'pipeline', 'launch', 'new market', 'addressable']
      },
      {
        name: 'Competitive Position',
        keywords: ['competitor', 'competitive', 'market leader', 'rival', 'industry', 'sector',
                   'versus', 'vs', 'moat', 'advantage', 'dominan', 'position']
      },
      {
        name: 'Risk Factors',
        keywords: ['risk', 'threat', 'challenge', 'concern', 'lawsuit', 'regulation', 'decline',
                   'headwind', 'uncertainty', 'antitrust', 'tariff', 'geopolit', 'macro']
      },
      {
        name: 'Recent Material Events',
        keywords: ['announced', 'reported', 'released', 'launched', 'acquired', 'partnership',
                   'deal', 'ceo', 'quarter', 'appointed', 'merger', 'ipo', 'split', 'buyback']
      }
    ];

    // A category is "covered" if at least 2 of its keywords appear in the combined text
    // This prevents a single incidental word from claiming full category coverage
    const covered = categories.filter(cat => {
      const hits = cat.keywords.filter(kw => allText.includes(kw)).length;
      return hits >= 2;
    }).length;

    return Math.round((covered / categories.length) * 100);
  }

  // ════════════════════════════════════════════════
  // FACTOR 5: CLAIM SPECIFICITY (weight 0.10)
  // ════════════════════════════════════════════════

  /**
   * Measures how specific and factual each claim is.
   *
   * Replaces the simple "average confidence" approach with a
   * multi-signal specificity score per claim. Higher specificity
   * means the claim contains verifiable facts rather than vague assertions.
   *
   * Per-claim signals scored:
   *   +25  Tavily relevance score > 0 (primary signal if available)
   *   +20  Numerical facts present (percentages, dollar amounts, ratios)
   *   +15  Date references present (quarters, years, months)
   *   +15  Named entities present (CEO names, product names, place names)
   *   +10  Cross-source corroboration signal (same fact mentioned by 2+ items)
   *   +15  Claim length >= 80 chars (substantive claim, not just a headline)
   *
   * Max per claim: 100 (if Tavily score present: 25 + others up to 75)
   * If no Tavily score: max from other signals = 75, scaled to 0–100.
   *
   * @param {Array} items  Evidence items with confidence (Tavily score 50–100)
   * @returns {number} 0–100
   */
  _computeClaimSpecificityScore(items) {
    if (!items.length) return 0;

    // Pre-compute all claim text for cross-source corroboration
    const allClaims = items.map(i => (i.claim || '').toLowerCase());

    // Extract key numeric facts from all claims for corroboration check
    const allNumbers = allClaims.join(' ').match(/\d+\.?\d*%|\$\d+[bmk]?|\d+\.?\d*b\b|\d+x\b/gi) || [];
    const corroboratedFacts = new Set(allNumbers.filter(n => {
      return allClaims.filter(c => c.includes(n.toLowerCase())).length >= 2;
    }));

    const perClaimScores = items.map(item => {
      const claim = (item.claim || '').toLowerCase();
      let score = 0;

      // Signal 1: Tavily relevance score (0.0–1.0 → 50–100 → present = strong signal)
      // The confidence field holds the Tavily score (already scaled 50–100) or content proxy
      const tavilyDerived = Number(item.confidence) || 0;
      if (tavilyDerived > 50) {
        // Scale: 50→0pt, 75→12pt, 100→25pt (proportional)
        score += Math.round(((tavilyDerived - 50) / 50) * 25);
      }

      // Signal 2: Numerical facts (percentages, dollar values, EPS, margins)
      const numberMatches = claim.match(/\d+\.?\d*%|\$\s*\d+|\d+\.?\d*b\b|\d+\.?\d*x\b|\beps\b|\bmargin\b/g) || [];
      if (numberMatches.length >= 3) score += 20;
      else if (numberMatches.length >= 1) score += 10;

      // Signal 3: Date/time references (quarters, years, months)
      const dateMatches = claim.match(/\bq[1-4]\b|\b20[2-3]\d\b|\bfy\d*\b|\bjanuary|february|march|april|may|june|july|august|september|october|november|december\b/g) || [];
      if (dateMatches.length >= 1) score += 15;

      // Signal 4: Named entities (proper nouns — titles, names, brands, places)
      // Heuristic: words starting with capital letters that are known entity indicators
      const entityPatterns = [/\bceo\b|\bcfo\b|\bcto\b/, /\binc\b|\bcorp\b|\bltd\b/, /\bnyse\b|\bnasdaq\b|\bsec\b/, /[A-Z]{2,5}\b/];
      const entityHits = entityPatterns.filter(pat => pat.test(item.claim || '')).length;
      if (entityHits >= 2) score += 15;
      else if (entityHits >= 1) score += 7;

      // Signal 5: Cross-source corroboration (same numeric fact in 2+ claims)
      const claimNums = (claim.match(/\d+\.?\d*%|\$\d+[bmk]?/gi) || []).map(n => n.toLowerCase());
      const hasCorroboration = claimNums.some(n => corroboratedFacts.has(n));
      if (hasCorroboration) score += 10;

      // Signal 6: Substantive claim length (>= 80 chars = not just a headline)
      if ((item.claim || '').length >= 80) score += 15;

      return Math.min(100, score);
    });

    return Math.round(perClaimScores.reduce((a, b) => a + b, 0) / perClaimScores.length);
  }

  // ════════════════════════════════════════════════
  // COMPOSITE SCORE + EXPLAINABLE LOGGING
  // ════════════════════════════════════════════════

  /**
   * Computes the final weighted composite Evidence Quality Score
   * and emits a fully explainable breakdown log.
   *
   * Formula:
   *   score = Credibility × 0.40
   *         + Freshness   × 0.20
   *         + Diversity   × 0.15
   *         + Completeness× 0.15
   *         + Specificity × 0.10
   *
   * Output is clamped to [0, 100].
   * All inputs are pure functions of the collected evidence.
   *
   * @param {Array} rankedItems  Evidence items after tier classification
   * @returns {number} 0–100
   */
  _computeEvidenceQualityScore(rankedItems) {
    if (!rankedItems || !rankedItems.length) return 0;

    const credibility  = this._computeCredibilityScore(rankedItems);
    const freshness    = this._computeFreshnessScore(rankedItems);
    const diversity    = this._computeDiversityScore(rankedItems);
    const completeness = this._computeCompletenessScore(rankedItems);
    const specificity  = this._computeClaimSpecificityScore(rankedItems);

    const c_contrib  = +(credibility  * 0.40).toFixed(2);
    const f_contrib  = +(freshness    * 0.20).toFixed(2);
    const d_contrib  = +(diversity    * 0.15).toFixed(2);
    const co_contrib = +(completeness * 0.15).toFixed(2);
    const sp_contrib = +(specificity  * 0.10).toFixed(2);

    const composite = Math.round(c_contrib + f_contrib + d_contrib + co_contrib + sp_contrib);
    const final     = Math.max(0, Math.min(100, composite));

    // ── Explainable breakdown log ──
    console.log(
      `[Evidence Quality Engine]\n` +
      `  Credibility  ${credibility} × 0.40 = ${c_contrib}\n` +
      `  Freshness    ${freshness} × 0.20 = ${f_contrib}\n` +
      `  Diversity    ${diversity} × 0.15 = ${d_contrib}\n` +
      `  Completeness ${completeness} × 0.15 = ${co_contrib}\n` +
      `  Specificity  ${specificity} × 0.10 = ${sp_contrib}\n` +
      `  ─────────────────────────────────────────\n` +
      `  Final Evidence Quality Score = ${final}`
    );

    return final;
  }

  // ════════════════════════════════════════════════
  // PUBLIC API
  // ════════════════════════════════════════════════

  /**
   * Processes raw evidence: classifies tiers, sorts by quality,
   * computes all metrics including the composite evidenceQualityScore.
   *
   * @param {Array} evidenceList  Raw evidence items from Tavily
   * @returns {{ rankedEvidence: Array, metrics: Object }}
   */
  rankEvidence(evidenceList) {
    if (!Array.isArray(evidenceList) || evidenceList.length === 0) {
      return {
        rankedEvidence: [],
        metrics: {
          totalSources: 0,
          tierA: 0, tierB: 0, tierC: 0, tierD: 0,
          averageConfidence: 0,
          evidenceQualityScore: 0
        }
      };
    }

    let tierACount = 0, tierBCount = 0, tierCCount = 0, tierDCount = 0;
    let sumConfidence = 0;

    const ranked = evidenceList.map((item) => {
      const { tier, weight } = this.classifySource(item.source, item.url);

      if      (tier === 'Tier A') tierACount++;
      else if (tier === 'Tier B') tierBCount++;
      else if (tier === 'Tier C') tierCCount++;
      else if (tier === 'Tier D') tierDCount++;

      const conf = Number(item.confidence) || 0;
      sumConfidence += conf;

      return {
        claim:             item.claim,
        source:            item.source,
        url:               item.url,
        confidence:        item.confidence,
        publishedTime:     item.publishedTime || item.publishedDate || null,
        tier,
        credibilityWeight: weight,
        weightedConfidence: Math.round(conf * weight)
      };
    });

    // Sort highest-quality evidence first
    ranked.sort((a, b) => b.weightedConfidence - a.weightedConfidence);

    const totalSources      = evidenceList.length;
    const averageConfidence = Math.round(sumConfidence / totalSources);

    // Compute dynamic composite score
    const evidenceQualityScore = this._computeEvidenceQualityScore(ranked);
    console.log("Evidence Engine Output", evidenceQualityScore);

    return {
      rankedEvidence: ranked,
      metrics: {
        totalSources,
        tierA: tierACount, tierB: tierBCount, tierC: tierCCount, tierD: tierDCount,
        averageConfidence,
        evidenceQualityScore
      }
    };
  }
}

export default new SourceRankingService();
