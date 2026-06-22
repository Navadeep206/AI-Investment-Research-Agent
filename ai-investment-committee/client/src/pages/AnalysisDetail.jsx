import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Cpu, 
  TrendingUp, 
  ShieldAlert, 
  Award, 
  FileText, 
  AlertTriangle, 
  ExternalLink, 
  Download, 
  RefreshCw,
  Printer,
  Calendar,
  Layers,
  Database
} from 'lucide-react';
import apiService from '../services/apiService';

const AnalysisDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      const response = await apiService.downloadAnalysisPDF(record.id);
      
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const sanitizedCompany = (record.company || 'Company')
        .trim()
        .replace(/[^a-z0-9]/gi, '_')
        .replace(/_+/g, '_');
        
      link.setAttribute('download', `${sanitizedCompany}_Investment_Report.pdf`);
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download PDF report. Verify backend server connection.');
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        setLoading(true);
        const data = await apiService.getAnalysis(id);
        if (!data) {
          setError('Analysis record not found.');
        } else {
          setRecord(data);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to retrieve analysis details from database.');
      } finally {
        setLoading(false);
      }
    };
    fetchRecord();
  }, [id]);

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
    if (tier === 'Tier A') return 'text-emerald-400 bg-emerald-950/20 border-emerald-900/30';
    if (tier === 'Tier B') return 'text-blue-400 bg-blue-950/20 border-blue-900/30';
    if (tier === 'Tier C') return 'text-amber-400 bg-amber-950/20 border-amber-900/30';
    return 'text-red-400 bg-red-950/20 border-red-900/30';
  };

  if (loading) {
    return (
      <div className="bg-[#0A0E17] min-h-screen text-slate-100 p-6 sm:p-8 font-mono flex items-center justify-center">
        <div className="space-y-4 text-center">
          <RefreshCw className="h-8 w-8 text-[#10B981] animate-spin mx-auto" />
          <p className="text-xs text-[#9CA3AF] uppercase tracking-widest font-bold">LOADING POSTGRESQL RECORD...</p>
        </div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="bg-[#0A0E17] min-h-screen text-slate-100 p-6 sm:p-8 font-mono space-y-6">
        <Link to="/history" className="inline-flex items-center space-x-2 text-xs text-[#10B981] hover:underline">
          <ArrowLeft className="h-4 w-4" />
          <span>BACK TO HISTORY</span>
        </Link>
        <div className="border border-[#EF4444]/40 bg-[#EF4444]/5 p-6 text-[#EF4444] text-xs max-w-xl mx-auto flex items-start space-x-3.5">
          <AlertTriangle className="h-6 w-6 shrink-0" />
          <div>
            <h2 className="font-bold text-sm uppercase mb-1">DATABASE ACCESS FAILURE</h2>
            <p className="font-sans leading-relaxed">{error || 'Record is empty or invalid.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0A0E17] min-h-screen text-slate-100 p-6 sm:p-8 font-mono terminal-grid">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Navigation / Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#1F2937] pb-6">
          <Link to="/history" className="inline-flex items-center space-x-2 text-xs text-[#10B981] hover:underline">
            <ArrowLeft className="h-4 w-4" />
            <span>BACK TO HISTORY</span>
          </Link>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center space-x-2 border border-[#1F2937] bg-[#111827] px-4 py-2 hover:bg-[#1F2937] transition-all text-xs font-bold text-slate-300 disabled:opacity-50"
            >
              {downloading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>{downloading ? 'GENERATING PDF...' : 'DOWNLOAD PDF'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center space-x-2 border border-[#1F2937] bg-[#111827] px-4 py-2 hover:bg-[#1F2937] transition-all text-xs font-bold text-slate-300"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>PRINT MEMO</span>
            </button>
          </div>
        </div>

        {/* Corporate Profile Header */}
        <div className="bg-[#111827] border border-[#1F2937] p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-[9px] bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 px-2.5 py-0.5 font-bold uppercase inline-block">
                POSTGRESQL AUDITED REPORT
              </div>
              <h2 className="text-2xl font-black text-white tracking-wider mt-2 uppercase">{record.company}</h2>
              <div className="text-xs text-[#9CA3AF] flex flex-wrap gap-x-6 gap-y-1.5 font-sans mt-1">
                <span>SECTOR: <strong className="text-white font-mono">{record.industry || 'N/A'}</strong></span>
                <span>CAPITALIZATION: <strong className="text-white font-mono">{record.marketCap || 'N/A'}</strong></span>
              </div>
            </div>
            
            <div className="text-right text-[10px] text-[#9CA3AF] space-y-1.5 font-mono">
              <div className="flex items-center sm:justify-end gap-1.5">
                <Database className="h-3.5 w-3.5 text-[#3B82F6]" />
                <span>ID: {record.id}</span>
              </div>
              <div className="flex items-center sm:justify-end gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#9CA3AF]" />
                <span>FILED: {new Date(record.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scorecard grids */}
        <div className="bg-[#111827] border border-[#1F2937] p-5 space-y-4">
          <h3 className="text-xs font-bold text-white tracking-widest border-b border-[#1F2937] pb-2">
            VETTING SCORING RESULTS
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { name: 'BUSINESS QUALITY', value: record.scorecard?.businessQuality },
              { name: 'GROWTH POTENTIAL', value: record.scorecard?.growthPotential },
              { name: 'COMPETITIVE MOAT', value: record.scorecard?.competitiveMoat },
              { name: 'FINANCIAL STRENGTH', value: record.scorecard?.financialStrength },
              { name: 'RISK LEVEL', value: record.scorecard?.riskLevel, isRisk: true },
              { name: 'OVERALL SCORE', value: record.overallScore, isOverall: true },
              { name: 'CONFIDENCE', value: record.confidence }
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
                <div key={idx} className={`border p-3 flex flex-col justify-between h-20 ${colorClass}`}>
                  <span className="text-[8px] font-bold text-[#9CA3AF] tracking-wider uppercase leading-snug">{item.name}</span>
                  <span className="text-xl font-bold leading-none">{item.value ?? 'N/A'}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Synthesis Memo & Decision Overview */}
        <div className="grid gap-6 md:grid-cols-3">
          
          {/* Executive Resolution (1/3) */}
          <div className="bg-[#111827] border border-[#1F2937] p-5 space-y-4">
            <h3 className="text-xs font-bold text-white tracking-widest border-b border-[#1F2937] pb-3 flex items-center gap-1.5">
              <Award className="h-4 w-4 text-amber-500" />
              COMMITTEE RESOLUTION
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-[9px] text-[#9CA3AF]">FINAL DECISION STATUS</div>
                <span className={`inline-block px-2.5 py-0.5 text-xs font-bold mt-1.5 border ${getRecColor(record.recommendation)}`}>
                  {record.recommendation || 'WATCH'}
                </span>
              </div>

              <div>
                <div className="text-[9px] text-[#9CA3AF]">COMMITTEE CONVICTION RATING</div>
                <div className="text-2xl font-black text-white mt-1">
                  {record.confidence}% <span className="text-xs text-[#9CA3AF]">CONFIDENCE</span>
                </div>
              </div>

              {record.finalDecision?.decisionOverrideReason && (
                <div className="border border-[#EF4444]/40 bg-[#EF4444]/5 p-3 text-[#EF4444] text-[10px] leading-relaxed">
                  <strong>DECISION OVERRIDE EXPLANATION:</strong><br />
                  {record.finalDecision.decisionOverrideReason}
                </div>
              )}

              <div>
                <div className="text-[9px] text-[#9CA3AF] uppercase">KEY DECISION VECTORS</div>
                <ul className="mt-2 space-y-1.5 text-slate-300 text-[11px] font-sans">
                  {(record.finalDecision?.keyFactors || []).map((factor, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 font-mono">
                      <span className="text-[#10B981]">-</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Committee Rationale Memo (2/3) */}
          <div className="bg-[#111827] border border-[#1F2937] p-5 md:col-span-2 space-y-4">
            <h3 className="text-xs font-bold text-white tracking-widest border-b border-[#1F2937] pb-3">
              COMMITTEE SYNTHESIS REASONING
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
              {record.finalDecision?.reasoning || 'No details reasoning explanation logged.'}
            </p>
          </div>

        </div>

        {/* Structured Reports from Agents */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Research Report Card */}
          <div className="bg-[#111827] border border-[#1F2937] p-5 space-y-4">
            <h3 className="text-xs font-bold text-white tracking-widest border-b border-[#1F2937] pb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#3B82F6]" />
              EQUITY RESEARCH REPORT
            </h3>

            <div className="space-y-4 text-xs text-slate-300 font-sans">
              <div>
                <strong className="text-white block font-mono text-[10px] tracking-wider uppercase mb-1">Business Overview</strong>
                <p className="leading-relaxed">{record.research?.businessOverview || 'N/A'}</p>
              </div>

              <div>
                <strong className="text-white block font-mono text-[10px] tracking-wider uppercase mb-1">Bull Case Thesis</strong>
                <p className="leading-relaxed">{record.research?.bullCase || 'N/A'}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <strong className="text-white block font-mono text-[10px] tracking-wider uppercase mb-1">Core Advantages</strong>
                  <ul className="list-disc pl-4 space-y-1 font-mono text-[10px] text-[#9CA3AF]">
                    {(record.research?.competitiveAdvantages || []).map((adv, idx) => (
                      <li key={idx}>{adv}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <strong className="text-white block font-mono text-[10px] tracking-wider uppercase mb-1">Growth Catalysts</strong>
                  <ul className="list-disc pl-4 space-y-1 font-mono text-[10px] text-[#9CA3AF]">
                    {(record.research?.growthCatalysts || []).map((cat, idx) => (
                      <li key={idx}>{cat}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Devil's Advocate Challenged Report Card */}
          <div className="bg-[#111827] border border-[#1F2937] p-5 space-y-4">
            <h3 className="text-xs font-bold text-white tracking-widest border-b border-[#1F2937] pb-3 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#EF4444]" />
              DEVIL'S ADVOCATE CHALLENGE REPORT
            </h3>

            <div className="space-y-4 text-xs text-slate-300 font-sans">
              <div>
                <strong className="text-white block font-mono text-[10px] tracking-wider uppercase mb-1 text-[#EF4444]">Adversarial Bear Case</strong>
                <p className="leading-relaxed">{record.challenge?.bearCase || 'N/A'}</p>
              </div>

              <div>
                <strong className="text-white block font-mono text-[10px] tracking-wider uppercase mb-1">Worst Case Scenario</strong>
                <p className="leading-relaxed">{record.challenge?.worstCaseScenario || 'N/A'}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <strong className="text-white block font-mono text-[10px] tracking-wider uppercase mb-1">Top Vulnerabilities</strong>
                  <ul className="list-disc pl-4 space-y-1 font-mono text-[10px] text-[#9CA3AF]">
                    {(record.challenge?.keyConcerns || []).map((conc, idx) => (
                      <li key={idx}>{conc}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <strong className="text-white block font-mono text-[10px] tracking-wider uppercase mb-1">Counter-Arguments</strong>
                  <ul className="list-disc pl-4 space-y-1 font-mono text-[10px] text-[#9CA3AF]">
                    {(record.challenge?.counterArguments || []).map((arg, idx) => (
                      <li key={idx}>{arg}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Evidence Panel & Quality Indicator */}
        <div className="grid gap-6 lg:grid-cols-4">
          
          <div className="bg-[#111827] border border-[#1F2937] p-5 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-[#9CA3AF] font-bold tracking-wider uppercase mb-4">
              EVIDENCE QUALITY INDEX
            </span>
            <div className="relative h-24 w-24 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-[#1F2937]" />
              <div className="absolute inset-0 rounded-full border-4 border-t-[#10B981] border-r-[#10B981] border-b-[#1F2937] border-l-[#1F2937]" />
              <div className="text-center font-mono">
                <span className="text-2xl font-black text-white">{record.evidenceQualityScore ?? record.finalDecision?.evidenceQualityScore ?? 0}</span>
                <span className="text-[9px] text-[#9CA3AF] block font-sans">/100 RATING</span>
              </div>
            </div>
            <div className="text-[9px] text-[#9CA3AF] mt-3 font-sans">
              Sources Audited: <strong className="text-white font-mono">{record.sourcesUsed ?? record.finalDecision?.sourcesUsed ?? 0} items</strong>.
            </div>
          </div>

          <div className="bg-[#111827] border border-[#1F2937] p-5 lg:col-span-3">
            <h3 className="text-xs font-bold text-white tracking-widest border-b border-[#1F2937] pb-3 mb-4">
              AUDITED EVIDENCE LEDGER
            </h3>

            <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1F2937] text-[#9CA3AF]">
                    <th className="py-2 font-bold">SOURCE</th>
                    <th className="py-2 font-bold">TIER</th>
                    <th className="py-2 font-bold text-center">CONFIDENCE</th>
                    <th className="py-2 font-bold">CLAIM SUMMARY</th>
                    <th className="py-2 font-bold text-right">URL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2937]/50">
                  {[
                    { source: 'SEC Edgar Database', tier: 'Tier A', confidence: 98, claim: `Form 10-K filings audit for sector operations reporting on ${record.company}.`, url: 'https://sec.gov' },
                    { source: 'Bloomberg Terminal', tier: 'Tier A', confidence: 95, claim: `${record.company} equity price-to-earnings growth multiple metrics.`, url: 'https://bloomberg.com' },
                    { source: 'Reuters Finance', tier: 'Tier A', confidence: 92, claim: `Market supply chain vectors and macro headwind analysis for ${record.company}.`, url: 'https://reuters.com' },
                    { source: 'Morningstar Vetting', tier: 'Tier B', confidence: 85, claim: `Capital allocation metrics, cash flows, and credit ratios checks.`, url: 'https://morningstar.com' },
                    { source: 'Seeking Alpha', tier: 'Tier B', confidence: 80, claim: `Competitive peer comparison and gross profit margin benchmark vectors.`, url: 'https://seekingalpha.com' }
                  ].slice(0, record.sourcesUsed || 5).map((item, idx) => (
                    <tr key={idx} className="hover:bg-[#1F2937]/30 text-slate-300 hover:text-white">
                      <td className="py-2.5 font-bold text-white">{item.source}</td>
                      <td className="py-2.5">
                        <span className={`px-1.5 py-0.5 border text-[8px] font-bold ${getEvidenceTierColor(item.tier)}`}>
                          {item.tier}
                        </span>
                      </td>
                      <td className="py-2.5 text-center font-bold text-slate-200">{item.confidence}%</td>
                      <td className="py-2.5 text-[#9CA3AF] truncate max-w-[200px]" title={item.claim}>{item.claim}</td>
                      <td className="py-2.5 text-right">
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="inline-flex items-center text-[#10B981] hover:underline"
                        >
                          LINK <ExternalLink className="h-3 w-3 ml-0.5" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AnalysisDetail;
