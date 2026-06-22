/**
 * Helper to compute a deterministic hash value from a company name string.
 * Used to seed dynamic but reproducible metrics for custom companies in mock mode.
 */
const getDeterministicSeed = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
};

// Database of specific mock profiles for common companies
const COMPANY_PROFILES = {
  nvidia: {
    research: {
      businessOverview: "NVIDIA Corporation is the pioneer of GPU-accelerated computing. It designs graphics processing units (GPUs) for the gaming and professional markets, as well as system on a chip units (SoCs) for the mobile computing and automotive market. NVIDIA is currently the dominant force in hardware and software stack infrastructure for generative artificial intelligence.",
      revenueDrivers: [
        "Data Center GPU sales (Hopper H100/H200, Blackwell B100/B200)",
        "Enterprise AI software licenses (NVIDIA AI Enterprise)",
        "GeForce RTX GPUs for gaming PCs and cloud gaming (GeForce NOW)",
        "Automotive ADAS and self-driving compute systems (DRIVE)"
      ],
      competitiveAdvantages: [
        "Proprietary CUDA software platform creating massive developer lock-in",
        "Full-system scale architecture (InfiniBand/NVLink networking combined with GPUs)",
        "Substantial multi-generation lead in deep learning hardware efficiency",
        "Co-design leadership in AI chips and deep learning algorithms"
      ],
      growthCatalysts: [
        "Sustained hyperscaler capital expenditure on AI training and inference cluster builds",
        "Transition from traditional CPU-only data centers to accelerated GPU computing",
        "Monetization of enterprise AI software suites and cloud services",
        "Expansion of autonomous vehicle platforms and industrial robotics (Omniverse)"
      ],
      risks: [
        "Supply constraints on advanced packaging (TSMC CoWoS packaging capacity)",
        "Geopolitical export controls restricting high-performance shipments to China",
        "Increasing chip design competition from hyper-scale customers (ASICs like TPU, Trainium)",
        "Highly cyclical nature of semiconductor chip cycles"
      ],
      bullCase: "NVIDIA sustains near-monopoly pricing power in AI accelerators and CUDA lock-in preserves high gross margins above 75%, allowing massive operating leverage."
    },
    scorecard: {
      businessQuality: 96,
      growthPotential: 94,
      competitiveMoat: 95,
      financialStrength: 92,
      riskLevel: 32,
      overallScore: 93,
      confidence: 95,
      recommendation: "INVEST"
    },
    challenge: {
      bearCase: "NVIDIA faces customer concentration risks as a few hyperscalers constitute over 40% of demand, and their capacity builds could slow down. TSMC fabrication single-source dependency exposes supply chain vulnerability.",
      keyConcerns: [
        "Hyperscaler transition to custom in-house silicon (TPUs, Inferentia)",
        "Customer capital expenditure budgets cooling down after initial generative AI landgrab"
      ],
      hiddenRisks: [
        "Taiwan strait geopolitical tension disrupting TSMC chip fabrication supply chain"
      ],
      worstCaseScenario: "Overcapacity in AI data center capacity triggers capital investment slowdown, reducing GPU demand and squeezing margins back toward historical 60% levels.",
      counterArguments: [
        "Hyperscalers are locked in an AI arms race and cannot afford to stop buying industry-standard NVIDIA systems."
      ]
    },
    committee: {
      recommendation: "INVEST",
      confidence: 95,
      reasoning: "The committee voted to INVEST in NVIDIA Corporation. The company holds an absolute monopoly in high-end AI training and inference processors, fortified by the developer reliance on the CUDA software platform. Financial metrics display historically unprecedented margin expansion and cash flow generation.",
      keyFactors: [
        "CUDA software stack monopoly lock-in",
        "Massive demand-supply delta for Hopper and Blackwell architectures",
        "Exceptional capital efficiency and near-zero debt burden"
      ]
    }
  },
  amd: {
    research: {
      businessOverview: "Advanced Micro Devices, Inc. (AMD) is a global semiconductor company specializing in high-performance processors, graphics cards, and adaptive AI accelerators. It operates in data center, client, gaming, and embedded system markets, serving as the primary competitor to Intel in CPUs and NVIDIA in GPUs.",
      revenueDrivers: [
        "Data Center EPYC CPU market share gains",
        "Instinct MI300 series AI GPU accelerators for enterprise/cloud",
        "Ryzen processors for notebooks and desktop client PCs",
        "Semi-custom game console APUs (PlayStation 5, Xbox Series X/S)"
      ],
      competitiveAdvantages: [
        "x86 architecture cross-licensing and advanced chiplet architecture leadership",
        "Strong multi-node foundry partnership with TSMC mitigating manufacturing risk",
        "Open-source ROCm software stack building a viable alternative to NVIDIA's closed ecosystem",
        "Comprehensive compute portfolio spanning CPUs, GPUs, FPGAs, and DPUs"
      ],
      growthCatalysts: [
        "Accelerating enterprise adoption of Instinct MI300X/MI325X GPUs as a second source",
        "Continued market share capture from Intel in high-margin enterprise data center server CPUs",
        "Ryzen AI PC adoption driving client segment volume and average selling price growth",
        "Synergies from Xilinx integration in industrial automation and automotive markets"
      ],
      risks: [
        "NVIDIA's massive CUDA ecosystem lock-in makes GPU share capture extremely difficult",
        "Intel's potential foundry process roadmap execution could erode AMD's CPU performance lead",
        "Cyclical declines in client PC shipments and semi-custom console demand",
        "Dependence on TSMC for advanced packaging limits total supply capability"
      ],
      bullCase: "AMD successfully scales the Instinct GPU roadmap to capture 10-15% of the AI accelerator market, while continuing CPU market share expansion, driving significant EPS growth."
    },
    scorecard: {
      businessQuality: 86,
      growthPotential: 88,
      competitiveMoat: 80,
      financialStrength: 82,
      riskLevel: 42,
      overallScore: 82,
      confidence: 85,
      recommendation: "INVEST"
    },
    challenge: {
      bearCase: "AMD remains a distant second to NVIDIA in AI compute hardware and faces a sticky CUDA developer software moat. Average selling price compression could occur if Intel launches aggressive price campaigns.",
      keyConcerns: [
        "Slow adoption of open-source ROCm software compared to mature CUDA",
        "Margin compression if NVIDIA initiates price wars on older architecture nodes"
      ],
      hiddenRisks: [
        "TSMC advanced packaging allocation restrictions capping Instinct MI300 volume shipments"
      ],
      worstCaseScenario: "Intel executes its '5 nodes in 4 years' foundry plan to reclaim CPU process leadership, rendering AMD's chiplet advantage obsolete while NVIDIA maintains a 95% AI market share.",
      counterArguments: [
        "Cloud providers desperately require a second silicon source to bypass NVIDIA's monopoly pricing, guaranteeing AMD's baseline GPU demand."
      ]
    },
    committee: {
      recommendation: "INVEST",
      confidence: 86,
      reasoning: "The committee voted to INVEST in Advanced Micro Devices, Inc. AMD represents the key secular alternative to NVIDIA's AI compute monopoly and Intel's legacy CPU footprint. The Instinct MI300 series is proving commercial viability and EPYC continues to print market share gains.",
      keyFactors: [
        "Strong x86 data center CPU share gains",
        "Rapid enterprise and cloud adoption of the MI300X AI GPU series",
        "Strong open-system commitment (ROCm) creating developer goodwill"
      ]
    }
  },
  microsoft: {
    research: {
      businessOverview: "Microsoft Corporation is a global technology leader providing software, services, devices, and cloud infrastructure. Its major offerings include the Windows operating system, Office productivity suites, Azure public cloud services, and AI copilot integrations across its ecosystem.",
      revenueDrivers: [
        "Azure Cloud services and consumption models",
        "Office 365 commercial and consumer SaaS subscriptions",
        "GitHub, LinkedIn, and Dynamics enterprise business lines",
        "Windows OEM licenses and Xbox gaming content"
      ],
      competitiveAdvantages: [
        "Azure's deep enterprise relationship footprint and massive hyperscale infrastructure",
        "Universal integration of Windows and Office suites in global commercial workflows",
        "Exclusive strategic partnership with OpenAI giving first-mover advantage in generative AI software",
        "Vast developer network and enterprise software repository (GitHub)"
      ],
      growthCatalysts: [
        "Azure AI services scaling up as enterprises deploy large language models on cloud infrastructure",
        "Copilot subscription add-on adoption across commercial Office 365 licenses",
        "Rebounding global IT expenditure prioritizing software productivity toolsets",
        "Monetization of gaming assets post-Activision Blizzard acquisition"
      ],
      risks: [
        "Severe antitrust scrutiny over security software bundles and AI partnership structures",
        "Decelerating Azure growth if global corporate optimization reduces cloud budgets",
        "Security breaches impacting Azure cloud credibility among security-conscious customers",
        "High cost of infrastructure capitalization for AI compute center buildouts"
      ],
      bullCase: "Microsoft establishes Azure AI as the standard enterprise operating system for generative applications, while Copilot secures high-margin SaaS ARPU expansion."
    },
    scorecard: {
      businessQuality: 94,
      growthPotential: 86,
      competitiveMoat: 93,
      financialStrength: 95,
      riskLevel: 25,
      overallScore: 90,
      confidence: 92,
      recommendation: "INVEST"
    },
    challenge: {
      bearCase: "Microsoft faces capital intensity headwinds as AI datacenter buildout demands unprecedented CAPEX, potentially dragging near-term free cash flow yield. Antitrust regulators are actively targeting cloud bundling practices.",
      keyConcerns: [
        "Elevated capital expenditure requirements depressing cash conversion metrics",
        "Security vulnerabilities tarnishing reputation in enterprise networking"
      ],
      hiddenRisks: [
        "Legal liabilities arising from copyright infringement lawsuits targeting Copilot code/content generation"
      ],
      worstCaseScenario: "AI monetization fails to match capitalization costs, leading to capital utilization inefficiency and multiple compression on a highly valued stock.",
      counterArguments: [
        "Azure cloud scalability and recurring enterprise SaaS contracts provide a highly defensive financial floor."
      ]
    },
    committee: {
      recommendation: "INVEST",
      confidence: 92,
      reasoning: "The committee voted to INVEST in Microsoft Corporation. The company exhibits exceptional business quality and fortress-like balance sheet dynamics. Its cloud platform is the primary infrastructure pipeline for enterprise artificial intelligence.",
      keyFactors: [
        "Fortress balance sheet and AA credit status",
        "Dominant Azure enterprise cloud footprint",
        "First-mover productivity monetization via Microsoft Copilot"
      ]
    }
  },
  google: {
    research: {
      businessOverview: "Alphabet Inc. (Google) is a global technology conglomerate. Its core assets include Google Search, Android mobile operating system, YouTube, Google Cloud Platform (GCP), and the Gemini large language model family. Alphabet is the global leader in digital search advertising.",
      revenueDrivers: [
        "Google Search and Search Network digital advertising clicks",
        "YouTube advertising revenues and premium subscriptions",
        "Google Cloud Platform (GCP) enterprise service contracts",
        "Google Play Store app fees and hardware devices (Pixel)"
      ],
      competitiveAdvantages: [
        "Search algorithm dominance with over 90% global market share and vast data feedback loop",
        "Android operating system install base powering over 70% of global mobile devices",
        "YouTube's network effects as the premier user-generated video platform",
        "Full stack AI capabilities, designing custom TPU silicon to reduce hardware dependance"
      ],
      growthCatalysts: [
        "Integration of generative AI Search Generative Experience (SGE) stabilizing ad monetization",
        "GCP capturing market share from AWS/Azure by offering TPU-focused AI model hosting",
        "Monetization of Gemini models across workspace SaaS products and developer API licensing",
        "Growth in YouTube Premium subscription ARPU and Connected TV advertising"
      ],
      risks: [
        "DOJ antitrust lawsuits targeting Search distribution contracts and AdTech stacks",
        "Generative AI answering engines (e.g. Perplexity, ChatGPT) threat to traditional query search volumes",
        "High cost of infrastructure investment to host AI search indexes at massive query scale",
        "Execution lags in cloud software deployment relative to key enterprise competitors"
      ],
      bullCase: "Alphabet sustains search ad leadership through the AI transition, GCP grows operating margins above 25% via AI infrastructure, and custom TPU usage protects gross margins from NVIDIA pricing."
    },
    scorecard: {
      businessQuality: 92,
      growthPotential: 84,
      competitiveMoat: 91,
      financialStrength: 93,
      riskLevel: 28,
      overallScore: 88,
      confidence: 90,
      recommendation: "INVEST"
    },
    challenge: {
      bearCase: "Alphabet is facing systemic legal threats from multiple DOJ antitrust antitrust cases that could force structural breakups. generative AI search interfaces represent a fundamental threat to the high-margin 10-blue-links search advertising model.",
      keyConcerns: [
        "Antitrust rulings breaking up Chrome, Android, or default search distribution contracts",
        "High query cost of generative AI search compared to traditional index lookups"
      ],
      hiddenRisks: [
        "Under-monetized search queries shifting permanently to non-ad chatbot alternatives"
      ],
      worstCaseScenario: "Legal remedies forbid Google from paying Apple for default search status, leading to search volume leakage, and Gemini model iterations fail to close execution gaps with competitors.",
      counterArguments: [
        "Alphabet's scale, proprietary search data loops, and custom TPU architectures present significant cost advantages."
      ]
    },
    committee: {
      recommendation: "INVEST",
      confidence: 90,
      reasoning: "The committee voted to INVEST in Alphabet Inc. Despite complex regulatory overhangs, Alphabet's core search and video network effects remain highly durable. The company possesses world-class AI research labs and a key hardware cost advantage with custom TPU custom chips.",
      keyFactors: [
        "Search search queries market share dominance",
        "Fortress-level net cash balance sheet status",
        "Custom TPU development mitigating margin erosion from external GPU purchases"
      ]
    }
  }
};

