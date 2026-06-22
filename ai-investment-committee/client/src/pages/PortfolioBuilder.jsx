import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Briefcase, 
  TrendingUp, 
  ShieldAlert, 
  Activity,
  Award,
  RefreshCw,
  Info,
  Download,
  Calendar,
  Layers,
  FileText
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend 
} from 'recharts';
import apiService from '../services/apiService';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
const SECTOR_COLORS = ['#06B6D4', '#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

const PortfolioBuilder = () => {
  // Start with default holdings matching user specification
  const [holdings, setHoldings] = useState([
    { company: 'NVIDIA', weight: 40 },
    { company: 'Microsoft', weight: 30 },
    { company: 'Google', weight: 20 },
    { company: 'AMD', weight: 10 }
  ]);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Calculate sum of weights in real time
  const totalWeight = holdings.reduce((sum, h) => sum + (Number(h.weight) || 0), 0);
  const isValidWeight = Math.abs(totalWeight - 100) < 0.001;

  const handleAddHolding = () => {
    setHoldings([...holdings, { company: '', weight: 0 }]);
  };

  const handleRemoveHolding = (index) => {
    const updated = holdings.filter((_, idx) => idx !== index);
    setHoldings(updated);
  };

  const handleUpdateHolding = (index, field, value) => {
    const updated = [...holdings];
    if (field === 'weight') {
      const val = Number(value);
      updated[index][field] = isNaN(val) ? 0 : val;
    } else {
      updated[index][field] = value;
    }
    setHoldings(updated);
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!isValidWeight) return;

    setLoading(true);
    setLoadingStep(1);
    setError(null);
    setResults(null);

    // Filter out empty holdings
    const activeHoldings = holdings.filter(h => h.company.trim() !== '');

    try {
      // Step 1: Portfolio Construction
      setLoadingStep(1);
      await sleep(800);

      // Step 2: Portfolio Research
      setLoadingStep(2);
      await sleep(800);

      // Step 3: Portfolio Risk Analysis
      setLoadingStep(3);
      await sleep(800);

      // Step 4: Portfolio Committee Decision
      setLoadingStep(4);
      const response = await apiService.analyzePortfolio(activeHoldings);
      setResults(response);
      await sleep(600);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Error occurred during portfolio analysis. Verify that all holdings are valid company tickers/names and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!results) return;
    try {
      setExporting(true);
      setError(null);
      const activeHoldings = holdings.filter(h => h.company.trim() !== '');
      const blob = await apiService.downloadPortfolioPDF(activeHoldings);
      
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Portfolio_Intelligence_Advisory_Report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      console.error("PDF download failed:", err);
      setError("Failed to export institutional portfolio PDF report. Please verify connection and try again.");
    } finally {
      setExporting(false);
    }
  };

  // Convert chart inputs
  const getPieChartData = () => {
    if (!results) {
      return holdings
        .filter(h => h.company.trim() !== '')
        .map(h => ({ name: h.company.toUpperCase(), value: h.weight }));
    }
    return results.holdingsDetail.map(hd => ({
      name: hd.company.toUpperCase(),
      value: hd.weight
    }));
  };

  const getSectorChartData = () => {
    if (!results || !results.research || !results.research.sectorExposure) return [];
    return results.research.sectorExposure.map(se => ({
      name: se.sector.toUpperCase(),
      value: se.weight
    }));
  };

  const getBarChartData = () => {
    if (!results || !results.weightedMetrics) return [];
    const metrics = results.weightedMetrics;
    return [
      { name: 'Weighted Business Quality', score: metrics.businessQuality },
      { name: 'Weighted Growth Potential', score: metrics.growthPotential },
      { name: 'Weighted Competitive Moat', score: metrics.competitiveMoat },
      { name: 'Weighted Financial Strength', score: metrics.financialStrength },
      { name: 'Weighted Risk', score: metrics.riskLevel }
    ];
  };

  const getRecommendationStyle = (rec) => {
    const r = (rec || '').toUpperCase();
    if (r === 'APPROVE' || r === 'APPROVED') return 'text-[#10B981] border-[#10B981]/40 bg-[#10B981]/10';
    if (r === 'WATCH') return 'text-[#F59E0B] border-[#F59E0B]/40 bg-[#F59E0B]/10';
    return 'text-[#EF4444] border-[#EF4444]/40 bg-[#EF4444]/10';
  };

  const getScoreColor = (score, isRisk = false) => {
    if (isRisk) {
      if (score <= 35) return 'text-[#10B981] border-[#10B981]/20 bg-[#10B981]/5';
      if (score <= 65) return 'text-[#F59E0B] border-[#F59E0B]/20 bg-[#F59E0B]/5';
      return 'text-[#EF4444] border-[#EF4444]/20 bg-[#EF4444]/5';
    }
    if (score >= 80) return 'text-[#10B981] border-[#10B981]/20 bg-[#10B981]/5';
    if (score >= 60) return 'text-[#F59E0B] border-[#F59E0B]/20 bg-[#F59E0B]/5';
    return 'text-[#EF4444] border-[#EF4444]/20 bg-[#EF4444]/5';
  };

  const getRiskLabel = (score) => {
    if (score <= 35) return 'LOW';
    if (score <= 65) return 'MODERATE';
    return 'HIGH';
  };

  const getDivLabel = (score) => {
    if (score < 40) return 'WEAK';
    if (score < 70) return 'MODERATE';
    return 'STRONG';
  };

  // Find holding with highest confidence score
  const getHighestConfidenceHolding = () => {
    if (!results || !results.holdingsDetail || results.holdingsDetail.length === 0) return null;
    let highest = results.holdingsDetail[0];
    results.holdingsDetail.forEach(hd => {
      if (hd.confidence > highest.confidence) highest = hd;
    });
    return highest;
  };

  const highestConf = getHighestConfidenceHolding();

  return (
    <div className="bg-[#0A0E17] min-h-screen text-slate-100 p-6 sm:p-8 font-mono">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Title */}
        <div className="border-b border-[#1F2937] pb-6 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-widest text-white uppercase">Portfolio Intelligence Terminal</h1>
            <p className="text-xs text-[#9CA3AF] mt-1 font-sans">
              Perform institutional-grade weighted portfolio construction, sector analysis, and committee vetting checks.
            </p>
          </div>
          {results && (
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
              <span>{exporting ? 'GENERATING REPORT...' : 'EXPORT PORTFOLIO PDF'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Input Builder */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Portfolio Holdings Editor Card */}
            <div className="bg-[#111827] border border-[#1F2937] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
                <h2 className="text-xs font-bold text-white tracking-widest">PORTFOLIO BUILDER</h2>
                <span className="text-[10px] text-[#9CA3AF]">Holdings: {holdings.length}</span>
              </div>

              <form onSubmit={handleAnalyze} className="space-y-4">
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {holdings.map((holding, idx) => (
                    <div key={idx} className="flex gap-2.5 items-center">
                      <input
                        type="text"
                        required
                        placeholder="COMPANY TICKER (e.g. AAPL)"
                        value={holding.company}
                        onChange={(e) => handleUpdateHolding(idx, 'company', e.target.value)}
                        disabled={loading}
                        className="flex-1 min-w-0 bg-[#0A0E17] border border-[#1F2937] px-3 py-2 text-xs text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#10B981] font-bold"
                      />
                      <div className="relative w-24">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          required
                          placeholder="WEIGHT"
                          value={holding.weight || ''}
                          onChange={(e) => handleUpdateHolding(idx, 'weight', e.target.value)}
                          disabled={loading}
                          className="w-full bg-[#0A0E17] border border-[#1F2937] px-3 py-2 pr-6 text-xs text-white focus:outline-none focus:border-[#10B981] font-bold text-right"
                        />
                        <span className="absolute right-2 top-2 text-[10px] text-[#9CA3AF]">%</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveHolding(idx)}
                        disabled={loading || holdings.length <= 1}
                        className="p-2 border border-[#1F2937] text-[#EF4444] hover:bg-[#EF4444]/10 disabled:opacity-40 transition-colors shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={handleAddHolding}
                    disabled={loading}
                    className="border border-[#1F2937] hover:border-slate-500 hover:text-white px-3 py-2 text-[10px] font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    ADD POSITION
                  </button>

                  <div className="text-right text-[10px] space-y-1">
                    <div className="text-[#9CA3AF]">
                      TOTAL WEIGHT: <span className={`font-bold ${isValidWeight ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{totalWeight}%</span>
                    </div>
                  </div>
                </div>

                {/* Weight warning alerts */}
                {!isValidWeight && (
                  <div className="border border-[#EF4444]/30 bg-[#EF4444]/5 p-3 text-[10px] text-[#EF4444] leading-relaxed flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <strong>VALIDATION ERROR:</strong> Total holding weight sums to {totalWeight}%. It must equal exactly 100% to run committee metrics.
                    </div>
                  </div>
                )}

                {isValidWeight && (
                  <div className="border border-[#10B981]/30 bg-[#10B981]/5 p-3 text-[10px] text-[#10B981] leading-relaxed flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <strong>SYSTEM READY:</strong> Weights sum balances perfectly. Ready to invoke portfolio risk audit analysis.
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !isValidWeight}
                  className="w-full bg-[#10B981] text-[#0A0E17] font-bold text-xs py-2.5 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                >
                  {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                  <span>{loading ? 'RUNNING METRICS...' : 'ANALYZE PORTFOLIO'}</span>
                </button>
              </form>
            </div>

            {/* Portfolio Holdings Table */}
            {results && !loading && (
              <div className="bg-[#111827] border border-[#1F2937] p-5 space-y-3">
                <span className="text-[10px] font-bold text-white tracking-widest uppercase block border-b border-[#1F2937] pb-2">
                  Portfolio Holdings Vetting Table
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#1F2937] text-[#9CA3AF] text-[10px]">
                        <th className="py-2 font-bold">COMPANY</th>
                        <th className="py-2 font-bold text-right">WEIGHT</th>
                        <th className="py-2 font-bold text-center">REC</th>
                        <th className="py-2 font-bold text-right">SCORE</th>
                        <th className="py-2 font-bold text-right">CONF.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F2937]/50 font-mono text-slate-300">
                      {results.holdingsDetail.map((hd, index) => (
                        <tr key={index} className="hover:bg-[#1F2937]/40">
                          <td className="py-2 font-bold text-white uppercase">{hd.company}</td>
                          <td className="py-2 text-right">{hd.weight}%</td>
                          <td className="py-2 text-center">
                            <span className={`px-1.5 py-0.25 text-[9px] border font-bold rounded-sm ${getRecommendationStyle(hd.recommendation)}`}>
                              {hd.recommendation}
                            </span>
                          </td>
                          <td className="py-2 text-right font-bold text-slate-100">{hd.overallScore}</td>
                          <td className="py-2 text-right">{hd.confidence}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Visualization & Outputs */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Error Message */}
            {error && (
              <div className="border border-[#EF4444]/40 bg-[#EF4444]/5 p-4 text-[#EF4444] text-xs flex items-start space-x-2.5">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <div className="font-sans leading-relaxed">
                  <strong className="font-mono block text-xs uppercase mb-1">Analysis Refused</strong>
                  {error}
                </div>
              </div>
            )}

            {/* If no analysis run yet, display allocation preview pie chart */}
            {!results && !loading && (
              <div className="bg-[#111827] border border-[#1F2937] p-6 flex flex-col items-center justify-center text-center h-[380px]">
                <Info className="h-8 w-8 text-[#9CA3AF] mb-3 animate-pulse" />
                <h3 className="text-xs font-bold text-white tracking-widest uppercase mb-1">Preview Allocation</h3>
                <p className="text-[11px] text-[#9CA3AF] max-w-sm mb-4 leading-relaxed font-sans">
                  Construct your equity weight allocation rules. Verify sum bounds to execute final review.
                </p>
                <div className="w-full h-48 max-w-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getPieChartData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {getPieChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} border="none" />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', fontFamily: 'monospace', fontSize: '10px' }}
                        itemStyle={{ color: '#fff' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Loading Experience: Multi-Step Progress Tracker */}
            {loading && (
              <div className="bg-[#111827] border border-[#1F2937] p-8 flex flex-col justify-center h-[380px] space-y-6">
                <h3 className="text-xs font-bold text-white tracking-widest flex items-center gap-2 border-b border-[#1F2937] pb-3 select-none">
                  <RefreshCw className="h-4 w-4 text-[#10B981] animate-spin" />
                  PORTFOLIO INTELLIGENCE ENGINE VETTING
                </h3>
                <div className="space-y-4">
                  {[
                    { step: 1, label: 'Portfolio Construction (Holdings and weights verification)...' },
                    { step: 2, label: 'Portfolio Research (Collecting strengths and structural traits)...' },
                    { step: 3, label: 'Portfolio Risk Analysis (Diversification HHI and exposures)...' },
                    { step: 4, label: 'Portfolio Committee Decision (Chairman consensus vote synthesis)...' }
                  ].map((item, idx) => {
                    const isDone = loadingStep > item.step;
                    const isActive = loadingStep === item.step;
                    return (
                      <div key={idx} className={`flex items-center space-x-3 text-xs ${
                        isDone ? 'text-[#10B981]' : isActive ? 'text-white font-bold' : 'text-[#9CA3AF]'
                      }`}>
                        {isDone ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-[#10B981] shrink-0" />
                        ) : isActive ? (
                          <RefreshCw className="h-4.5 w-4.5 animate-spin text-[#10B981] shrink-0" />
                        ) : (
                          <div className="h-4.5 w-4.5 rounded-full border border-[#1F2937] shrink-0" />
                        )}
                        <span>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Results Output Layout */}
            {results && !loading && (
              <div className="space-y-6">
                
                {/* Section 2: Portfolio Overview KPI Cards */}
                <div className="bg-[#111827] border border-[#1F2937] p-5 space-y-4">
                  <h3 className="text-xs font-bold text-white tracking-widest border-b border-[#1F2937] pb-2">
                    PORTFOLIO OVERVIEW
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { name: 'PORTFOLIO SCORE', value: results.portfolioScore, suffix: '/100' },
                      { name: 'PORTFOLIO RISK', value: getRiskLabel(results.riskScore), isRisk: true, details: `Score: ${results.riskScore}` },
                      { name: 'DIVERSIFICATION', value: getDivLabel(results.diversificationScore), isDiv: true, details: `Score: ${results.diversificationScore}` },
                      { name: 'CONFIDENCE', value: `${results.confidence}%`, details: 'Committee Confidence' },
                    ].map((item, idx) => (
                      <div key={idx} className="border border-[#1F2937] bg-[#0A0E17]/40 p-3 flex flex-col justify-between h-20">
                        <span className="text-[7.5px] font-bold text-[#9CA3AF] tracking-wider uppercase leading-snug">{item.name}</span>
                        <div>
                          <span className="text-lg font-bold text-white leading-none">{item.value}{item.suffix || ''}</span>
                          {item.details && <span className="text-[8px] text-[#9CA3AF] block mt-0.5 font-sans">{item.details}</span>}
                        </div>
                      </div>
                    ))}
                    {/* Recommendation Card */}
                    <div className={`border p-3 flex flex-col justify-between h-20 ${getRecommendationStyle(results.recommendation)}`}>
                      <span className="text-[7.5px] font-bold tracking-wider uppercase leading-snug">RECOMMENDATION</span>
                      <span className="text-lg font-black leading-none">{results.recommendation}</span>
                    </div>
                  </div>
                </div>

                {/* Section 3 & 5: Pie Charts (Allocation & Sector Exposure) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Allocation Pie Chart */}
                  <div className="bg-[#111827] border border-[#1F2937] p-4 flex flex-col h-72">
                    <span className="text-[9px] font-bold text-white tracking-widest border-b border-[#1F2937] pb-2 mb-2 block uppercase">
                      PORTFOLIO ALLOCATION
                    </span>
                    <div className="flex-1 h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getPieChartData()}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {getPieChartData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', fontFamily: 'monospace', fontSize: '10px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Sector Allocation Pie Chart */}
                  <div className="bg-[#111827] border border-[#1F2937] p-4 flex flex-col h-72">
                    <span className="text-[9px] font-bold text-white tracking-widest border-b border-[#1F2937] pb-2 mb-2 block uppercase">
                      SECTOR EXPOSURE ALLOCATION
                    </span>
                    <div className="flex-1 h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getSectorChartData()}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {getSectorChartData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={SECTOR_COLORS[index % SECTOR_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', fontFamily: 'monospace', fontSize: '10px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Section 4: Metrics Bar Chart */}
                <div className="bg-[#111827] border border-[#1F2937] p-5 flex flex-col h-72">
                  <span className="text-[9px] font-bold text-white tracking-widest border-b border-[#1F2937] pb-2 mb-2 block uppercase">
                    PORTFOLIO METRICS DECOMPOSITION
                  </span>
                  <div className="flex-1 h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getBarChartData()} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                        <XAxis dataKey="name" stroke="#9CA3AF" fontSize={8.5} tickLine={false} />
                        <YAxis stroke="#9CA3AF" fontSize={9} domain={[0, 100]} tickCount={6} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#111827', border: '1px solid #1F2937', fontFamily: 'monospace', fontSize: '10px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="score" fill="#3B82F6">
                          {getBarChartData().map((entry, index) => {
                            let color = '#3B82F6';
                            if (entry.name.includes('Quality')) color = '#10B981';
                            if (entry.name.includes('Risk')) color = '#EF4444';
                            return <Cell key={`cell-${index}`} fill={color} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Section 6: Committee Room Widgets */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-white tracking-widest border-b border-[#1F2937] pb-2">
                    PORTFOLIO COMMITTEE ROOM
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Widget A: Portfolio Research Agent */}
                    <div className="bg-[#111827] border border-[#1F2937] p-4 space-y-3">
                      <span className="text-[9.5px] text-[#3B82F6] font-bold tracking-widest uppercase block border-b border-[#1F2937] pb-1.5">
                        1. RESEARCH AGENT OUTLINE
                      </span>
                      <div className="space-y-2 text-[10.5px] text-[#9CA3AF] leading-relaxed">
                        <div>
                          <strong className="text-white block text-[9px] uppercase">Strengths:</strong>
                          <ul className="list-disc pl-3 text-[10px] mt-0.5 space-y-0.5">
                            {results.research?.strengths?.slice(0, 2).map((s, i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                        <div>
                          <strong className="text-[#EF4444] block text-[9px] uppercase">Weaknesses:</strong>
                          <ul className="list-disc pl-3 text-[10px] mt-0.5 space-y-0.5">
                            {results.research?.weaknesses?.slice(0, 2).map((w, i) => <li key={i}>{w}</li>)}
                          </ul>
                        </div>
                        <div>
                          <strong className="text-white block text-[9px] uppercase">Concentration:</strong>
                          <p className="text-[10px] mt-0.5">{results.research?.concentrationRisks?.[0] || 'In bounds.'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Widget B: Portfolio Risk Engine */}
                    <div className="bg-[#111827] border border-[#1F2937] p-4 space-y-3">
                      <span className="text-[9.5px] text-[#EF4444] font-bold tracking-widest uppercase block border-b border-[#1F2937] pb-1.5">
                        2. RISK ENGINE REGISTRY
                      </span>
                      <div className="space-y-3 text-[10.5px]">
                        <div>
                          <span className="text-[9px] text-[#9CA3AF] uppercase block">Highest Risk Holding</span>
                          <strong className="text-white text-[11px] font-bold block">{results.bonus?.highestRiskHolding?.company?.toUpperCase()}</strong>
                          <span className="text-[9px] text-slate-400">Risk Score: {results.bonus?.highestRiskHolding?.risk}/100</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#9CA3AF] uppercase block">Weakest Holding</span>
                          <strong className="text-white text-[11px] font-bold block">{results.bonus?.weakestHolding?.company?.toUpperCase()}</strong>
                          <span className="text-[9px] text-slate-400">Vetting Score: {results.bonus?.weakestHolding?.score}/100</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#9CA3AF] uppercase block">Most Concentrated Position</span>
                          <strong className="text-white text-[11px] font-bold block">{results.bonus?.topHolding?.company?.toUpperCase()}</strong>
                          <span className="text-[9px] text-slate-400">Allocation Weight: {results.bonus?.topHolding?.weight}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Widget C: Portfolio Committee Agent */}
                    <div className="bg-[#111827] border border-[#1F2937] p-4 space-y-3">
                      <span className="text-[9.5px] text-[#F59E0B] font-bold tracking-widest uppercase block border-b border-[#1F2937] pb-1.5">
                        3. COMMITTEE VOTE SYS
                      </span>
                      <div className="space-y-2 text-[10.5px]">
                        <div>
                          <span className="text-[9px] text-[#9CA3AF] uppercase block">Consensus Recommendation</span>
                          <span className={`px-2 py-0.25 text-[10px] border font-bold block w-fit mt-1 rounded-sm ${getRecommendationStyle(results.recommendation)}`}>
                            {results.recommendation}
                          </span>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#9CA3AF] uppercase block">Calibrated Confidence</span>
                          <strong className="text-white text-[11px] block">{results.confidence}%</strong>
                        </div>
                        <div>
                          <span className="text-[9px] text-[#9CA3AF] uppercase block">Synthesis Reasoning</span>
                          <p className="text-[10px] text-[#9CA3AF] leading-relaxed line-clamp-3">{results.committeeDecision?.reasoning}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 7: Top Holdings Analysis */}
                <div className="bg-[#111827] border border-[#1F2937] p-5 space-y-3">
                  <span className="text-[10px] font-bold text-white tracking-widest uppercase block border-b border-[#1F2937] pb-2">
                    TOP HOLDINGS EXTREMUMS ANALYSIS
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { title: 'STRONGEST HOLDING', value: results.bonus?.strongestHolding?.company, meta: `Score: ${results.bonus?.strongestHolding?.score}/100` },
                      { title: 'WEAKEST HOLDING', value: results.bonus?.weakestHolding?.company, meta: `Score: ${results.bonus?.weakestHolding?.score}/100` },
                      { title: 'HIGHEST CONFIDENCE', value: highestConf?.company, meta: `Confidence: ${highestConf?.confidence}%` },
                      { title: 'HIGHEST RISK HOLDING', value: results.bonus?.highestRiskHolding?.company, meta: `Risk Score: ${results.bonus?.highestRiskHolding?.risk}/100` }
                    ].map((widget, idx) => (
                      <div key={idx} className="border border-[#1F2937] bg-[#0A0E17]/40 p-3 flex flex-col justify-between h-20 hover:border-slate-800 transition-all">
                        <span className="text-[8px] font-bold text-[#9CA3AF] tracking-wider uppercase leading-snug">{widget.title}</span>
                        <div>
                          <div className="text-[11px] font-bold text-white truncate">{widget.value?.toUpperCase() || 'N/A'}</div>
                          <div className="text-[9px] text-[#9CA3AF] mt-0.5">{widget.meta}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 8: Decision Audit Registry */}
                <div className="bg-[#111827] border border-[#1F2937] p-5 space-y-4">
                  <h3 className="text-xs font-bold text-white tracking-widest border-b border-[#1F2937] pb-2">
                    DECISION AUDIT REGISTRY
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-3">
                    
                    {/* Reason Codes */}
                    <div className="space-y-2">
                      <span className="text-[9px] text-[#9CA3AF] font-bold uppercase block">RECOMMENDATION REASON CODES</span>
                      <div className="flex flex-wrap gap-1.5">
                        {results.recommendationReasonCodes?.length > 0 ? (
                          results.recommendationReasonCodes.map((code, idx) => (
                            <span key={idx} className="text-[8px] font-bold border border-[#10B981]/30 bg-[#10B981]/5 text-[#10B981] px-2 py-0.5 rounded-sm">
                              {code}
                            </span>
                          ))
                        ) : (
                          <span className="text-[8px] font-bold border border-slate-700 text-slate-400 px-2 py-0.5">
                            NO_SPECIFIC_CODES
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Diversification Warnings */}
                    <div className="space-y-2 border-t sm:border-t-0 sm:border-l border-[#1F2937]/50 sm:pl-4">
                      <span className="text-[9px] text-[#EF4444] font-bold uppercase block">DIVERSIFICATION WARNINGS</span>
                      <div className="space-y-1.5">
                        {results.diversificationWarnings?.length > 0 ? (
                          results.diversificationWarnings.map((warn, idx) => (
                            <div key={idx} className="text-[9px] text-[#EF4444] flex items-start gap-1 font-sans">
                              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                              <span>{warn}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-[9px] text-[#10B981] flex items-start gap-1 font-sans">
                            <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
                            <span>Diversification balances optimal.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Guardrail Triggers */}
                    <div className="space-y-2 border-t sm:border-t-0 sm:border-l border-[#1F2937]/50 sm:pl-4">
                      <span className="text-[9px] text-[#F59E0B] font-bold uppercase block">GUARDRAIL TRIGGERS</span>
                      <div className="space-y-1.5">
                        {results.guardrailTriggers?.length > 0 ? (
                          results.guardrailTriggers.map((trig, idx) => (
                            <div key={idx} className="text-[9px] text-[#F59E0B] flex items-start gap-1 font-sans">
                              <ShieldAlert className="h-3 w-3 shrink-0 mt-0.5" />
                              <span>{trig}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-[9px] text-[#10B981] flex items-start gap-1 font-sans">
                            <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
                            <span>No safety guardrails triggered.</span>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>

                {/* Section 9: Material Events */}
                <div className="bg-[#111827] border border-[#1F2937] p-5 space-y-3">
                  <span className="text-[10px] font-bold text-white tracking-widest uppercase block border-b border-[#1F2937] pb-2">
                    RECENT MATERIAL EVENTS DECK (Across All Holdings)
                  </span>
                  {results.materialEvents?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[#1F2937] text-[#9CA3AF] text-[9.5px]">
                            <th className="py-2 font-bold">COMPANY</th>
                            <th className="py-2 font-bold">EVENT TITLE</th>
                            <th className="py-2 font-bold">SOURCE</th>
                            <th className="py-2 font-bold text-right">PUBLISHED TIME</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1F2937]/50 text-slate-300 font-mono">
                          {results.materialEvents.slice(0, 10).map((ev, index) => {
                            const eventTime = new Date(ev.publishedAt).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            });
                            return (
                              <tr key={index} className="hover:bg-[#1F2937]/35">
                                <td className="py-2 font-bold text-white uppercase">{ev.company}</td>
                                <td className="py-2 text-[11px] font-sans text-slate-200">{ev.title}</td>
                                <td className="py-2 text-[#3B82F6]">{ev.source}</td>
                                <td className="py-2 text-right text-slate-400">{eventTime}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-xs text-[#9CA3AF] leading-relaxed font-sans py-2">
                      No material filings,Guidance changes or executive transitions detected for holdings.
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};

export default PortfolioBuilder;
