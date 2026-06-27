import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  TrendingUp, 
  ShieldAlert, 
  Award, 
  Clock, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Database,
  Calendar,
  Layers,
  Sparkles,
  Info,
  Play
} from 'lucide-react';

const DecisionTimeline = ({ record }) => {
  const [expandedCard, setExpandedCard] = useState(null);

  if (!record) return null;

  const research = record.research || {};
  const scorecard = record.scorecard || {};
  const challenge = record.challenge || {};
  const finalDecision = record.finalDecision || {};

  // Pacing and execution metrics
  const agentMetrics = record.agentMetrics || {
    researchMs: 1800,
    scoringMs: 1600,
    devilMs: 2000,
    committeeMs: 1500,
    totalMs: 9900
  };

  const researchMs = agentMetrics.researchMs || 1800;
  const scoringMs = agentMetrics.scoringMs || 1600;
  const devilMs = agentMetrics.devilMs || 2000;
  const committeeMs = agentMetrics.committeeMs || 1500;
  
  // Dynamically calculate totalMs to include 1500ms spacing between agents so they execute sequentially
  const stepDelayMs = 1500;
  const totalMs = researchMs + scoringMs + devilMs + committeeMs + (3 * stepDelayMs);

  const endTimestamp = new Date(record.createdAt || Date.now()).getTime();
  const t0 = endTimestamp - totalMs;

  const formatTime = (timeMs) => {
    return new Date(timeMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const steps = [
    {
      id: 'research',
      name: 'Research Agent',
      role: 'Equity Research Analyst',
      status: 'Completed',
      icon: FileText,
      color: 'text-blue-400 border-blue-900/30 bg-blue-950/5 hover:bg-blue-950/10',
      glow: 'shadow-blue-500/10',
      duration: `${(researchMs / 1000).toFixed(2)}s`,
      startTime: formatTime(t0),
      endTime: formatTime(t0 + researchMs)
    },
    {
      id: 'scoring',
      name: 'Scoring Agent',
      role: 'Fundamental Scoring Modeler',
      status: 'Completed',
      icon: TrendingUp,
      color: 'text-emerald-400 border-emerald-900/30 bg-emerald-950/5 hover:bg-emerald-950/10',
      glow: 'shadow-emerald-500/10',
      duration: `${(scoringMs / 1000).toFixed(2)}s`,
      startTime: formatTime(t0 + researchMs + stepDelayMs),
      endTime: formatTime(t0 + researchMs + stepDelayMs + scoringMs)
    },
    {
      id: 'devil',
      name: "Devil's Advocate",
      role: 'Risk Stress Tester',
      status: 'Completed',
      icon: ShieldAlert,
      color: 'text-amber-400 border-amber-900/30 bg-amber-950/5 hover:bg-amber-950/10',
      glow: 'shadow-amber-500/10',
      duration: `${(devilMs / 1000).toFixed(2)}s`,
      startTime: formatTime(t0 + researchMs + scoringMs + (2 * stepDelayMs)),
      endTime: formatTime(t0 + researchMs + scoringMs + (2 * stepDelayMs) + devilMs)
    },
    {
      id: 'committee',
      name: 'Committee Agent',
      role: 'Consensus Decision Body',
      status: 'Completed',
      icon: Award,
      color: 'text-purple-400 border-purple-900/30 bg-purple-950/5 hover:bg-purple-950/10',
      glow: 'shadow-purple-500/10',
      duration: `${(committeeMs / 1000).toFixed(2)}s`,
      startTime: formatTime(t0 + researchMs + scoringMs + devilMs + (3 * stepDelayMs)),
      endTime: formatTime(endTimestamp)
    }
  ];

  const getRecBadgeStyles = (rec) => {
    const r = (rec || '').toUpperCase();
    if (r === 'INVEST') return 'text-emerald-400 bg-emerald-950/30 border-emerald-500/50 shadow-emerald-500/20';
    if (r === 'WATCH') return 'text-amber-400 bg-amber-950/30 border-amber-500/50 shadow-amber-500/20';
    return 'text-red-400 bg-red-950/30 border-red-500/50 shadow-red-500/20';
  };

  const getScoringReason = (sc) => {
    if (!sc) return "No scorecard data available.";
    const businessGrade = sc.businessQuality >= 80 ? "strong business model" : sc.businessQuality >= 60 ? "moderate business foundations" : "fragile operational model";
    const moatGrade = sc.competitiveMoat >= 80 ? "a highly durable competitive moat" : sc.competitiveMoat >= 60 ? "a partial market advantage" : "thin competitive protections";
    const riskGrade = sc.riskLevel <= 35 ? "low structural volatility" : sc.riskLevel <= 65 ? "moderate volatility risks" : "high risk factors";
    return `Graded at ${sc.overallScore}/100, reflecting ${businessGrade} combined with ${moatGrade} and ${riskGrade}.`;
  };

  const toggleExpand = (cardId) => {
    setExpandedCard(expandedCard === cardId ? null : cardId);
  };

  return (
    <div className="space-y-6 font-mono">
      {/* 1. AGENT EXECUTION TRACK (Timeline Flow Visualizer) */}
      <div className="bg-[#111827] border border-[#1F2937] p-6 shadow-lg">
        <div className="flex items-center justify-between border-b border-[#1F2937] pb-3 mb-6">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#10B981]" />
            <h4 className="text-xs font-bold text-white tracking-widest uppercase">LangGraph Pipeline Timeline</h4>
          </div>
          <span className="text-[9px] text-[#9CA3AF] uppercase">
            Total Pipeline Time: <strong className="text-white font-mono">{parseFloat((totalMs / 1000).toFixed(2))}s</strong>
          </span>
        </div>

        {/* Visual vertical node track */}
        <div className="relative border-l-2 border-[#1F2937] ml-6 pl-8 space-y-6 py-2">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className="relative flex flex-col md:flex-row md:items-center justify-between p-4 border border-[#1F2937] bg-[#0A0E17]/40 shadow-sm hover:bg-[#0A0E17]/60 transition-all gap-4">
                {/* Visual node circle */}
                <div className="absolute -left-[43px] top-1/2 -translate-y-1/2 flex items-center justify-center h-7 w-7 rounded-full border border-slate-700 bg-[#0A0E17] z-10 text-slate-300">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                
                <div className="text-left">
                  <h5 className="text-xs font-bold text-white uppercase tracking-wider">{step.name}</h5>
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">{step.role}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 md:gap-6 text-[10px] font-mono">
                  <div className="flex items-center gap-1 bg-[#10B981]/15 text-[#10B981] px-2 py-0.5 border border-[#10B981]/30 font-bold uppercase">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>{step.status}</span>
                  </div>

                  <div className="flex items-center gap-1 text-slate-300">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <span>Duration: <strong className="text-white font-bold">{step.duration}</strong></span>
                  </div>

                  <div className="text-[#9CA3AF] text-[9px] space-y-0.5 leading-none bg-[#111827] border border-[#1F2937] px-2 py-1">
                    <div>START: {step.startTime}</div>
                    <div>END: {step.endTime}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. CHRONOLOGICAL REASONING CARDS LIST */}
      <div className="space-y-4">
        {/* RESEARCH AGENT CARD */}
        <div className={`border bg-[#111827] shadow-sm transition-all duration-200 ${expandedCard === 'research' ? 'ring-1 ring-blue-500' : 'border-[#1F2937]'}`}>
          <div 
            onClick={() => toggleExpand('research')}
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer hover:bg-slate-800/25 select-none gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 border border-blue-900/30 bg-blue-950/15 rounded-none flex-shrink-0">
                <FileText className="h-4 w-4 text-blue-400" />
              </div>
              <h4 className="text-[15px] font-semibold text-white tracking-wide">Research Agent</h4>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-[10px] bg-blue-950/30 text-blue-400 border border-blue-500/25 px-2 py-0.5 font-mono font-bold uppercase tracking-wider">
                BULLISH REPORT GENERATED
              </span>
              <span className="font-mono text-slate-400">{(researchMs / 1000).toFixed(2)}s</span>
              <span className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1 uppercase select-none">
                {expandedCard === 'research' ? 'Collapse ▲' : 'Expand ▼'}
              </span>
            </div>
          </div>

          <AnimatePresence>
            {expandedCard === 'research' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-[#1F2937]"
              >
                <div className="p-4 space-y-4 text-xs font-sans text-slate-300 leading-relaxed text-left">
                  {/* Unified Metadata Block */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 border border-[#1F2937] p-3 bg-[#0A0E17]/30 font-mono text-[10px]">
                    <div>
                      <span className="text-[8px] text-[#9CA3AF] uppercase font-bold block">Status</span>
                      <span className="text-[#10B981] font-bold uppercase mt-1 inline-block">COMPLETED</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#9CA3AF] uppercase font-bold block">Execution Time</span>
                      <span className="text-white font-bold mt-1 inline-block">{(researchMs / 1000).toFixed(2)}s</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#9CA3AF] uppercase font-bold block">Confidence</span>
                      <span className="text-slate-400 font-bold mt-1 inline-block">N/A (Research)</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#9CA3AF] uppercase font-bold block">Evidence Count</span>
                      <span className="text-white font-bold mt-1 inline-block">{record.sourcesUsed ?? research.evidence?.length ?? 0} items</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#9CA3AF] uppercase font-bold block">Focus Area</span>
                      <span className="text-white font-bold mt-1 inline-block uppercase truncate">Equity Research</span>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-mono text-[9px] text-white uppercase tracking-wider font-bold mb-1">Business Overview</h5>
                    <p className="bg-[#0A0E17]/20 p-2.5 border border-[#1F2937]/50 break-words whitespace-pre-wrap">{research.businessOverview || 'N/A'}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h5 className="font-mono text-[9px] text-white uppercase tracking-wider font-bold mb-1">Top 3 Competitive Advantages</h5>
                      <ul className="list-disc pl-4 space-y-1 text-slate-400 font-mono text-[10px]">
                        {(research.competitiveAdvantages || []).slice(0, 3).map((adv, i) => <li key={i}>{adv}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-mono text-[9px] text-white uppercase tracking-wider font-bold mb-1">Top 3 Growth Catalysts</h5>
                      <ul className="list-disc pl-4 space-y-1 text-slate-400 font-mono text-[10px]">
                        {(research.growthCatalysts || []).slice(0, 3).map((cat, i) => <li key={i}>{cat}</li>)}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-mono text-[9px] text-white uppercase tracking-wider font-bold mb-1">Bull Case Summary</h5>
                    <p className="bg-[#0A0E17]/20 p-2.5 border border-[#1F2937]/50 break-words whitespace-pre-wrap">{research.bullCase || 'N/A'}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SCORING AGENT CARD */}
        <div className={`border bg-[#111827] shadow-sm transition-all duration-200 ${expandedCard === 'scoring' ? 'ring-1 ring-emerald-500' : 'border-[#1F2937]'}`}>
          <div 
            onClick={() => toggleExpand('scoring')}
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer hover:bg-slate-800/25 select-none gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 border border-emerald-900/30 bg-emerald-950/15 rounded-none flex-shrink-0">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
              <h4 className="text-[15px] font-semibold text-white tracking-wide">Scoring Agent</h4>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-[10px] bg-emerald-950/30 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 font-mono font-bold uppercase tracking-wider">
                OVERALL SCORE: {scorecard.overallScore || record.overallScore || 'N/A'}/100
              </span>
              <span className="font-mono text-slate-400">{(scoringMs / 1000).toFixed(2)}s</span>
              <span className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1 uppercase select-none">
                {expandedCard === 'scoring' ? 'Collapse ▲' : 'Expand ▼'}
              </span>
            </div>
          </div>

          <AnimatePresence>
            {expandedCard === 'scoring' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-[#1F2937]"
              >
                <div className="p-4 space-y-4 text-xs font-sans text-slate-300 leading-relaxed text-left">
                  {/* Unified Metadata Block */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 border border-[#1F2937] p-3 bg-[#0A0E17]/30 font-mono text-[10px]">
                    <div>
                      <span className="text-[8px] text-[#9CA3AF] uppercase font-bold block">Status</span>
                      <span className="text-[#10B981] font-bold uppercase mt-1 inline-block">COMPLETED</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#9CA3AF] uppercase font-bold block">Execution Time</span>
                      <span className="text-white font-bold mt-1 inline-block">{(scoringMs / 1000).toFixed(2)}s</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#9CA3AF] uppercase font-bold block">Confidence</span>
                      <span className="text-white font-bold mt-1 inline-block">{scorecard.confidence || record.confidence}%</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#9CA3AF] uppercase font-bold block">Evidence Count</span>
                      <span className="text-slate-400 font-bold mt-1 inline-block">N/A</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-[#9CA3AF] uppercase font-bold block">Focus Area</span>
                      <span className="text-white font-bold mt-1 inline-block uppercase">Scoring Model</span>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-mono text-[9px] text-white uppercase tracking-wider font-bold mb-2">Fundamental Vector Grading</h5>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
                      {[
                        { label: "Business Quality", val: scorecard.businessQuality },
                        { label: "Growth Potential", val: scorecard.growthPotential },
                        { label: "Financial Strength", val: scorecard.financialStrength },
                        { label: "Competitive Moat", val: scorecard.competitiveMoat },
                        { label: "Risk Level Rating", val: scorecard.riskLevel, isRisk: true }
                      ].map((item, idx) => (
                        <div key={idx} className="border border-[#1F2937] p-2 bg-[#0A0E17]/30 flex flex-col justify-between">
                          <span className="text-[8px] text-[#9CA3AF] uppercase font-bold leading-none">{item.label}</span>
                          <span className="text-sm font-bold text-white mt-1">{item.val ?? 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-mono text-[9px] text-white uppercase tracking-wider font-bold mb-1">Assigned Score Commentary</h5>
                    <p className="bg-[#0A0E17]/20 p-2.5 border border-[#1F2937]/50 font-sans text-slate-300 break-words whitespace-pre-wrap">
                      {getScoringReason(scorecard)}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* DEVIL'S ADVOCATE CARD (WARNING THEME) */}
        <div className={`border bg-[#1A1612] shadow-sm transition-all duration-200 ${expandedCard === 'devil' ? 'ring-1 ring-amber-500' : 'border-amber-900/30'}`}>
          <div 
            onClick={() => toggleExpand('devil')}
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer hover:bg-amber-950/10 select-none gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 border border-amber-900/30 bg-amber-950/20 rounded-none flex-shrink-0">
                <ShieldAlert className="h-4 w-4 text-amber-400" />
              </div>
              <h4 className="text-[15px] font-semibold text-amber-400 tracking-wide">Devil's Advocate</h4>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="text-[10px] bg-amber-950/40 text-amber-400 border border-amber-500/20 px-2 py-0.5 font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                ADVERSARIAL STRESS ACTIVE
              </span>
              <span className="font-mono text-amber-400">{(devilMs / 1000).toFixed(2)}s</span>
              <span className="text-[10px] font-mono font-bold text-amber-400 flex items-center gap-1 uppercase select-none">
                {expandedCard === 'devil' ? 'Collapse ▲' : 'Expand ▼'}
              </span>
            </div>
          </div>

          <AnimatePresence>
            {expandedCard === 'devil' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-amber-900/20"
              >
                <div className="p-4 space-y-4 text-xs font-sans text-slate-300 leading-relaxed text-left">
                  {/* Unified Metadata Block */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 border border-amber-900/30 p-3 bg-[#0A0E17]/30 font-mono text-[10px]">
                    <div>
                      <span className="text-[8px] text-amber-500 uppercase font-bold block">Status</span>
                      <span className="text-amber-400 font-bold uppercase mt-1 inline-block">COMPLETED</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-amber-500 uppercase font-bold block">Execution Time</span>
                      <span className="text-white font-bold mt-1 inline-block">{(devilMs / 1000).toFixed(2)}s</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-amber-500 uppercase font-bold block">Confidence</span>
                      <span className="text-amber-500/70 font-bold mt-1 inline-block">N/A</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-amber-500 uppercase font-bold block">Evidence Count</span>
                      <span className="text-amber-500/70 font-bold mt-1 inline-block">N/A</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-amber-500 uppercase font-bold block">Focus Area</span>
                      <span className="text-white font-bold mt-1 inline-block uppercase">Stress Tester</span>
                    </div>
                  </div>

                  <div className="bg-amber-950/5 border border-amber-500/20 p-2.5 text-[10px] text-amber-400 flex items-start gap-2 leading-relaxed">
                    <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    <span><strong>ATTENTION RECRUITER:</strong> This is a stress-test report designed to identify downside risks and failure modes. It acts as an adversarial check on the bullish assumptions.</span>
                  </div>

                  <div>
                    <h5 className="font-mono text-[9px] text-amber-400 uppercase tracking-wider font-bold mb-1">Bear Case Thesis</h5>
                    <p className="bg-[#0A0E17]/20 p-2.5 border border-[#1F2937]/50 break-words whitespace-pre-wrap">{challenge.bearCase || 'N/A'}</p>
                  </div>

                  <div>
                    <h5 className="font-mono text-[9px] text-amber-400 uppercase tracking-wider font-bold mb-1">Worst Case Scenario</h5>
                    <p className="bg-[#0A0E17]/20 p-2.5 border border-[#1F2937]/50 italic break-words whitespace-pre-wrap">"{challenge.worstCaseScenario || 'N/A'}"</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h5 className="font-mono text-[9px] text-amber-400 uppercase tracking-wider font-bold mb-1">Top Vulnerabilities</h5>
                      <ul className="list-disc pl-4 space-y-1 text-slate-400 font-mono text-[10px]">
                        {(challenge.keyConcerns || []).slice(0, 3).map((conc, i) => <li key={i}>{conc}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-mono text-[9px] text-amber-400 uppercase tracking-wider font-bold mb-1">Counter-Arguments</h5>
                      <ul className="list-disc pl-4 space-y-1 text-slate-400 font-mono text-[10px]">
                        {(challenge.counterArguments || []).slice(0, 3).map((arg, i) => <li key={i}>{arg}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* COMMITTEE AGENT CARD */}
        <div className={`border bg-[#111827] shadow-sm transition-all duration-200 ${expandedCard === 'committee' ? 'ring-1 ring-purple-500' : 'border-[#1F2937]'}`}>
          <div 
            onClick={() => toggleExpand('committee')}
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer hover:bg-slate-800/25 select-none gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 border border-purple-900/30 bg-purple-950/15 rounded-none flex-shrink-0">
                <Award className="h-4 w-4 text-purple-400" />
              </div>
              <h4 className="text-[15px] font-semibold text-white tracking-wide">Committee Agent</h4>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className={`text-[10px] border px-2 py-0.5 font-mono font-bold uppercase tracking-wider ${getRecBadgeStyles(record.recommendation)}`}>
                RECOMMENDATION: {record.recommendation || 'N/A'} ({record.confidence || 0}%)
              </span>
              <span className="font-mono text-slate-400">{(committeeMs / 1000).toFixed(2)}s</span>
              <span className="text-[10px] font-mono font-bold text-slate-400 flex items-center gap-1 uppercase select-none">
                {expandedCard === 'committee' ? 'Collapse ▲' : 'Expand ▼'}
              </span>
            </div>
          </div>

          <AnimatePresence>
            {expandedCard === 'committee' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-[#1F2937]"
              >
                <div className="p-4 space-y-4 text-xs font-sans text-slate-300 leading-relaxed text-left">
                  {/* Unified Metadata Block */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 border border-purple-900/30 p-3 bg-[#0A0E17]/30 font-mono text-[10px]">
                    <div>
                      <span className="text-[8px] text-purple-400 uppercase font-bold block">Status</span>
                      <span className="text-[#10B981] font-bold uppercase mt-1 inline-block">COMPLETED</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-purple-400 uppercase font-bold block">Execution Time</span>
                      <span className="text-white font-bold mt-1 inline-block">{(committeeMs / 1000).toFixed(2)}s</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-purple-400 uppercase font-bold block">Confidence</span>
                      <span className="text-white font-bold mt-1 inline-block">{finalDecision.confidence || record.confidence}%</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-purple-400 uppercase font-bold block">Evidence Count</span>
                      <span className="text-white font-bold mt-1 inline-block">{record.sourcesUsed ?? finalDecision.sourcesUsed ?? 0} items</span>
                    </div>
                    <div>
                      <span className="text-[8px] text-purple-400 uppercase font-bold block">Focus Area</span>
                      <span className="text-white font-bold mt-1 inline-block uppercase">Consensus Body</span>
                    </div>
                  </div>

                  {/* Dynamic Committee Rationale & Agent Votes (Requirement 5) */}
                  <div className="border border-purple-500/20 bg-purple-950/5 p-4 space-y-4 rounded-sm">
                    <h5 className="font-mono text-[9px] text-purple-400 uppercase tracking-widest font-bold">Committee Deliberation Consensus</h5>
                    
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <span className="text-[8px] text-[#9CA3AF] uppercase font-bold">Final Resolved Vote</span>
                        <div className={`mt-1.5 py-1 px-3 border text-center font-bold text-sm tracking-wider uppercase ${getRecBadgeStyles(record.recommendation)}`}>
                          {record.recommendation || 'WATCH'}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-[8px] text-[#9CA3AF] uppercase font-bold">Consensus Conviction</span>
                        <div className="text-2xl font-black text-white mt-1">
                          {finalDecision.confidence || record.confidence}%
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-[8px] text-[#9CA3AF] uppercase font-bold">Evidence Quality</span>
                        <div className="text-2xl font-black text-[#10B981] mt-1">
                          {(record.evidenceQualityScore ?? finalDecision.evidenceQualityScore) != null
                            ? `${record.evidenceQualityScore ?? finalDecision.evidenceQualityScore}/100`
                            : 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <span className="text-[8px] text-[#9CA3AF] uppercase font-bold block mb-1.5">Agent Vote Matrix</span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[9px]">
                        <div className="border border-[#1F2937] p-2 bg-[#0A0E17]/40 flex flex-col">
                          <span className="text-[7px] text-[#9CA3AF]">RESEARCH AGENT</span>
                          <span className="text-blue-400 font-bold mt-1">BULLISH</span>
                        </div>
                        <div className="border border-[#1F2937] p-2 bg-[#0A0E17]/40 flex flex-col">
                          <span className="text-[7px] text-[#9CA3AF]">SCORING AGENT</span>
                          <span className={`font-bold mt-1 ${
                            scorecard.recommendation === 'INVEST' ? 'text-emerald-400' :
                            scorecard.recommendation === 'WATCH' ? 'text-amber-400' : 'text-red-400'
                          }`}>{scorecard.recommendation || 'N/A'}</span>
                        </div>
                        <div className="border border-amber-900/30 p-2 bg-amber-950/5 flex flex-col">
                          <span className="text-[7px] text-amber-500">DEVIL'S ADVOCATE</span>
                          <span className="text-amber-400 font-bold mt-1">BEARISH (STRESS ACTIVE)</span>
                        </div>
                        <div className="border border-purple-900/30 p-2 bg-purple-950/5 flex flex-col">
                          <span className="text-[7px] text-purple-400">COMMITTEE AGENT</span>
                          <span className={`font-bold mt-1 ${
                            (record.recommendation || 'WATCH') === 'INVEST' ? 'text-emerald-400' :
                            (record.recommendation || 'WATCH') === 'WATCH' ? 'text-amber-400' : 'text-red-400'
                          }`}>{record.recommendation || 'WATCH'} (CONSENSUS)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-mono text-[9px] text-white uppercase tracking-wider font-bold mb-1">Synthesized Rationale</h5>
                    <p className="bg-[#0A0E17]/20 p-2.5 border border-[#1F2937]/50 font-sans text-slate-300 break-words whitespace-pre-wrap">
                      {finalDecision.reasoning || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <h5 className="font-mono text-[9px] text-white uppercase tracking-wider font-bold mb-2">LangGraph Weight Synthesis Breakdown</h5>
                    <div className="space-y-2 border border-[#1F2937] p-3 bg-[#0A0E17]/20">
                      {[
                        { name: "Research Agent (Bull Case / Catalysts)", weight: "40%", width: "w-[40%]", color: "bg-blue-500" },
                        { name: "Scoring Agent (Grades & Scorecard)", weight: "30%", width: "w-[30%]", color: "bg-emerald-500" },
                        { name: "Devil's Advocate (Bear Case Downside risks)", weight: "20%", width: "w-[20%]", color: "bg-amber-500" },
                        { name: "Evidence Quality (Audited Sources Credibility)", weight: "10%", width: "w-[10%]", color: "bg-purple-500" }
                      ].map((bar, idx) => (
                        <div key={idx} className="space-y-1 font-mono text-[9px]">
                          <div className="flex justify-between text-[#9CA3AF]">
                            <span>{bar.name}</span>
                            <span className="text-white font-bold">{bar.weight}</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#1F2937]">
                            <div className={`h-full ${bar.color} ${bar.width}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-mono text-[9px] text-white uppercase tracking-wider font-bold mb-1">Decision Key Factors</h5>
                    <ul className="list-disc pl-4 space-y-1 text-slate-400 font-mono text-[10px]">
                      {(finalDecision.keyFactors || []).map((factor, i) => <li key={i}>{factor}</li>)}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 3. FINAL SUMMARY BADGE CARD */}
      <div className="bg-[#111827] border border-[#1F2937] p-6 shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Background Sparkle design */}
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 opacity-5 pointer-events-none">
          <Sparkles className="h-64 w-64 text-white" />
        </div>

        <div className="space-y-2 text-center sm:text-left">
          <span className="text-[10px] text-[#9CA3AF] uppercase font-bold tracking-widest">Committee Verdict Resolved</span>
          <h2 className="text-2xl font-black text-white tracking-widest uppercase">{record.company}</h2>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-[9px] text-[#9CA3AF] font-mono">
            <span>SECTOR: <strong className="text-white">{record.industry || 'N/A'}</strong></span>
            <span>FILED: <strong className="text-white">{new Date(record.createdAt).toLocaleString()}</strong></span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Metadata points */}
          <div className="grid grid-cols-2 gap-4 text-center sm:text-right font-mono text-[10px] text-[#9CA3AF]">
            <div>
              <span className="block font-bold">OVERALL SCORE</span>
              <strong className="text-lg font-black text-white">{record.overallScore || scorecard.overallScore || 0}/100</strong>
            </div>
            <div>
              <span className="block font-bold">CONFIDENCE</span>
              <strong className="text-lg font-black text-white">{record.confidence || finalDecision.confidence || 0}%</strong>
            </div>
            <div>
              <span className="block font-bold">EVIDENCE QUALITY</span>
              <strong className="text-lg font-black text-[#10B981]">
                {(record.evidenceQualityScore ?? finalDecision.evidenceQualityScore) != null
                  ? `${record.evidenceQualityScore ?? finalDecision.evidenceQualityScore}/100`
                  : 'N/A'}
              </strong>
            </div>
            <div>
              <span className="block font-bold">SOURCES AUDITED</span>
              <strong className="text-lg font-black text-white">{record.sourcesUsed || finalDecision.sourcesUsed || 0} items</strong>
            </div>
          </div>

          {/* Glowing Verdict badge */}
          <div className="shrink-0 flex flex-col items-center justify-center">
            <div className={`text-center py-4 px-8 border-2 shadow-2xl tracking-widest font-black text-2xl uppercase ${getRecBadgeStyles(record.recommendation)}`}>
              {record.recommendation || 'WATCH'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DecisionTimeline;