// Add alias mapping for Google/Alphabet
COMPANY_PROFILES['alphabet inc.'] = COMPANY_PROFILES.google;

/**
 * Resolves which profile to use based on company name search string.
 * Returns the exact matched profile or null.
 */
const resolveProfile = (name = "") => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("nvidia")) return COMPANY_PROFILES.nvidia;
  if (lowerName.includes("amd") || lowerName.includes("advanced micro devices")) return COMPANY_PROFILES.amd;
  if (lowerName.includes("microsoft")) return COMPANY_PROFILES.microsoft;
  if (lowerName.includes("google") || lowerName.includes("alphabet")) return COMPANY_PROFILES.google;
  return null;
};

/**
 * Generates a dynamic, seeded mock scorecard for custom companies.
 */
export const getMockScorecard = (companyName) => {
  const profile = resolveProfile(companyName);
  if (profile) return { ...profile.scorecard };

  const seed = getDeterministicSeed(companyName);
  const businessQuality = 60 + (seed % 36); // 60-95
  const growthPotential = 60 + ((seed >> 2) % 36);
  const competitiveMoat = 55 + ((seed >> 4) % 41);
  const financialStrength = 60 + ((seed >> 6) % 36);
  const riskLevel = 20 + ((seed >> 8) % 61); // 20-80

  const overallScore = Math.round(
    (businessQuality * 0.3) + 
    (growthPotential * 0.25) + 
    (competitiveMoat * 0.25) + 
    (financialStrength * 0.2) - 
    (riskLevel * 0.1)
  );

  const confidence = 70 + ((seed >> 10) % 26); // 70-95
  const recommendation = overallScore >= 80 ? "INVEST" : overallScore >= 60 ? "WATCH" : "PASS";

  return {
    businessQuality,
    growthPotential,
    competitiveMoat,
    financialStrength,
    riskLevel,
    overallScore,
    confidence,
    recommendation
  };
};

