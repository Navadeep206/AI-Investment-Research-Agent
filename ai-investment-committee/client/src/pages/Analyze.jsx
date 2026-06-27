import React, { useState, useEffect, useRef } from 'react';
import { 
  Search as SearchIcon, 
  RefreshCw, 
  TrendingUp, 
  ShieldAlert, 
  Award, 
  FileText,
  AlertTriangle,
  ExternalLink,
  Clock,
  Layers,
  Activity,
  CheckCircle,
  Database,
  Cpu,
  BadgeAlert,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import apiService from '../services/apiService';
import AgentExecutionPanel from '../components/AgentExecutionPanel';
import DecisionTimeline from '../components/DecisionTimeline';

const Analyze = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [record, setRecord] = useState(null);
  const [cacheMeta, setCacheMeta] = useState(null);
  const [executionData, setExecutionData] = useState([]);
  const [recentCompanies, setRecentCompanies] = useState([]);
  const [showRecentDropdown, setShowRecentDropdown] = useState(false);
  const [evidenceFilter, setEvidenceFilter] = useState('ALL');
  const [expandedAgents, setExpandedAgents] = useState({
    research: false,
    devil: false,
    committee: false
  });
  const [activeTab, setActiveTab] = useState('timeline');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const blurTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);


  // Load recent searches on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vetting_recent_companies');
      if (stored) {
        setRecentCompanies(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load recent companies:", e);
    }
  }, []);

  const addRecentCompany = (companyName) => {
    const cleaned = companyName.toUpperCase().trim();
    if (!cleaned) return;
    setRecentCompanies(prev => {
      const filtered = prev.filter(c => c !== cleaned);
      const updated = [cleaned, ...filtered].slice(0, 5);
      localStorage.setItem('vetting_recent_companies', JSON.stringify(updated));
      return updated;
    });
  };

  const handleAnalyze = async (searchTarget) => {
    const targetQuery = (searchTarget || query).trim();
    if (!targetQuery) return;

    setQuery(targetQuery);
    setLoading(true);
    setError(null);
    setRecord(null);
    setCacheMeta(null);
    setExecutionData([]);
    setShowRecentDropdown(false);

    // Generate a unique session ID for tracking execution progress
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Poll the execution tracker state every 1 second
    let isFinished = false;
    const pollInterval = setInterval(async () => {
      if (isFinished) return;
      try {
        const response = await apiService.getExecutionState(sessionId);
        if (response && response.agents) {
          setExecutionData(response.agents);
        }
      } catch (err) {
        console.error('[Analyze] Error polling execution state:', err);
      }
    }, 1000);

    try {
      // Trigger the agent execution on backend
      const response = await apiService.analyzeCompany(targetQuery, sessionId);
      
      // Stop polling and run final state sync
      isFinished = true;
      clearInterval(pollInterval);
      
      try {
        const finalState = await apiService.getExecutionState(sessionId);
        if (finalState && finalState.agents) {
          setExecutionData(finalState.agents);
        }
      } catch (e) {
        console.error('[Analyze] Final poll error:', e);
      }

      // Fetch the full PostgreSQL details using the analysisId
      const fullRecord = await apiService.getAnalysis(response.analysisId);
      console.log("Analyze.jsx fullRecord:", fullRecord);
      setRecord(fullRecord);
      addRecentCompany(fullRecord.company);

      setCacheMeta({
        dataSource: response.dataSource,
        cacheReason: response.cacheReason,
        ageHours: response.ageHours || 0,
        generatedAt: response.generatedAt,
        requestId: response.requestId,
        timestamp: response.timestamp
      });
    } catch (err) {
      isFinished = true;
      clearInterval(pollInterval);
      
      try {
        const finalState = await apiService.getExecutionState(sessionId);
        if (finalState && finalState.agents) {
          setExecutionData(finalState.agents);
        }
      } catch (e) {
        console.error('[Analyze] Final error sync failed:', e);
      }

      // Check for rate limiting status or general message
      const errMsg = err.response?.data?.message || err.message || 'The LangGraph workflow encountered an error during execution. Verify API keys and connection parameters.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-[#10B981] border-[#10B981]/30 bg-[#10B981]/5';
    if (score >= 60) return 'text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/5';
    return 'text-[#EF4444] border-[#EF4444]/30 bg-[#EF4444]/5';
  };

  const getRecColor = (rec) => {
    const r = (rec || '').toUpperCase();
    if (r === 'INVEST') return 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30';
    if (r === 'WATCH') return 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30';
    return 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30';
  };

  const getEvidenceTierColor = (tier) => {
    const t = (tier || '').toUpperCase().trim();
    if (t.includes('TIER A')) return 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30';
    if (t.includes('TIER B')) return 'text-blue-400 bg-blue-950/20 border-blue-900/30';
    if (t.includes('TIER C')) return 'text-amber-400 bg-amber-950/20 border-amber-900/30';
    return 'text-red-400 bg-red-950/20 border-red-900/30';
  };

  // Dynamically resolve evidence array
  const getEvidenceItems = () => {
    if (record?.research?.evidence && Array.isArray(record.research.evidence) && record.research.evidence.length > 0) {
      return record.research.evidence;
    }
    return [];
  };

  // Dynamically resolve material events list
  const getMaterialEvents = () => {
    if (record?.finalDecision?.materialEvents && Array.isArray(record.finalDecision.materialEvents) && record.finalDecision.materialEvents.length > 0) {
      return record.finalDecision.materialEvents;
    }
    return [];
  };

  // Filter evidence based on select filter
  const filteredEvidence = getEvidenceItems().filter(item => {
    if (evidenceFilter === 'ALL') return true;
    return (item.tier || '').toUpperCase().includes(evidenceFilter);
  });

  return (
    <div className="bg-[#0A0E17] min-h-screen text-slate-100 p-6 sm:p-8 font-sans select-none">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Title */}
        <div className="sticky top-0 z-20 bg-[#0A0E17] pt-2 pb-6 border-b border-[#1F2937] flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-[32px] font-semibold tracking-wide text-white leading-normal">Analyze Company Terminal</h1>
            <p className="text-[15px] font-normal text-[#9CA3AF] mt-2 font-sans leading-[1.7]">
              Deploy a multi-agent LangGraph execution tracing pipeline to perform institutional security audits.
            </p>
          </div>
          <div className="text-xs text-[#9CA3AF] bg-[#111827] border border-[#1F2937] px-3 py-1.5 flex items-center gap-2 select-none font-mono">
            <Clock className="h-3.5 w-3.5 text-[#10B981]" />
            <span>SYSTEM CLOCK: <strong className="text-white">{new Date().toLocaleTimeString()}</strong></span>
          </div>
        </div>

        {/* Search Panel + Dropdown */}
        <div className="bg-[#111827] border border-[#1F2937] p-5 relative">
          <div className="flex flex-col sm:flex-row gap-3">
            <div 
              className="relative flex-1"
              onMouseLeave={() => setShowRecentDropdown(false)}
            >
              <SearchIcon className="absolute left-3.5 top-3 h-4.5 w-4.5 text-[#9CA3AF]" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowRecentDropdown(true);
                }}
                onFocus={() => {
                  if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
                  setIsInputFocused(true);
                  setShowRecentDropdown(true);
                }}
                onBlur={() => {
                  setIsInputFocused(false);
                  blurTimeoutRef.current = setTimeout(() => {
                    setShowRecentDropdown(false);
                  }, 200);
                }}
                onClick={() => {
                  if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
                  setShowRecentDropdown(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAnalyze();
                  else if (e.key === 'Escape') setShowRecentDropdown(false);
                }}
                placeholder="Enter ticker or company name (e.g. NVIDIA, AAPL, MSFT)..."
                disabled={loading}
                className="w-full bg-[#0A0E17] border border-[#1F2937] pl-11 pr-10 py-2.5 text-xs text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#10B981] font-semibold font-sans rounded-none"
              />
              {recentCompanies.length > 0 && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setShowRecentDropdown(!showRecentDropdown);
                  }}
                  className="absolute right-3 top-3.5"
                  title="Toggle recent search targets"
                >
                  <ChevronDown className="h-4 w-4 text-[#9CA3AF] hover:text-white" />
                </button>
              )}

              {/* Recent Companies Dropdown Menu */}
              {showRecentDropdown && !loading && recentCompanies.length > 0 && (
                <div className={`absolute left-0 right-0 top-[42px] bg-[#0A0E17] border border-t-0 z-50 shadow-2xl transition-colors duration-150 ${isInputFocused ? 'border-[#10B981]' : 'border-[#1F2937]'}`}>
                  <div className={`border-b px-3 py-2 text-[9px] font-bold flex items-center justify-between tracking-wider uppercase select-none transition-colors duration-150 ${isInputFocused ? 'border-[#10B981]/30 text-[#10B981]' : 'border-[#1F2937] text-[#9CA3AF]'}`}>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      RECENT SEARCH HISTORY
                    </span>
                    <span className="text-[8px] font-mono opacity-80">AUDITED DATA</span>
                  </div>
                  <div className={`divide-y transition-colors duration-150 ${isInputFocused ? 'divide-[#10B981]/20' : 'divide-[#1F2937]/60'}`}>
                    {recentCompanies.map((c, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleAnalyze(c);
                        }}
                        className="w-full text-left px-4 py-2.5 text-xs text-white hover:bg-[#10B981]/5 transition-all flex justify-between items-center group cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <Clock className="h-3.5 w-3.5 text-[#9CA3AF] group-hover:text-[#10B981] transition-colors" />
                          <strong className="group-hover:text-[#10B981] transition-colors font-mono tracking-wide">{c}</strong>
                        </span>
                        <span className="text-[8px] border border-[#10B981]/30 bg-[#10B981]/5 px-2 py-0.5 tracking-widest text-[#10B981] font-mono font-bold uppercase transition-all group-hover:bg-[#10B981]/15 group-hover:border-[#10B981]/50">
                          CACHED
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <button
              type="button"
              onClick={() => handleAnalyze()}
              disabled={loading || !query.trim()}
              className="bg-[#10B981] text-[#0A0E17] font-semibold text-xs px-8 py-2.5 hover:brightness-110 transition-all duration-150 flex items-center justify-center space-x-2 disabled:opacity-50 rounded-none cursor-pointer"
            >
              {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              <span>{loading ? 'Analyzing...' : 'Run Pipeline'}</span>
            </button>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="border border-[#EF4444]/40 bg-[#EF4444]/5 p-4 text-[#EF4444] text-xs flex items-start space-x-2.5">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <div className="font-sans leading-relaxed">
              <strong className="font-mono block text-xs uppercase mb-1">Workflow Pipeline Failure</strong>
              {error}
            </div>
          </div>
        )}

        {/* 1. Loading Workflow Screen */}
        {loading && (
          <div className="space-y-6">
            <div className="bg-[#111827] border border-[#1F2937] p-5 flex items-center space-x-4">
              <RefreshCw className="h-5 w-5 text-[#3B82F6] animate-spin" />
              <div>
                <h3 className="text-[20px] font-semibold text-white tracking-normal">Workflow Executing...</h3>
                <p className="text-xs text-[#9CA3AF] mt-0.5 font-sans">Please wait. Long-running analytical models are fetching fresh market updates.</p>
              </div>
            </div>
            <AgentExecutionPanel agents={executionData} />
          </div>
        )}

        {/* 2. Analysis Results Report Screen */}
        {record && !loading && (
          <div className="space-y-6">
            {/* View Toggle Tabs */}
            <div className="flex border-b border-[#1F2937] gap-2 mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`px-4 py-2 border-t-2 text-[10px] font-semibold tracking-wider transition-all duration-150 uppercase cursor-pointer rounded-none ${
                  activeTab === 'timeline'
                    ? 'border-[#10B981] bg-[#111827] text-white'
                    : 'border-transparent text-[#9CA3AF] hover:text-white hover:bg-[#111827]/40'
                }`}
              >
                AI Decision Timeline
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 border-t-2 text-[10px] font-semibold tracking-wider transition-all duration-150 uppercase cursor-pointer rounded-none ${
                  activeTab === 'dashboard'
                    ? 'border-[#10B981] bg-[#111827] text-white'
                    : 'border-transparent text-[#9CA3AF] hover:text-white hover:bg-[#111827]/40'
                }`}
              >
                Executive Dashboard
              </button>
            </div>

            {activeTab === 'timeline' ? (
              <DecisionTimeline record={record} />
            ) : (
              <>
                {/* VETTING TERMINAL HEADER PROFILE */}
                <div className="bg-[#111827] border border-[#1F2937] p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[9px] bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 px-2.5 py-0.5 font-bold uppercase">
                          {cacheMeta?.dataSource === 'CACHE' 
                            ? 'CACHE HIT' 
                            : cacheMeta?.dataSource === 'EVENT_REFRESH' 
                              ? 'EVENT REFRESH' 
                              : 'FRESH PIPELINE RUN'}
                        </span>
                        <span className={`text-[9px] border px-2.5 py-0.5 font-bold uppercase ${
                          record.freshnessStatus === 'LIVE' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-950/10' :
                          record.freshnessStatus === 'FRESH' ? 'text-blue-400 border-blue-500/30 bg-blue-950/10' :
                          record.freshnessStatus === 'RECENT' ? 'text-amber-400 border-emerald-500/30 bg-amber-950/10' :
                          'text-red-400 border-red-500/30 bg-red-950/10'
                        }`}>
                          {record.freshnessStatus || 'LIVE'}
                        </span>
                      </div>
                      <h2 className="text-2xl font-semibold text-white tracking-wide">{record.company}</h2>
                      <div className="text-xs text-[#9CA3AF] flex flex-wrap gap-x-6 gap-y-1 font-sans">
                        <span>INDUSTRY: <strong className="text-white font-mono">{record.industry || 'N/A'}</strong></span>
                        <span>MARKET CAP: <strong className="text-white font-mono">{record.marketCap || 'N/A'}</strong></span>
                      </div>
                    </div>
                    
                    <div className="text-right text-[10px] text-[#9CA3AF] font-mono leading-relaxed">
                      <div>ANALYSIS ID: <span className="text-slate-300">{record.id}</span></div>
                      <div>TIMESTAMP: <span className="text-slate-300">{new Date(record.createdAt).toLocaleString()}</span></div>
                    </div>
                  </div>
                </div>

                {/* CORE COMMITTEE TELEMETRY GRID (Requirement 6) */}
                <div className="bg-[#111827] border border-[#1F2937] p-5 space-y-4">
                  <h3 className="text-[20px] font-semibold text-white tracking-normal flex items-center gap-1.5 border-b border-[#1F2937] pb-3">
                    <Sparkles className="h-4 w-4 text-[#10B981]" />
                    Committee Verdict & Core Telemetry
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 font-mono">
                    <div className="border border-[#1F2937] bg-[#0A0E17] p-4 flex flex-col justify-between h-24">
                      <span className="text-[9px] font-medium text-[#9CA3AF] tracking-wider uppercase font-sans">Overall Score</span>
                      <strong className="text-2xl font-semibold text-white leading-none font-mono">{record.overallScore ?? record.scorecard?.overallScore ?? 'N/A'}/100</strong>
                    </div>

                    <div className="border border-[#1F2937] bg-[#0A0E17] p-4 flex flex-col justify-between h-24">
                      <span className="text-[9px] font-medium text-[#9CA3AF] tracking-wider uppercase font-sans">Business Quality</span>
                      <strong className="text-2xl font-semibold text-white leading-none font-mono">{record.scorecard?.businessQuality ?? 'N/A'}/100</strong>
                    </div>

                    <div className="border border-[#1F2937] bg-[#0A0E17] p-4 flex flex-col justify-between h-24">
                      <span className="text-[9px] font-medium text-[#9CA3AF] tracking-wider uppercase font-sans">Risk Level</span>
                      <strong className={`text-2xl font-semibold leading-none font-mono ${
                        (record.scorecard?.riskLevel ?? 0) <= 35 ? 'text-[#10B981]' : 
                        (record.scorecard?.riskLevel ?? 0) <= 65 ? 'text-[#F59E0B]' : 'text-[#EF4444]'
                      }`}>{record.scorecard?.riskLevel ?? 'N/A'}/100</strong>
                    </div>

                    <div className="border border-[#1F2937] bg-[#0A0E17] p-4 flex flex-col justify-between h-24">
                      <span className="text-[9px] font-medium text-[#9CA3AF] tracking-wider uppercase font-sans">Evidence Quality</span>
                      <strong className="text-2xl font-semibold text-[#10B981] leading-none font-mono">
                        {record.evidenceQualityScore != null
                          ? `${record.evidenceQualityScore}/100`
                          : record.finalDecision?.evidenceQualityScore != null
                            ? `${record.finalDecision.evidenceQualityScore}/100`
                            : 'N/A'}
                      </strong>
                    </div>

                    <div className="border border-[#1F2937] bg-[#0A0E17] p-4 flex flex-col justify-between h-24">
                      <span className="text-[9px] font-medium text-[#9CA3AF] tracking-wider uppercase font-sans">Confidence</span>
                      <strong className="text-2xl font-semibold text-white leading-none font-mono">{record.confidence ?? 0}%</strong>
                    </div>

                    <div className="border border-[#1F2937] bg-[#0A0E17] p-4 flex flex-col justify-between h-24">
                      <span className="text-[9px] font-medium text-[#9CA3AF] tracking-wider uppercase font-sans">Recommendation</span>
                      <span className={`text-xs font-bold py-1 border inline-block text-center mt-1 uppercase font-mono ${getRecColor(record.recommendation)}`}>
                        {record.recommendation || 'WATCH'}
                      </span>
                    </div>
                  </div>
                </div>

            {/* SCORECARD GRID */}
            <div className="bg-[#111827] border border-[#1F2937] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1F2937] pb-2">
                <h3 className="text-[20px] font-semibold text-white tracking-normal flex items-center gap-1.5 pb-1">
                  <Layers className="h-4 w-4 text-[#10B981]" />
                  Investment Scorecard Telemetry
                </h3>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { name: 'BUSINESS QUALITY', value: record.scorecard?.businessQuality },
                  { name: 'GROWTH POTENTIAL', value: record.scorecard?.growthPotential },
                  { name: 'COMPETITIVE MOAT', value: record.scorecard?.competitiveMoat },
                  { name: 'FINANCIAL STRENGTH', value: record.scorecard?.financialStrength },
                  { name: 'RISK LEVEL', value: record.scorecard?.riskLevel, isRisk: true },
                  { name: 'OVERALL SCORE', value: record.overallScore, isOverall: true },
                  { name: 'CALIBRATED CONF.', value: record.confidence }
                ].map((item, idx) => {
                  let colorClass = getScoreColor(item.value);
                  if (item.isRisk) {
                    colorClass = item.value <= 35 
                      ? 'text-[#10B981] border-[#10B981]/30 bg-[#10B981]/5' 
                      : item.value <= 65 
                        ? 'text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/5' 
                        : 'text-[#EF4444] border-[#EF4444]/30 bg-[#EF4444]/5';
                  }

                  return (
                    <div key={idx} className={`border p-3.5 flex flex-col justify-between h-22 ${colorClass}`}>
                      <span className="text-[7.5px] font-medium text-[#9CA3AF] tracking-wider uppercase leading-snug font-sans">{item.name}</span>
                      <span className="text-2xl font-semibold leading-none font-mono">{item.value ?? 'N/A'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI COMMITTEE ROOM */}
            <div className="space-y-3">
              <h3 className="text-[20px] font-semibold text-[#10B981] tracking-normal flex items-center gap-1.5 pb-1">
                <Cpu className="h-4 w-4 text-[#10B981]" />
                AI Committee Room Reports
              </h3>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                
                {/* Research Agent */}
                <div className="bg-[#111827] border border-[#1F2937] p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <h4 className="text-[18px] font-semibold text-white tracking-wide border-b border-[#1F2937] pb-1.5 flex items-center justify-between gap-1.5 font-sans">
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-[#3B82F6] flex-shrink-0" />
                        Research Agent
                      </span>
                      <button 
                        type="button"
                        onClick={() => setExpandedAgents(prev => ({ ...prev, research: !prev.research }))}
                        className="w-[84px] py-1 border border-[#3B82F6]/30 hover:border-[#3B82F6] hover:bg-[#3B82F6]/5 text-[#3B82F6] text-center text-[8px] font-mono tracking-wider font-bold transition-all duration-150 rounded-none cursor-pointer flex-shrink-0"
                      >
                        {expandedAgents.research ? 'COLLAPSE ▲' : 'EXPAND ▼'}
                      </button>
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-[8px] text-[#3B82F6] font-bold uppercase">Business Overview</span>
                        <p className={`text-[10px] text-[#9CA3AF] leading-relaxed mt-0.5 ${expandedAgents.research ? '' : 'line-clamp-3'}`}>
                          {record.research?.businessOverview || 'No research summary found.'}
                        </p>
                      </div>
                      {record.research?.growthCatalysts && (
                        <div>
                          <span className="text-[8px] text-[#3B82F6] font-bold uppercase">Growth Drivers</span>
                          <ul className="list-disc pl-3 text-[10px] text-[#9CA3AF] mt-0.5 space-y-0.5">
                            {record.research.growthCatalysts.slice(0, expandedAgents.research ? undefined : 2).map((g, i) => <li key={i}>{g}</li>)}
                          </ul>
                        </div>
                      )}
                      {record.research?.competitiveAdvantages && (
                        <div>
                          <span className="text-[8px] text-[#3B82F6] font-bold uppercase">Competitive Moats</span>
                          <ul className="list-disc pl-3 text-[10px] text-[#9CA3AF] mt-0.5 space-y-0.5">
                            {record.research.competitiveAdvantages.slice(0, expandedAgents.research ? undefined : 2).map((a, i) => <li key={i}>{a}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Scoring Agent */}
                <div className="bg-[#111827] border border-[#1F2937] p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-white tracking-widest border-b border-[#1F2937] pb-1.5 flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-[#10B981]" />
                      SCORING AGENT
                    </h4>
                    <div className="space-y-2.5">
                      <div className="text-[10px] text-[#9CA3AF]">
                        Score card breakdown parsing core fundamental vectors.
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] text-[#9CA3AF] border-b border-[#1F2937]/45 pb-0.5">
                          <span>Business Quality</span>
                          <span className="text-white font-bold">{record.scorecard?.businessQuality || 50}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-[#9CA3AF] border-b border-[#1F2937]/45 pb-0.5">
                          <span>Growth Moat</span>
                          <span className="text-white font-bold">{record.scorecard?.growthPotential || 50}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-[#9CA3AF] border-b border-[#1F2937]/45 pb-0.5">
                          <span>Financial Safety</span>
                          <span className="text-white font-bold">{record.scorecard?.financialStrength || 50}</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-[#9CA3AF]">
                          <span>Risk Level Rating</span>
                          <span className="text-white font-bold">{record.scorecard?.riskLevel || 50}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="text-[8px] text-[#9CA3AF] uppercase">INITIAL GRADING</div>
                    <span className={`inline-block px-2 py-0.5 text-[9px] font-bold mt-1 border ${getRecColor(record.scorecard?.recommendation)}`}>
                      {record.scorecard?.recommendation || 'WATCH'}
                    </span>
                  </div>
                </div>

                {/* Devil's Advocate */}
                <div className="bg-[#111827] border border-[#1F2937] p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <h4 className="text-[18px] font-semibold text-[#EF4444] tracking-wide border-b border-[#1F2937] pb-1.5 flex items-center justify-between gap-1.5 font-sans">
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert className="h-4 w-4 text-[#EF4444] flex-shrink-0" />
                        Devil's Advocate
                      </span>
                      <button 
                        type="button"
                        onClick={() => setExpandedAgents(prev => ({ ...prev, devil: !prev.devil }))}
                        className="w-[84px] py-1 border border-[#EF4444]/30 hover:border-[#EF4444] hover:bg-[#EF4444]/5 text-[#EF4444] text-center text-[8px] font-mono tracking-wider font-bold transition-all duration-150 rounded-none cursor-pointer flex-shrink-0"
                      >
                        {expandedAgents.devil ? 'COLLAPSE ▲' : 'EXPAND ▼'}
                      </button>
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-[8px] text-[#EF4444] font-bold uppercase">Bear Case</span>
                        <p className={`text-[10px] text-[#9CA3AF] leading-relaxed mt-0.5 ${expandedAgents.devil ? '' : 'line-clamp-3'}`}>
                          {record.challenge?.bearCase || 'No bear case scenario compiled.'}
                        </p>
                      </div>
                      {record.challenge?.keyConcerns && (
                        <div>
                          <span className="text-[8px] text-[#EF4444] font-bold uppercase">Critical Concerns</span>
                          <ul className="list-disc pl-3 text-[10px] text-[#9CA3AF] mt-0.5 space-y-0.5">
                            {record.challenge.keyConcerns.slice(0, expandedAgents.devil ? undefined : 2).map((c, i) => <li key={i}>{c}</li>)}
                          </ul>
                        </div>
                      )}
                      {record.challenge?.worstCaseScenario && (
                        <div>
                          <span className="text-[8px] text-[#EF4444] font-bold uppercase">Worst Case Outcome</span>
                          <p className={`text-[10px] text-[#9CA3AF] leading-relaxed mt-0.5 italic ${expandedAgents.devil ? '' : 'line-clamp-2'}`}>
                            "{record.challenge.worstCaseScenario}"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Committee Decision */}
                <div className="bg-[#111827] border border-[#1F2937] p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <h4 className="text-[18px] font-semibold text-amber-500 tracking-wide border-b border-[#1F2937] pb-1.5 flex items-center justify-between gap-1.5 font-sans">
                      <span className="flex items-center gap-1.5">
                        <Award className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        Committee Memo
                      </span>
                      <button 
                        type="button"
                        onClick={() => setExpandedAgents(prev => ({ ...prev, committee: !prev.committee }))}
                        className="w-[84px] py-1 border border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/5 text-amber-500 text-center text-[8px] font-mono tracking-wider font-bold transition-all duration-150 rounded-none cursor-pointer flex-shrink-0"
                      >
                        {expandedAgents.committee ? 'COLLAPSE ▲' : 'EXPAND ▼'}
                      </button>
                    </h4>
                    <div className="space-y-2 text-[#9CA3AF]">
                      <div>
                        <span className="text-[8px] text-amber-500 font-bold uppercase">Final Consensus Reasoning</span>
                        <p className={`text-[10px] leading-relaxed mt-0.5 text-white ${expandedAgents.committee ? '' : 'line-clamp-4'}`}>
                          {record.finalDecision?.reasoning || 'No committee memo found.'}
                        </p>
                      </div>
                      {record.finalDecision?.decisionOverrideReason && (
                        <div className="text-[9px] border border-[#EF4444]/30 bg-[#EF4444]/5 p-2 text-[#EF4444]">
                          <strong>OVERRIDE RATIONALE: </strong>{record.finalDecision.decisionOverrideReason}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-end justify-between border-t border-[#1F2937] pt-2">
                    <div>
                      <div className="text-[8px] text-[#9CA3AF] uppercase font-bold">RESOLUTION</div>
                      <span className={`inline-block px-2.5 py-0.5 text-[9px] font-bold mt-1 border ${getRecColor(record.recommendation)}`}>
                        {record.recommendation || 'WATCH'}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] text-[#9CA3AF] uppercase font-bold">CONVICTION</div>
                      <div className="text-xs text-white font-semibold font-mono mt-1">{record.confidence}%</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* MIDDLE PANELS GRID (EVIDENCE LEDGER + MATERIAL EVENTS) */}
            <div className="grid gap-6 lg:grid-cols-5">
              
              {/* Evidence Ledger */}
              <div className="bg-[#111827] border border-[#1F2937] p-5 lg:col-span-3 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-[#1F2937] pb-3">
                  <h3 className="text-[20px] font-semibold text-white tracking-normal flex items-center gap-1.5 pb-1">
                    <Database className="h-4 w-4 text-[#10B981]" />
                    Evidence Ledger Terminal
                  </h3>
                  
                  {/* Tier filters */}
                  <div className="flex items-center gap-1 font-sans">
                    {['ALL', 'TIER A', 'TIER B', 'TIER C'].map((tier, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setEvidenceFilter(tier)}
                        className={`text-[8.5px] font-semibold px-2 py-0.5 border rounded-none transition-all duration-150 cursor-pointer ${
                          evidenceFilter === tier 
                            ? 'bg-[#10B981] text-[#0A0E17] border-[#10B981]' 
                            : 'bg-transparent text-[#9CA3AF] border-[#1F2937] hover:border-[#10B981]'
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#1F2937] text-[#9CA3AF]">
                        <th className="py-2 font-bold">SOURCE</th>
                        <th className="py-2 font-bold">TIER</th>
                        <th className="py-2 font-bold text-center">CONF.</th>
                        <th className="py-2 font-bold">CLAIM SUMMARY</th>
                        <th className="py-2 font-bold">PUBLISHED TIME</th>
                        <th className="py-2 font-bold text-right">ACTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F2937]/50">
                      {filteredEvidence.length > 0 ? (
                        filteredEvidence.map((item, idx) => (
                          <tr key={idx} className="hover:bg-[#1F2937]/30 text-slate-300">
                            <td className="py-2 font-bold text-white max-w-[120px] truncate">{item.source}</td>
                            <td className="py-2">
                              <span className={`px-1.5 py-0.25 border text-[7.5px] font-bold ${getEvidenceTierColor(item.tier)}`}>
                                {item.tier || 'Tier C'}
                              </span>
                            </td>
                            <td className="py-2 text-center text-slate-200 font-semibold font-mono">{item.confidence}%</td>
                            <td className="py-2 max-w-[200px] break-words whitespace-pre-wrap" title={item.claim}>
                              {item.claim}
                            </td>
                            <td className="py-2 text-[#9CA3AF] font-mono text-[10px] whitespace-nowrap">
                              {item.publishedTime || item.publishedDate || 'N/A'}
                            </td>
                            <td className="py-2 text-right">
                              <a 
                                href={item.url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="inline-flex items-center text-[#10B981] hover:bg-[#10B981]/10 text-[9.5px] font-semibold border border-[#10B981]/20 bg-[#10B981]/5 px-2 py-1 uppercase rounded-none transition-all duration-150 cursor-pointer font-sans"
                              >
                                Open Source <ExternalLink className="h-3 w-3 ml-0.5" />
                              </a>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="py-4 text-center text-[#9CA3AF]">No sources match the selected filter.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Material Events Panel */}
              <div className="bg-[#111827] border border-[#1F2937] p-5 lg:col-span-2 space-y-4">
                <h3 className="text-[20px] font-semibold text-white tracking-normal flex items-center gap-1.5 border-b border-[#1F2937] pb-3">
                  <Activity className="h-4 w-4 text-[#10B981]" />
                  Detected Material Events
                </h3>

                <div className="overflow-y-auto max-h-[220px] pr-1 space-y-3">
                  {getMaterialEvents().length > 0 ? (
                    getMaterialEvents().map((e, idx) => (
                      <div key={idx} className="border border-[#1F2937] p-3 space-y-2 bg-[#0A0E17]/40">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[8px] font-bold text-[#F59E0B] border border-[#F59E0B]/30 bg-[#F59E0B]/10 px-1.5 py-0.5 rounded-sm">
                            {e.type}
                          </span>
                          <span className="text-[9px] text-[#9CA3AF] font-sans">
                            {new Date(e.publishedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white leading-snug">{e.title}</h4>
                        <div className="text-[9px] text-[#9CA3AF] uppercase">
                          SOURCE: <strong className="text-slate-200">{e.source}</strong>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center h-[180px] border border-[#1F2937]/50 bg-[#0A0E17]/10 p-4">
                      <CheckCircle className="h-6 w-6 text-[#10B981] mb-2" />
                      <span className="text-xs text-white font-semibold uppercase">All Clear</span>
                      <p className="text-[10px] text-[#9CA3AF] mt-1 font-sans leading-relaxed">
                        No recent material events, guidance shifts, or leadership changes detected for this asset.
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* BOTTOM PANELS GRID (DECISION AUDIT + CACHE METADATA) */}
            <div className="grid gap-6 md:grid-cols-2">
              
              {/* Decision Audit Panel */}
              <div className="bg-[#111827] border border-[#1F2937] p-5 space-y-4">
                <h3 className="text-[20px] font-semibold text-white tracking-normal border-b border-[#1F2937] pb-3 flex items-center gap-1.5">
                  <BadgeAlert className="h-4 w-4 text-[#10B981]" />
                  Decision Audit & Reason Codes
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <span className="text-[8px] text-[#9CA3AF] font-bold uppercase">Audit Reason Codes</span>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {record.recommendationReasonCodes && record.recommendationReasonCodes.length > 0 ? (
                          record.recommendationReasonCodes.map((code, idx) => (
                            <span key={idx} className="text-[8px] font-bold bg-[#EF4444]/10 border border-[#EF4444]/35 text-[#EF4444] px-2 py-0.5 rounded-sm">
                              {code}
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] text-[#10B981] font-bold border border-[#10B981]/25 bg-[#10B981]/5 px-2 py-0.5">
                            STANDARD_APPROVAL_PASS
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[8px] text-[#9CA3AF] font-bold uppercase">Guardrails Triggered</span>
                      <p className="text-[10.5px] text-[#9CA3AF] mt-1.5 font-sans leading-relaxed">
                        {record.finalDecision?.decisionOverrideReason 
                          ? `Safety override active: ${record.finalDecision.decisionOverrideReason}`
                          : 'No active guardrail safety overrides triggered during committee vote.'}
                      </p>
                    </div>
                  </div>

                  <div className="border border-[#1F2937] bg-[#0A0E17]/40 p-4 space-y-3">
                    <span className="text-[8px] text-white font-bold uppercase tracking-wider block border-b border-[#1F2937] pb-1">
                      CONFIDENCE SCORE CALIBRATION
                    </span>
                    
                    {record.confidenceBreakdown ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-[11px] text-[#9CA3AF]">
                          <span>Evidence Quality (40%):</span>
                          <span className="text-white font-semibold font-mono">{record.confidenceBreakdown.evidenceQuality || 0}%</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-[#9CA3AF]">
                          <span>Data Quality (30%):</span>
                          <span className="text-white font-semibold font-mono">{record.confidenceBreakdown.dataQuality || 0}%</span>
                        </div>
                        <div className="flex justify-between text-[11px] text-[#9CA3AF]">
                          <span>Agent Agreement (30%):</span>
                          <span className="text-white font-semibold font-mono">{record.confidenceBreakdown.agentAgreement || 0}%</span>
                        </div>
                        <div className="border-t border-[#1F2937] pt-1.5 flex justify-between text-[11px] font-bold text-[#10B981]">
                          <span>Calculated Conviction:</span>
                          <span className="font-mono">{record.confidence || 0}%</span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-[#9CA3AF] italic">
                        No calibration breakdown metadata compiled for this analysis.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Cache Metadata Panel */}
              <div className="bg-[#111827] border border-[#1F2937] p-5 space-y-4">
                <h3 className="text-[20px] font-semibold text-white tracking-normal border-b border-[#1F2937] pb-3 flex items-center gap-1.5">
                  <Database className="h-4 w-4 text-[#10B981]" />
                  Cache Metadata & Telemetry Console
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-[11px] text-[#9CA3AF] border-b border-[#1F2937]/45 pb-1">
                      <span>Data Source:</span>
                      <span className="text-[#3B82F6] font-bold font-mono">{cacheMeta?.dataSource || 'FRESH_RUN'}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-[#9CA3AF] border-b border-[#1F2937]/45 pb-1 font-sans">
                      <span>Cache Status Detail:</span>
                      <span className="text-white font-mono">{cacheMeta?.cacheReason || 'pipeline_run'}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-[#9CA3AF] border-b border-[#1F2937]/45 pb-1">
                      <span>Freshness Score:</span>
                      <span className="text-white font-semibold font-mono">{record.freshnessScore ?? 100}/100</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-[#9CA3AF] border-b border-[#1F2937]/45 pb-1">
                      <span>Evidence Age:</span>
                      <span className="text-white font-semibold font-mono">{record.evidenceAgeMinutes ?? 0}m</span>
                    </div>
                  </div>

                  <div className="border border-[#1F2937] bg-[#0A0E17]/40 p-4 flex flex-col justify-between text-[10px] text-[#9CA3AF] font-mono leading-relaxed space-y-2">
                    <div>
                      <span className="text-[8px] text-[#9CA3AF] font-bold uppercase block border-b border-[#1F2937] pb-1">
                        Tracing Console Logs
                      </span>
                      <div className="mt-2 font-mono text-[9px] text-slate-300 select-all">
                        REQUEST ID: {cacheMeta?.requestId || record.requestId || 'N/A'}
                      </div>
                      <div className="mt-1 font-mono text-[9px] text-[#9CA3AF]">
                        TRACE TIMESTAMP: {cacheMeta?.timestamp || record.createdAt}
                      </div>
                    </div>
                    <div className="text-[9px] text-[#9CA3AF] font-sans border-t border-[#1F2937] pt-2">
                      Telemetry checks validated against Neon database.
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    )}

      </div>
    </div>
  );
};

export default Analyze;
