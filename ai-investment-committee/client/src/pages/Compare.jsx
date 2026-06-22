import React, { useState, useEffect } from 'react';
import { 
  GitCompare, 
  AlertTriangle, 
  Award, 
  TrendingUp, 
  Layers, 
  Check, 
  RefreshCw,
  Info,
  ArrowLeftRight,
  Download,
  AlertOctagon,
  FileText,
  ShieldAlert,
  Clock,
  ExternalLink
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend,
  Cell
} from 'recharts';
import apiService from '../services/apiService';

const Compare = () => {
  const [companyA, setCompanyA] = useState('');
  const [companyB, setCompanyB] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [recordA, setRecordA] = useState(null);
  const [recordB, setRecordB] = useState(null);
  const [recentComparisons, setRecentComparisons] = useState([]);
  const [exporting, setExporting] = useState(false);

  // Load recent comparisons on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vetting_recent_comparisons');
      if (stored) {
        setRecentComparisons(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load recent comparisons:", e);
    }
  }, []);

  const addRecentComparison = (nameA, nameB) => {
    const key = `${nameA.toUpperCase()} vs ${nameB.toUpperCase()}`;
    setRecentComparisons(prev => {
      const filtered = prev.filter(c => c !== key);
      const updated = [key, ...filtered].slice(0, 5);
      localStorage.setItem('vetting_recent_comparisons', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSwap = () => {
    const temp = companyA;
    setCompanyA(companyB);
    setCompanyB(temp);
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleCompare = async (e, searchA = null, searchB = null) => {
    if (e) e.preventDefault();
    
    const targetA = (searchA || companyA).trim();
    const targetB = (searchB || companyB).trim();

    if (!targetA || !targetB) return;
    if (targetA.toLowerCase() === targetB.toLowerCase()) {
      setError('Cannot compare a company with itself. Enter two different stock names.');
      return;
    }

    setCompanyA(targetA);
    setCompanyB(targetB);
    setLoading(true);
    setError(null);
    setResult(null);
    setRecordA(null);
    setRecordB(null);

    try {
      // Step 1: Load Company A
      setLoadingStep(1);
      await sleep(800);

      // Step 2: Load Company B
      setLoadingStep(2);
      await sleep(800);

      // Step 3: Compare Scorecards
      setLoadingStep(3);
      const response = await apiService.compareCompanies(targetA, targetB);
      
      // Step 4: Generate Recommendation
      setLoadingStep(4);
      const history = await apiService.getHistory();
      
      const matchA = history.find(h => h.company.toLowerCase() === response.companyA.name.toLowerCase());
      const matchB = history.find(h => h.company.toLowerCase() === response.companyB.name.toLowerCase());

      setRecordA(matchA || null);
      setRecordB(matchB || null);
      setResult(response);
      addRecentComparison(response.companyA.name, response.companyB.name);

      await sleep(600);
    } catch (err) {
      const status = err.response?.status;
      const serverMsg = err.response?.data?.message || err.message || '';
      
      let clientMsg = 'Comparison benchmarking failed. Verify database records and connection status.';
      if (status === 404 || serverMsg.includes('not found') || serverMsg.includes('Found')) {
        clientMsg = `Company search failed: One or both companies ("${targetA}" or "${targetB}") could not be located in live or historical databases. Verify stock tickers.`;
      } else if (status === 429) {
        clientMsg = 'Rate Limit Exceeded: The platform has hit API limits for LangGraph analysis runs. Please wait 15 minutes before running another benchmark.';
      } else if (serverMsg.includes('completeness') || serverMsg.includes('incomplete') || serverMsg.includes('Insufficient')) {
        clientMsg = 'Insufficient Data: One or both targets do not have complete fundamental scorecards. Please run full individual analyses first.';
      } else if (serverMsg) {
        clientMsg = `Comparison Failed: ${serverMsg}`;
      }
      setError(clientMsg);
    } finally {
      setLoading(false);
    }
  };

  const getWinnerBadgeColor = (rec) => {
    const r = (rec || '').toUpperCase();
    if (r === 'INVEST') return 'text-[#10B981] border-[#10B981]/40 bg-[#10B981]/10';
    if (r === 'WATCH') return 'text-[#F59E0B] border-[#F59E0B]/40 bg-[#F59E0B]/10';
    return 'text-[#EF4444] border-[#EF4444]/40 bg-[#EF4444]/10';
  };

  const handleExportPDF = async () => {
    if (!result) return;
    try {
      setExporting(true);
      setError(null);
      const nameA = result.companyA.name;
      const nameB = result.companyB.name;
      const blob = await apiService.downloadComparisonPDF(nameA, nameB);
      
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${nameA.toUpperCase()}_vs_${nameB.toUpperCase()}_Comparison_Report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error("PDF download failed:", err);
      setError("Failed to export institutional comparison PDF report. Please verify connection and try again.");
    } finally {
      setExporting(false);
    }
  };

  // Compile Warnings
  const getComparisonWarnings = () => {
    if (!result) return [];
    const alerts = [];
    const nameA = result.companyA.name;
    const nameB = result.companyB.name;

    if (result.dataQuality.companyA < 90) {
      alerts.push({ type: 'Incomplete Data', company: nameA, message: `Scorecard metrics completeness rating is under 90% (${result.dataQuality.companyA}%).` });
    }
    if (result.dataQuality.companyB < 90) {
      alerts.push({ type: 'Incomplete Data', company: nameB, message: `Scorecard metrics completeness rating is under 90% (${result.dataQuality.companyB}%).` });
    }
    if (recordA && (recordA.materialEventCount || 0) > 0) {
      alerts.push({ type: 'Material Event Detected', company: nameA, message: `${recordA.materialEventCount} corporate filings or guidance changes were detected since last analysis.` });
    }
    if (recordB && (recordB.materialEventCount || 0) > 0) {
      alerts.push({ type: 'Material Event Detected', company: nameB, message: `${recordB.materialEventCount} corporate filings or guidance changes were detected since last analysis.` });
    }
    if (recordA && (recordA.evidenceQualityScore || 100) < 80) {
      alerts.push({ type: 'Low Evidence Quality', company: nameA, message: `Evidence credibility bounds are below optimal safeties (${recordA.evidenceQualityScore}%).` });
    }
    if (recordB && (recordB.evidenceQualityScore || 100) < 80) {
      alerts.push({ type: 'Low Evidence Quality', company: nameB, message: `Evidence credibility bounds are below optimal safeties (${recordB.evidenceQualityScore}%).` });
    }
    if (recordA?.finalDecision?.decisionOverrideReason) {
      alerts.push({ type: 'Guardrail Triggered', company: nameA, message: `Active safety override: ${recordA.finalDecision.decisionOverrideReason}` });
    }
    if (recordB?.finalDecision?.decisionOverrideReason) {
      alerts.push({ type: 'Guardrail Triggered', company: nameB, message: `Active safety override: ${recordB.finalDecision.decisionOverrideReason}` });
    }

    return alerts;
  };

  // Compile Bar Chart Data
  const getBarChartData = () => {
    if (!result) return [];
    return [
      {
        metric: 'Overall Scores',
        [result.companyA.name]: result.companyA.score || 0,
        [result.companyB.name]: result.companyB.score || 0
      },
      {
        metric: 'Confidence',
        [result.companyA.name]: recordA?.confidence || result.companyA.score ? 75 : 0, // Fallback if record is slow
        [result.companyB.name]: recordB?.confidence || result.companyB.score ? 75 : 0
      },
      {
        metric: 'Evidence Quality',
        [result.companyA.name]: recordA?.evidenceQualityScore || 0,
        [result.companyB.name]: recordB?.evidenceQualityScore || 0
      },
      {
        metric: 'Freshness Score',
        [result.companyA.name]: recordA?.freshnessScore || 100,
        [result.companyB.name]: recordB?.freshnessScore || 100
      }
    ];
  };

  return (
    <div className="bg-[#0A0E17] min-h-screen text-slate-100 p-6 sm:p-8 font-mono relative select-none print:bg-white print:text-black">
      
      {/* Dynamic Printing CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          .print-card { 
            background: #ffffff !important; 
            color: #000000 !important; 
            border: 1px solid #ccc !important;
            box-shadow: none !important;
          }
          .print-text { color: #000000 !important; }
          body { background: #ffffff !important; color: #000000 !important; }
          table { width: 100% !important; border: 1px solid #ddd !important; }
          th, td { padding: 6px !important; border-bottom: 1px solid #ddd !important; color: #000 !important; }
        }
      `}} />

      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div className="border-b border-[#1F2937] pb-6 flex flex-col sm:flex-row justify-between sm:items-end gap-4 no-print">
          <div>
            <h1 className="text-xl font-bold tracking-widest text-white">COMPARE COMPANIES TERMINAL</h1>
            <p className="text-xs text-[#9CA3AF] mt-1 font-sans">
              Perform side-by-side institutional metrics benchmarking and multivariate conviction checks.
            </p>
          </div>
          {result && (
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="bg-[#1F2937] text-white hover:bg-slate-800 text-xs px-4 py-2 border border-[#1F2937] flex items-center space-x-1.5 transition-all disabled:opacity-50"
            >
              {exporting ? (
                <RefreshCw className="h-4 w-4 animate-spin text-white" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span>{exporting ? 'EXPORTING PDF...' : 'EXPORT PDF REPORT'}</span>
            </button>
          )}
        </div>

        {/* Inputs Panel */}
        <div className="bg-[#111827] border border-[#1F2937] p-5 space-y-4 no-print">
          <form onSubmit={(e) => handleCompare(e)} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-[9px] text-[#9CA3AF] font-bold block mb-1.5 uppercase">Security A</label>
              <input
                type="text"
                value={companyA}
                onChange={(e) => setCompanyA(e.target.value)}
                placeholder="e.g. NVIDIA, NVDA"
                disabled={loading}
                className="w-full bg-[#0A0E17] border border-[#1F2937] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#10B981] font-bold"
              />
            </div>
            
            <div className="flex items-center justify-center h-10 select-none">
              <button
                type="button"
                onClick={handleSwap}
                disabled={loading}
                className="bg-[#1F2937]/50 text-slate-400 hover:text-white border border-[#1F2937] p-2.5 rounded-sm transition-all"
                title="Swap security inputs"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="text-[9px] text-[#9CA3AF] font-bold block mb-1.5 uppercase">Security B</label>
              <input
                type="text"
                value={companyB}
                onChange={(e) => setCompanyB(e.target.value)}
                placeholder="e.g. AMD"
                disabled={loading}
                className="w-full bg-[#0A0E17] border border-[#1F2937] px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#10B981] font-bold"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !companyA.trim() || !companyB.trim()}
              className="bg-[#10B981] text-[#0A0E17] font-bold text-xs py-2.5 hover:brightness-110 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 h-10"
            >
              {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              <span>{loading ? 'COMPILING COMPARISON...' : 'RUN BENCHMARK'}</span>
            </button>
          </form>

          {/* Recent Comparisons */}
          {recentComparisons.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1F2937]/50 select-none">
              <span className="text-[9px] text-[#9CA3AF] font-bold uppercase">RECENT TARGETS:</span>
              {recentComparisons.map((c, idx) => {
                const [a, b] = c.split(' vs ');
                return (
                  <button
                    key={idx}
                    onClick={() => handleCompare(null, a, b)}
                    className="text-[8.5px] font-bold text-slate-300 bg-[#0A0E17] border border-[#1F2937] hover:border-[#10B981] px-2 py-0.5"
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Error notification */}
        {error && (
          <div className="border border-[#EF4444]/40 bg-[#EF4444]/5 p-4 text-[#EF4444] text-xs flex items-start space-x-2.5 no-print">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <div className="font-sans leading-relaxed">
              <strong className="font-mono block text-xs uppercase mb-1">Benchmarking Error</strong>
              {error}
            </div>
          </div>
        )}

        {/* Loading Progress State */}
        {loading && (
          <div className="bg-[#111827] border border-[#1F2937] p-8 space-y-6 max-w-xl mx-auto font-mono no-print">
            <h3 className="text-xs font-bold text-white tracking-widest flex items-center gap-2 border-b border-[#1F2937] pb-3 select-none">
              <RefreshCw className="h-4 w-4 text-[#3B82F6] animate-spin" />
              COMPARISON BENCHMARK ENGINE
            </h3>
            <div className="space-y-4">
              {[
                { step: 1, label: `Evaluating fundamental metrics for ${companyA.toUpperCase() || 'Security A'}...` },
                { step: 2, label: `Evaluating fundamental metrics for ${companyB.toUpperCase() || 'Security B'}...` },
                { step: 3, label: 'Running scorecard comparison vectors...' },
                { step: 4, label: 'Generating advisory decisions and consensus rationales...' }
              ].map((item, idx) => {
                const isDone = loadingStep > item.step;
                const isActive = loadingStep === item.step;
                return (
                  <div key={idx} className={`flex items-center space-x-3 text-xs ${
                    isDone ? 'text-[#10B981]' : isActive ? 'text-white font-bold' : 'text-[#9CA3AF]'
                  }`}>
                    {isDone ? (
                      <Check className="h-4 w-4 shrink-0" />
                    ) : isActive ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-[#3B82F6] shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-[#1F2937] shrink-0" />
                    )}
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Comparative Results Area */}
        {result && !loading && (
          <div className="space-y-6">
            
            {/* Header: Company A vs Company B Info */}
            <div className="bg-[#111827] border border-[#1F2937] p-5 print-card">
              <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-6">
                
                {/* Company A Header */}
                <div className="md:col-span-2 space-y-1">
                  <div className="text-[9px] text-[#10B981] font-bold">SECURITY A</div>
                  <h2 className="text-xl font-black text-white uppercase tracking-wider print-text">{result.companyA.name}</h2>
                  <div className="text-xs text-[#9CA3AF] font-sans">
                    INDUSTRY: <strong className="text-white font-mono">{recordA?.industry || 'N/A'}</strong> | CAP: <strong className="text-white font-mono">{recordA?.marketCap || 'N/A'}</strong>
                  </div>
                  <div className="flex gap-4 pt-1 text-[10px] text-[#9CA3AF]">
                    <span>REC: <strong className="text-white font-mono">{result.companyA.recommendation}</strong></span>
                    <span>CONV: <strong className="text-white font-mono">{recordA?.confidence || 75}%</strong></span>
                  </div>
                </div>

                {/* VS Panel */}
                <div className="text-center flex flex-col justify-center items-center select-none no-print">
                  <div className="h-10 w-10 rounded-full border border-[#1F2937] bg-[#0A0E17] flex items-center justify-center">
                    <span className="text-xs font-black text-[#9CA3AF]">VS</span>
                  </div>
                </div>

                {/* Company B Header */}
                <div className="md:col-span-2 space-y-1 md:text-right">
                  <div className="text-[9px] text-[#3B82F6] font-bold">SECURITY B</div>
                  <h2 className="text-xl font-black text-white uppercase tracking-wider print-text">{result.companyB.name}</h2>
                  <div className="text-xs text-[#9CA3AF] font-sans">
                    INDUSTRY: <strong className="text-white font-mono">{recordB?.industry || 'N/A'}</strong> | CAP: <strong className="text-white font-mono">{recordB?.marketCap || 'N/A'}</strong>
                  </div>
                  <div className="flex md:justify-end gap-4 pt-1 text-[10px] text-[#9CA3AF]">
                    <span>REC: <strong className="text-white font-mono">{result.companyB.recommendation}</strong></span>
                    <span>CONV: <strong className="text-white font-mono">{recordB?.confidence || 75}%</strong></span>
                  </div>
                </div>

              </div>
            </div>

            {/* WINNER RESOLUTION BANNER */}
            {result.comparison.winner && (
              <div className="bg-[#111827] border border-[#1F2937] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print-card">
                <div>
                  <span className="text-[8px] text-[#9CA3AF] font-bold tracking-widest uppercase">WINNER RESOLUTION BANNER</span>
                  <div className="flex items-center space-x-3.5 mt-2">
                    <div className="text-2xl">🏆</div>
                    <div>
                      <h3 className="text-lg font-black text-white uppercase tracking-wider print-text">
                        {result.comparison.winner === 'TIE' ? 'EQUIVALENT THESIS TIE' : result.comparison.winner}
                      </h3>
                      <div className="text-xs text-[#9CA3AF] font-sans mt-0.5">
                        Choose Recommendation: <strong className="text-[#10B981] font-mono">{result.comparison.recommendation}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="border border-[#1F2937] bg-[#0A0E17]/40 px-3.5 py-2 flex flex-col justify-between h-14 min-w-[100px]">
                    <span className="text-[7.5px] font-bold text-[#9CA3AF] tracking-wider uppercase">WINNER SCORE</span>
                    <span className="text-lg font-black text-white mt-0.5 print-text">{result.comparison.winnerScore || 'N/A'}</span>
                  </div>
                  <div className="border border-[#1F2937] bg-[#0A0E17]/40 px-3.5 py-2 flex flex-col justify-between h-14 min-w-[100px]">
                    <span className="text-[7.5px] font-bold text-[#9CA3AF] tracking-wider uppercase">DIFFERENCE</span>
                    <span className="text-lg font-black text-[#10B981] mt-0.5">
                      {result.comparison.scoreDifference !== null ? `+${result.comparison.scoreDifference}` : 'TIE'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* WARNINGS PANEL */}
            {getComparisonWarnings().length > 0 && (
              <div className="bg-[#111827] border border-[#1F2937] p-5 space-y-3 no-print">
                <span className="text-[8px] text-[#EF4444] font-bold uppercase tracking-widest flex items-center gap-1.5">
                  <AlertOctagon className="h-4 w-4" /> ACTIVE ANALYSIS WARNING INDICATORS
                </span>
                <div className="grid gap-3 sm:grid-cols-2">
                  {getComparisonWarnings().map((item, idx) => (
                    <div key={idx} className="border border-[#EF4444]/35 bg-[#EF4444]/5 p-3 text-[10.5px] text-[#EF4444] leading-relaxed flex items-start gap-2 font-sans">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 font-mono" />
                      <div>
                        <strong className="font-mono text-[9px] uppercase border border-[#EF4444]/40 px-1 py-0.25 mr-1.5">{item.type}</strong>
                        <span className="font-mono text-white font-bold">{item.company}</span>: {item.message}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SIDE-BY-SIDE SCORECARD BENCHMARKS */}
            <div className="bg-[#111827] border border-[#1F2937] p-5 print-card">
              <h3 className="text-xs font-bold text-white tracking-widest border-b border-[#1F2937] pb-3 mb-4 print-text">
                COMPARATIVE SCORES SCORECARD
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#1F2937] text-[#9CA3AF]">
                      <th className="py-2.5 font-bold">VETTING CATEGORY</th>
                      <th className="py-2.5 font-bold text-right uppercase text-[#10B981]">{result.companyA.name}</th>
                      <th className="py-2.5 font-bold text-right uppercase text-[#3B82F6]">{result.companyB.name}</th>
                      <th className="py-2.5 font-bold text-center">METRIC WINNER</th>
                      <th className="py-2.5 font-bold text-right">DIFFERENCE</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]/50">
                    {[
                      { key: 'businessQuality', label: 'Business Quality Score' },
                      { key: 'growthPotential', label: 'Growth Potential Score' },
                      { key: 'competitiveMoat', label: 'Competitive Moat Score' },
                      { key: 'financialStrength', label: 'Financial Strength Score' },
                      { key: 'riskLevel', label: 'Risk Level (Lower Wins)', isRisk: true },
                      { key: 'overallScore', label: 'Overall Vetting Score' },
                      {
                        key: 'confidence',
                        label: 'Calibrated Confidence',
                        isConfidence: true,
                        valA: recordA?.confidence || 75,
                        valB: recordB?.confidence || 75,
                        winner: (recordA?.confidence || 75) > (recordB?.confidence || 75)
                          ? result.companyA.name
                          : (recordB?.confidence || 75) > (recordA?.confidence || 75)
                            ? result.companyB.name
                            : 'TIE'
                      }
                    ].map((item, idx) => {
                      const valA = item.isConfidence ? item.valA : result.comparison.categories[item.key]?.companyA?.value;
                      const valB = item.isConfidence ? item.valB : result.comparison.categories[item.key]?.companyB?.value;
                      const categoryWinner = item.isConfidence ? item.winner : result.comparison.categories[item.key]?.winner;

                      const isWinA = categoryWinner === result.companyA.name;
                      const isWinB = categoryWinner === result.companyB.name;

                      // Difference calculation
                      let diff = 'TIE';
                      if (valA !== null && valB !== null) {
                        const numericDiff = valA - valB;
                        if (item.isRisk) {
                          // Lower risk wins, so if A is 40 and B is 60, A wins by -20
                          diff = numericDiff > 0 ? `+${numericDiff} (${result.companyB.name} Wins)` : `${numericDiff} (${result.companyA.name} Wins)`;
                        } else {
                          diff = numericDiff > 0 ? `+${numericDiff}` : `${numericDiff}`;
                        }
                      }

                      return (
                        <tr key={idx} className="hover:bg-[#1F2937]/35 text-[#9CA3AF] hover:text-white">
                          <td className="py-3 font-bold text-slate-200">{item.label}</td>
                          
                          {/* Company A Cell Highlight */}
                          <td className={`py-3 text-right font-bold border-r border-[#1F2937]/35 ${
                            isWinA 
                              ? 'text-[#10B981] bg-[#10B981]/5 border-l border-[#10B981]/15' 
                              : ''
                          }`}>
                            {valA !== null ? `${valA}${item.isConfidence ? '%' : ''}` : 'N/A'}
                          </td>

                          {/* Company B Cell Highlight */}
                          <td className={`py-3 text-right font-bold ${
                            isWinB 
                              ? 'text-[#3B82F6] bg-[#3B82F6]/5 border-l border-[#3B82F6]/15 border-r border-[#3B82F6]/15' 
                              : ''
                          }`}>
                            {valB !== null ? `${valB}${item.isConfidence ? '%' : ''}` : 'N/A'}
                          </td>

                          {/* Winner Label */}
                          <td className="py-3 text-center">
                            <span className={`px-2 py-0.5 border text-[9px] font-bold uppercase ${
                              categoryWinner === 'TIE' 
                                ? 'text-amber-500 border-amber-900/30 bg-amber-950/20' 
                                : categoryWinner === result.companyA.name
                                  ? 'text-[#10B981] border-[#10B981]/30 bg-[#10B981]/5'
                                  : 'text-[#3B82F6] border-[#3B82F6]/30 bg-[#3B82F6]/5'
                            }`}>
                              {categoryWinner}
                            </span>
                          </td>

                          {/* Diff */}
                          <td className="py-3 text-right font-bold text-white">{diff}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* VISUAL BENCHMARKS SECTION */}
            <div className="grid gap-6 md:grid-cols-2 no-print">
              
              {/* Radar Chart */}
              <div className="bg-[#111827] border border-[#1F2937] p-5 flex flex-col h-[340px]">
                <h3 className="text-xs font-bold text-white tracking-widest border-b border-[#1F2937] pb-3 mb-4">
                  MULTIVARIATE SCORE VECTOR RADAR
                </h3>
                <div className="flex-1 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart 
                      cx="50%" 
                      cy="50%" 
                      outerRadius="75%" 
                      data={[
                        { 
                          subject: 'Business Quality', 
                          [result.companyA.name]: result.comparison.categories.businessQuality?.companyA?.value || 0,
                          [result.companyB.name]: result.comparison.categories.businessQuality?.companyB?.value || 0
                        },
                        { 
                          subject: 'Growth', 
                          [result.companyA.name]: result.comparison.categories.growthPotential?.companyA?.value || 0,
                          [result.companyB.name]: result.comparison.categories.growthPotential?.companyB?.value || 0
                        },
                        { 
                          subject: 'Moat', 
                          [result.companyA.name]: result.comparison.categories.competitiveMoat?.companyA?.value || 0,
                          [result.companyB.name]: result.comparison.categories.competitiveMoat?.companyB?.value || 0
                        },
                        { 
                          subject: 'Financial Strength', 
                          [result.companyA.name]: result.comparison.categories.financialStrength?.companyA?.value || 0,
                          [result.companyB.name]: result.comparison.categories.financialStrength?.companyB?.value || 0
                        },
                        { 
                          subject: 'Risk', 
                          [result.companyA.name]: result.comparison.categories.riskLevel?.companyA?.value || 0,
                          [result.companyB.name]: result.comparison.categories.riskLevel?.companyB?.value || 0
                        }
                      ]}
                    >
                      <PolarGrid stroke="#1F2937" />
                      <PolarAngleAxis 
                        dataKey="subject" 
                        tick={{ fill: '#9CA3AF', fontSize: 10, fontFamily: 'monospace', fontWeight: 'bold' }} 
                      />
                      <PolarRadiusAxis 
                        angle={30} 
                        domain={[0, 100]} 
                        tick={{ fill: '#9CA3AF', fontSize: 8 }}
                      />
                      <Radar 
                        name={result.companyA.name.toUpperCase()} 
                        dataKey={result.companyA.name} 
                        stroke="#10B981" 
                        fill="#10B981" 
                        fillOpacity={0.15} 
                      />
                      <Radar 
                        name={result.companyB.name.toUpperCase()} 
                        dataKey={result.companyB.name} 
                        stroke="#3B82F6" 
                        fill="#3B82F6" 
                        fillOpacity={0.15} 
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: '9px', fontFamily: 'monospace', paddingTop: '10px' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart comparing Overall Scores */}
              <div className="bg-[#111827] border border-[#1F2937] p-5 flex flex-col h-[340px]">
                <h3 className="text-xs font-bold text-white tracking-widest border-b border-[#1F2937] pb-3 mb-4">
                  OVERALL PERFORMANCE BENCHMARK
                </h3>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={getBarChartData()}
                      margin={{ top: 20, right: 10, left: -20, bottom: 5 }}
                    >
                      <XAxis 
                        dataKey="metric" 
                        tick={{ fill: '#9CA3AF', fontSize: 10, fontFamily: 'monospace' }}
                        stroke="#1F2937"
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        tick={{ fill: '#9CA3AF', fontSize: 9 }}
                        stroke="#1F2937"
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#111827', 
                          borderColor: '#1F2937', 
                          color: '#fff', 
                          fontSize: '10px',
                          fontFamily: 'monospace'
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: '9px', fontFamily: 'monospace', paddingTop: '5px' }} />
                      <Bar dataKey={result.companyA.name} fill="#10B981" radius={[2, 2, 0, 0]} />
                      <Bar dataKey={result.companyB.name} fill="#3B82F6" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* STRENGTHS AND WEAKNESSES GRID */}
            <div className="grid gap-6 md:grid-cols-2 print-card">
              
              {/* Strengths Card */}
              <div className="bg-[#111827] border border-[#1F2937] p-5 space-y-4">
                <h3 className="text-xs font-bold text-[#10B981] tracking-widest border-b border-[#1F2937] pb-2 flex items-center gap-1.5 uppercase">
                  🏆 INVESTMENT STRENGTHS
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <span className="text-[9px] text-[#10B981] font-bold uppercase">{result.companyA.name}</span>
                    <ul className="list-disc pl-3 text-[10.5px] text-[#9CA3AF] mt-2 space-y-1 font-sans">
                      {recordA?.research?.growthCatalysts?.slice(0, 3).map((s, i) => <li key={i}>{s}</li>) || (
                        result.comparison.insights?.strengthsA?.map((s, i) => <li key={i}>{s}</li>)
                      )}
                    </ul>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#3B82F6] font-bold uppercase">{result.companyB.name}</span>
                    <ul className="list-disc pl-3 text-[10.5px] text-[#9CA3AF] mt-2 space-y-1 font-sans">
                      {recordB?.research?.growthCatalysts?.slice(0, 3).map((s, i) => <li key={i}>{s}</li>) || (
                        result.comparison.insights?.strengthsB?.map((s, i) => <li key={i}>{s}</li>)
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Weaknesses Card */}
              <div className="bg-[#111827] border border-[#1F2937] p-5 space-y-4">
                <h3 className="text-xs font-bold text-[#EF4444] tracking-widest border-b border-[#1F2937] pb-2 flex items-center gap-1.5 uppercase">
                  ⚠️ SYSTEMIC RISK & WEAKNESSES
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <span className="text-[9px] text-[#10B981] font-bold uppercase">{result.companyA.name}</span>
                    <ul className="list-disc pl-3 text-[10.5px] text-[#9CA3AF] mt-2 space-y-1 font-sans">
                      {recordA?.challenge?.keyConcerns?.slice(0, 3).map((w, i) => <li key={i}>{w}</li>) || (
                        result.comparison.insights?.weaknessesA?.map((w, i) => <li key={i}>{w}</li>)
                      )}
                    </ul>
                  </div>
                  <div>
                    <span className="text-[9px] text-[#3B82F6] font-bold uppercase">{result.companyB.name}</span>
                    <ul className="list-disc pl-3 text-[10.5px] text-[#9CA3AF] mt-2 space-y-1 font-sans">
                      {recordB?.challenge?.keyConcerns?.slice(0, 3).map((w, i) => <li key={i}>{w}</li>) || (
                        result.comparison.insights?.weaknessesB?.map((w, i) => <li key={i}>{w}</li>)
                      )}
                    </ul>
                  </div>
                </div>
              </div>

            </div>

            {/* DECISION RATIONALE memo */}
            <div className="bg-[#111827] border border-[#1F2937] p-5 print-card">
              <h3 className="text-xs font-bold text-white tracking-widest border-b border-[#1F2937] pb-2 mb-3 print-text uppercase">
                COMPARATIVE consensus decision rationale
              </h3>
              <div className="space-y-4">
                <p className="text-xs text-white leading-relaxed print-text">{result.comparison.summary}</p>
                
                <div>
                  <span className="text-[9px] text-[#9CA3AF] font-bold uppercase">DECISION RESOLUTION MEMO</span>
                  <div className="mt-2 space-y-1 text-xs text-white">
                    <div>Final Target Choice: <strong className="text-[#10B981] font-bold font-mono">{result.comparison.recommendation}</strong></div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[8.5px] text-[#9CA3AF] font-bold uppercase">METRIC ADVANTAGES:</span>
                      {result.comparison.rationale.length > 0 ? (
                        result.comparison.rationale.map((r, i) => (
                          <span key={i} className="text-[8.5px] font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/25 px-2 py-0.5">
                            {r}
                          </span>
                        ))
                      ) : (
                        <span className="text-[8.5px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/25 px-2 py-0.5">
                          NO_SIGNIFICANT_MUTUAL_DIFFERENCE
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* COMMITTEE AGENT COMPARISON MINUTEs */}
            <div className="bg-[#111827] border border-[#1F2937] p-5 print-card">
              <h3 className="text-xs font-bold text-white tracking-widest border-b border-[#1F2937] pb-3 mb-4 print-text uppercase">
                COMMITTEE AGENTS COMPARATIVE MEMOS
              </h3>

              <div className="grid gap-6 md:grid-cols-2 font-mono text-xs">
                
                {/* Company A memos */}
                <div className="space-y-4 border-r border-[#1F2937]/50 pr-4">
                  <span className="text-xs font-bold text-[#10B981] border-b border-[#10B981]/30 pb-1 uppercase block">
                    {result.companyA.name} COMMITTEE ARCHIVE
                  </span>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-[8.5px] text-[#9CA3AF] uppercase block">Research Agent Memo</span>
                      <p className="text-[10.5px] text-slate-300 mt-1 leading-relaxed line-clamp-4">
                        {recordA?.research?.businessOverview || 'No research memo saved.'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[8.5px] text-[#9CA3AF] uppercase block">Scoring Thesis Memo</span>
                      <p className="text-[10.5px] text-slate-300 mt-1 leading-relaxed">
                        Security initially grade-scored as <strong className="text-white">{recordA?.overallScore || 'N/A'}/100 overall conviction</strong> with recommended vote: <strong className="text-white">{result.companyA.recommendation}</strong>.
                      </p>
                    </div>

                    <div>
                      <span className="text-[8.5px] text-[#9CA3AF] uppercase block">Devil's Advocate Challenge</span>
                      <p className="text-[10.5px] text-slate-300 mt-1 leading-relaxed line-clamp-3 text-[#EF4444]">
                        {recordA?.challenge?.bearCase || 'No challenge report saved.'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[8.5px] text-[#9CA3AF] uppercase block">Final Committee Verdict</span>
                      <p className="text-[10.5px] text-slate-300 mt-1 leading-relaxed line-clamp-3">
                        {recordA?.finalDecision?.reasoning || 'No verdict explanation logged.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Company B memos */}
                <div className="space-y-4">
                  <span className="text-xs font-bold text-[#3B82F6] border-b border-[#3B82F6]/30 pb-1 uppercase block">
                    {result.companyB.name} COMMITTEE ARCHIVE
                  </span>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-[8.5px] text-[#9CA3AF] uppercase block">Research Agent Memo</span>
                      <p className="text-[10.5px] text-slate-300 mt-1 leading-relaxed line-clamp-4">
                        {recordB?.research?.businessOverview || 'No research memo saved.'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[8.5px] text-[#9CA3AF] uppercase block">Scoring Thesis Memo</span>
                      <p className="text-[10.5px] text-slate-300 mt-1 leading-relaxed">
                        Security initially grade-scored as <strong className="text-white">{recordB?.overallScore || 'N/A'}/100 overall conviction</strong> with recommended vote: <strong className="text-white">{result.companyB.recommendation}</strong>.
                      </p>
                    </div>

                    <div>
                      <span className="text-[8.5px] text-[#9CA3AF] uppercase block">Devil's Advocate Challenge</span>
                      <p className="text-[10.5px] text-slate-300 mt-1 leading-relaxed line-clamp-3 text-[#EF4444]">
                        {recordB?.challenge?.bearCase || 'No challenge report saved.'}
                      </p>
                    </div>

                    <div>
                      <span className="text-[8.5px] text-[#9CA3AF] uppercase block">Final Committee Verdict</span>
                      <p className="text-[10.5px] text-slate-300 mt-1 leading-relaxed line-clamp-3">
                        {recordB?.finalDecision?.reasoning || 'No verdict explanation logged.'}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* DATA QUALITY PANEL */}
            <div className="bg-[#111827] border border-[#1F2937] p-5 print-card">
              <h3 className="text-xs font-bold text-white tracking-widest border-b border-[#1F2937] pb-3 mb-4 print-text uppercase">
                COMPARATIVE DATA QUALITY INDEX
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <span className="text-[9px] text-[#10B981] font-bold uppercase">{result.companyA.name} TELEMETRY</span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between border-b border-[#1F2937]/50 pb-0.5">
                      <span>Data Completeness Score:</span>
                      <span className="text-white font-bold">{result.dataQuality.companyA}%</span>
                    </div>
                    <div className="flex justify-between border-b border-[#1F2937]/50 pb-0.5">
                      <span>Evidence Quality:</span>
                      <span className="text-white font-bold">{recordA?.evidenceQualityScore || 0}%</span>
                    </div>
                    <div className="flex justify-between border-b border-[#1F2937]/50 pb-0.5">
                      <span>Decay Freshness Score:</span>
                      <span className="text-white font-bold">{recordA?.freshnessScore || 100}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Material Event Count:</span>
                      <span className="text-white font-bold">{recordA?.materialEventCount || 0} events</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 border-t sm:border-t-0 sm:border-l border-[#1F2937]/50 sm:pl-4">
                  <span className="text-[9px] text-[#3B82F6] font-bold uppercase">{result.companyB.name} TELEMETRY</span>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between border-b border-[#1F2937]/50 pb-0.5">
                      <span>Data Completeness Score:</span>
                      <span className="text-white font-bold">{result.dataQuality.companyB}%</span>
                    </div>
                    <div className="flex justify-between border-b border-[#1F2937]/50 pb-0.5">
                      <span>Evidence Quality:</span>
                      <span className="text-white font-bold">{recordB?.evidenceQualityScore || 0}%</span>
                    </div>
                    <div className="flex justify-between border-b border-[#1F2937]/50 pb-0.5">
                      <span>Decay Freshness Score:</span>
                      <span className="text-white font-bold">{recordB?.freshnessScore || 100}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Material Event Count:</span>
                      <span className="text-white font-bold">{recordB?.materialEventCount || 0} events</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default Compare;
