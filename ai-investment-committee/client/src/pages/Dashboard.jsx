import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  TrendingUp, 
  Layers, 
  Percent, 
  Activity, 
  ShieldAlert, 
  ChevronRight, 
  Plus,
  RefreshCw,
  Search
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';
import apiService from '../services/apiService';

const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = async () => {
    try {
      const stats = await apiService.getDashboardStats();
      setData(stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const getRecommendationColor = (rec) => {
    const r = (rec || '').toUpperCase();
    if (r === 'INVEST') return 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30';
    if (r === 'WATCH') return 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30';
    return 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30';
  };

  if (loading) {
    return (
      <div className="bg-[#0A0E17] min-h-screen text-slate-100 p-6 sm:p-8 font-mono flex items-center justify-center">
        <div className="space-y-4 text-center">
          <RefreshCw className="h-8 w-8 text-[#10B981] animate-spin mx-auto" />
          <p className="text-xs text-[#9CA3AF] uppercase tracking-widest">LOADING TELEMETRY DATA...</p>
        </div>
      </div>
    );
  }

  const {
    totalAnalyses,
    companiesTracked,
    cacheHitRate,
    avgConfidence,
    avgEvidenceQuality,
    recentAnalyses,
    topRatedCompanies,
    recommendationDistribution
  } = data;

  const hasData = totalAnalyses > 0;
  const pieData = hasData ? recommendationDistribution.filter(d => d.value > 0) : [];

  return (
    <div className="bg-[#0A0E17] min-h-screen text-slate-100 p-6 sm:p-8 font-mono terminal-grid">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Terminal Header */}
        <div className="sticky top-0 z-20 bg-[#0A0E17] pt-2 pb-6 border-b border-[#1F2937] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold tracking-widest text-white">AI INVESTMENT PORTAL</h1>
            <p className="text-xs text-[#9CA3AF] mt-1 font-sans">
              Consolidated equity intelligence & multi-agent vetting ledger.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 border border-[#1F2937] bg-[#111827] px-4 py-2 hover:bg-[#1F2937] transition-all text-xs font-bold text-slate-300 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>REFRESH</span>
            </button>
            <Link
              to="/analyze"
              className="flex items-center space-x-2 bg-[#10B981] text-[#0A0E17] px-4 py-2 hover:brightness-110 transition-all text-xs font-bold font-mono"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>NEW ANALYSIS</span>
            </Link>
          </div>
        </div>

        {!hasData ? (
          /* Empty Database State */
          <div className="border border-[#1F2937] bg-[#111827] p-12 text-center max-w-2xl mx-auto space-y-6 my-12">
            <div className="h-12 w-12 rounded-sm bg-[#10B981]/15 text-[#10B981] flex items-center justify-center mx-auto border border-[#10B981]/30">
              <Activity className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-white tracking-wider">NO RUN RECORDS DETECTED</h2>
              <p className="text-xs text-[#9CA3AF] font-sans max-w-md mx-auto leading-relaxed">
                The terminal ledger is currently blank. Initiate the LangGraph multi-agent advisory committee process by inputting an asset ticker or company name.
              </p>
            </div>
            <div>
              <Link
                to="/analyze"
                className="inline-flex items-center space-x-2 bg-[#10B981] text-[#0A0E17] px-6 py-2.5 hover:brightness-110 transition-all text-xs font-bold"
              >
                <Search className="h-4 w-4" />
                <span>GO TO ANALYZER</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Dashboard Content */
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              
              {/* Card 1 */}
              <div className="bg-[#111827] border border-[#1F2937] p-4 flex flex-col justify-between space-y-4">
                <span className="text-[10px] text-[#9CA3AF] tracking-wider uppercase font-bold flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-[#10B981]" />
                  TOTAL ANALYSES
                </span>
                <div>
                  <div className="text-2xl font-bold text-white leading-none">{totalAnalyses}</div>
                  <div className="text-[9px] text-[#9CA3AF] mt-1">DB RECORDS STORED</div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-[#111827] border border-[#1F2937] p-4 flex flex-col justify-between space-y-4">
                <span className="text-[10px] text-[#9CA3AF] tracking-wider uppercase font-bold flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-[#10B981]" />
                  COMPANIES TRACKED
                </span>
                <div>
                  <div className="text-2xl font-bold text-white leading-none">{companiesTracked}</div>
                  <div className="text-[9px] text-[#9CA3AF] mt-1">UNIQUE STOCKS INDEXED</div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-[#111827] border border-[#1F2937] p-4 flex flex-col justify-between space-y-4">
                <span className="text-[10px] text-[#9CA3AF] tracking-wider uppercase font-bold flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5 text-[#10B981]" />
                  CACHE HIT RATE
                </span>
                <div>
                  <div className="text-2xl font-bold text-white leading-none">{cacheHitRate}</div>
                  <div className="text-[9px] text-[#9CA3AF] mt-1">SMART CACHE COVERAGE</div>
                </div>
              </div>

              {/* Card 4 */}
              <div className="bg-[#111827] border border-[#1F2937] p-4 flex flex-col justify-between space-y-4">
                <span className="text-[10px] text-[#9CA3AF] tracking-wider uppercase font-bold flex items-center gap-1.5">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                  AVG CONFIDENCE
                </span>
                <div>
                  <div className="text-2xl font-bold text-white leading-none">{avgConfidence}%</div>
                  <div className="text-[9px] text-[#9CA3AF] mt-1">COMMITTEE CONVICTION</div>
                </div>
              </div>

              {/* Card 5 */}
              <div className="bg-[#111827] border border-[#1F2937] p-4 flex flex-col justify-between space-y-4">
                <span className="text-[10px] text-[#9CA3AF] tracking-wider uppercase font-bold flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-[#3B82F6]" />
                  EVIDENCE QUALITY
                </span>
                <div>
                  <div className="text-2xl font-bold text-white leading-none">{avgEvidenceQuality}/100</div>
                  <div className="text-[9px] text-[#9CA3AF] mt-1">SOURCE CREDIBILITY AVG</div>
                </div>
              </div>

            </div>

            {/* Middle Row: Distribution Chart */}
            <div className="grid gap-6 lg:grid-cols-3">
              
              {/* Recommendation Distribution Card */}
              <div className="bg-[#111827] border border-[#1F2937] p-5 lg:col-span-1 flex flex-col">
                <h2 className="text-xs font-bold text-white tracking-widest border-b border-[#1F2937] pb-3 mb-4">
                  RECOMMENDATION SPLITS
                </h2>
                
                {pieData.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-xs text-[#9CA3AF]">
                    No distribution data.
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[220px]">
                    <div className="h-[180px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="#111827"
                            strokeWidth={2}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#111827', 
                              borderColor: '#1F2937',
                              color: '#fff',
                              fontFamily: 'monospace',
                              fontSize: '11px'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Custom Legend */}
                    <div className="flex items-center space-x-6 text-[10px] font-bold mt-2">
                      {pieData.map((d, index) => (
                        <div key={index} className="flex items-center space-x-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
                          <span className="text-[#9CA3AF]">{d.name}:</span>
                          <span className="text-white">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick instructions / Engine Summary */}
              <div className="bg-[#111827] border border-[#1F2937] p-5 lg:col-span-2 space-y-4 text-xs">
                <h2 className="text-xs font-bold text-white tracking-widest border-b border-[#1F2937] pb-3">
                  COMMITTEE LEDGER AUDIT LOGS
                </h2>
                <div className="space-y-3 leading-relaxed text-[#9CA3AF]">
                  <p>
                    This console provides visual management coordinates for the autonomous Investment Committee. We cross-reference raw information sources classified inside credibility tiers:
                  </p>
                  <ul className="list-disc pl-4 space-y-1.5">
                    <li>
                      <strong className="text-white">Tier A:</strong> Bloomberg, Reuters, Financial Times, SEC filings, Nasdaq.
                    </li>
                    <li>
                      <strong className="text-white">Tier B:</strong> Seeking Alpha, CNBC, Morningstar, MarketWatch.
                    </li>
                    <li>
                      <strong className="text-white">Tier C & D:</strong> Medium, blogs, Twitter/X, Reddit, forums.
                    </li>
                  </ul>
                  <p>
                    The average credibility weight computes the final <span className="text-white font-bold">Evidence Quality Average</span>.
                  </p>
                </div>
              </div>

            </div>

            {/* Bottom Row: Tables */}
            <div className="grid gap-6 lg:grid-cols-2">
              
              {/* Recent Analyses Table */}
              <div className="bg-[#111827] border border-[#1F2937] p-5">
                <div className="flex items-center justify-between border-b border-[#1F2937] pb-3 mb-4">
                  <h2 className="text-xs font-bold text-white tracking-widest">
                    RECENT ANALYSES
                  </h2>
                  <Link to="/history" className="text-[10px] text-[#10B981] hover:underline flex items-center gap-1 font-bold">
                    VIEW ALL <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#1F2937] text-[#9CA3AF]">
                        <th className="py-2.5 font-bold">COMPANY</th>
                        <th className="py-2.5 font-bold">RATING</th>
                        <th className="py-2.5 font-bold text-center">SCORE</th>
                        <th className="py-2.5 font-bold text-center">CONF.</th>
                        <th className="py-2.5 font-bold text-right">DATE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F2937]/45">
                      {recentAnalyses.slice(0, 5).map((item) => (
                        <tr 
                          key={item.id} 
                          onClick={() => navigate(`/analysis/${item.id}`)}
                          className="hover:bg-[#1F2937]/40 cursor-pointer group text-slate-300 hover:text-white"
                        >
                          <td className="py-3 font-bold group-hover:text-[#10B981]">{item.company}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 border text-[9px] font-bold ${getRecommendationColor(item.recommendation)}`}>
                              {item.recommendation}
                            </span>
                          </td>
                          <td className="py-3 text-center font-bold">{item.overallScore ?? 'N/A'}</td>
                          <td className="py-3 text-center text-[#9CA3AF]">{item.confidence ?? 'N/A'}%</td>
                          <td className="py-3 text-right text-[10px] text-[#9CA3AF]">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Rated Companies Table */}
              <div className="bg-[#111827] border border-[#1F2937] p-5">
                <div className="flex items-center justify-between border-b border-[#1F2937] pb-3 mb-4">
                  <h2 className="text-xs font-bold text-white tracking-widest text-[#10B981]">
                    TOP CONVICTION ASSETS
                  </h2>
                  <span className="text-[9px] bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] px-2 py-0.5 font-bold">
                    SCORE &gt;= 80
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#1F2937] text-[#9CA3AF]">
                        <th className="py-2.5 font-bold">COMPANY</th>
                        <th className="py-2.5 font-bold">RATING</th>
                        <th className="py-2.5 font-bold text-center">SCORE</th>
                        <th className="py-2.5 font-bold text-center">CONF.</th>
                        <th className="py-2.5 font-bold text-right">INDUSTRY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1F2937]/45">
                      {topRatedCompanies.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-[#9CA3AF] text-xs">
                            No companies have met the score threshold yet.
                          </td>
                        </tr>
                      ) : (
                        topRatedCompanies.slice(0, 5).map((item) => (
                          <tr 
                            key={item.id} 
                            onClick={() => navigate(`/analysis/${item.id}`)}
                            className="hover:bg-[#1F2937]/40 cursor-pointer group text-slate-300 hover:text-white"
                          >
                            <td className="py-3 font-bold group-hover:text-[#10B981]">{item.company}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 border text-[9px] font-bold ${getRecommendationColor(item.recommendation)}`}>
                                {item.recommendation}
                              </span>
                            </td>
                            <td className="py-3 text-center font-bold text-[#10B981]">{item.overallScore}</td>
                            <td className="py-3 text-center text-[#9CA3AF]">{item.confidence}%</td>
                            <td className="py-3 text-right text-[10px] text-[#9CA3AF] truncate max-w-[120px]">
                              {item.industry || 'N/A'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </>
        )}

      </div>
    </div>
  );
};

export default Dashboard;