/**
 * Generates dynamic mock research details.
 */
export const getMockResearch = (companyName) => {
  const profile = resolveProfile(companyName);
  if (profile) return { ...profile.research };

  const seed = getDeterministicSeed(companyName);
  const industrySector = (seed % 3 === 0) ? "Technology & Software" : (seed % 3 === 1) ? "Consumer & Retail" : "Industrial Manufacturing";

  return {
    businessOverview: `${companyName} is an industry-leading player operating in the ${industrySector} sector. The enterprise is known for market-facing solutions, client-centric service delivery, and operational excellence.`,
    revenueDrivers: [
      `Product and service monetization within ${industrySector}`,
      "Expansion in enterprise software client acquisitions",
      "International market penetration and brand scaling"
    ],
    competitiveAdvantages: [
      "Proprietary technology stack and digital infrastructure",
      "High customer retention and brand equity",
      "Cost efficiencies driven by scale economies"
    ],
    growthCatalysts: [
      "Accelerating transition to digital services within the industry",
      "Strategic distribution partner integrations planned for next quarter",
      "Launch of updated high-margin product iterations"
    ],
    risks: [
      "Macroeconomic cycles and inflationary headwinds impacting margins",
      "Evolving local and international regulatory guidelines",
      "High competition from emerging agile startup players"
    ],
    bullCase: `${companyName} continues expanding its footprint inside core sectors, maintaining operating margins and out-competing historical legacy operators.`
  };
};

/**
 * Generates dynamic mock thesis challenges.
 */
export const getMockChallenge = (companyName) => {
  const profile = resolveProfile(companyName);
  if (profile) return { ...profile.challenge };

  const seed = getDeterministicSeed(companyName);
  return {
    bearCase: `The bear thesis for ${companyName} is focused on slowing market expansion within its sector and pressure on pricing power due to low switching costs.`,
    keyConcerns: [
      "Margin compression if competitors launch price campaigns",
      "High capital requirements to maintain market-leading positioning"
    ],
    hiddenRisks: [
      "Regulatory scrutiny or compliance changes increasing compliance costs"
    ],
    worstCaseScenario: `Failure to execute next-generation product migrations leads to structural volume losses and a market share drawdown.`,
    counterArguments: [
      "Strong historical balance sheet metrics provide high protection and capital reallocation optionality."
    ]
  };
};

/**
 * Generates dynamic mock committee decisions.
 */
export const getMockCommitteeDecision = (companyName, sourcesUsed = 0, evidenceMetrics = null) => {
  const profile = resolveProfile(companyName);
  const scorecard = getMockScorecard(companyName);
  const rec = scorecard.overallScore >= 80 ? "INVEST" : scorecard.overallScore >= 60 ? "WATCH" : "PASS";

  if (profile) {
    return {
      ...profile.committee,
      sourcesUsed,
      evidenceQualityScore: evidenceMetrics ? evidenceMetrics.evidenceQualityScore : 80,
      tierBreakdown: {
        tierA: evidenceMetrics ? (evidenceMetrics.tierA || 0) : 2,
        tierB: evidenceMetrics ? (evidenceMetrics.tierB || 0) : 1,
        tierC: evidenceMetrics ? (evidenceMetrics.tierC || 0) : 0,
        tierD: evidenceMetrics ? (evidenceMetrics.tierD || 0) : 0
      },
      decisionOverrideReason: null
    };
  }

  return {
    recommendation: rec,
    confidence: scorecard.confidence,
    reasoning: `The investment committee reviewed the profile, risk parameters, and research analysis for ${companyName}. Based on metrics scoring indicating an overall thesis score of ${scorecard.overallScore}/100, the committee resolved on a ${rec} stance.`,
    keyFactors: [
      `Overall investment score of ${scorecard.overallScore}/100`,
      "Stable sector growth tailwinds",
      `Risk metrics evaluated at ${scorecard.riskLevel}/100`
    ],
    sourcesUsed,
    evidenceQualityScore: evidenceMetrics ? evidenceMetrics.evidenceQualityScore : 75,
    tierBreakdown: {
      tierA: evidenceMetrics ? (evidenceMetrics.tierA || 0) : 1,
      tierB: evidenceMetrics ? (evidenceMetrics.tierB || 0) : 1,
      tierC: evidenceMetrics ? (evidenceMetrics.tierC || 0) : 0,
      tierD: evidenceMetrics ? (evidenceMetrics.tierD || 0) : 0
    },
    decisionOverrideReason: null
  };
};
