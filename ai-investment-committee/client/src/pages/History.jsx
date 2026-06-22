import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  History as HistoryIcon, 
  Search, 
  Trash2, 
  ExternalLink, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import apiService from '../services/apiService';

const History = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await apiService.getHistory();
      setHistory(data);
    } catch (err) {
      console.error('Failed to retrieve analysis history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Avoid triggering row navigation
    if (!window.confirm('Confirm deletion of this analysis run? This action permanently purges the record from PostgreSQL.')) {
      return;
    }
    
    setDeletingId(id);
    try {
      await apiService.deleteAnalysis(id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      alert('Delete operation failed. Please check network logs.');
    } finally {
      setDeletingId(null);
    }
  };

  const getRecColor = (rec) => {
    const r = (rec || '').toUpperCase();
    if (r === 'INVEST') return 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30';
    if (r === 'WATCH') return 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30';
    return 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30';
  };

  // Filter history items by search term
  const filteredHistory = history.filter(item => 
    item.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.industry && item.industry.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="bg-[#0A0E17] min-h-screen text-slate-100 p-6 sm:p-8 font-mono terminal-grid">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="border-b border-[#1F2937] pb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-widest text-white flex items-center gap-3">
              <HistoryIcon className="h-5 w-5 text-[#10B981]" />
              COMMITTEE LEDGER
            </h1>
            <p className="text-xs text-[#9CA3AF] mt-1 font-sans">
              Archived records of all LangGraph multi-agent stock evaluations.
            </p>
          </div>
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center space-x-2 border border-[#1F2937] bg-[#111827] px-4 py-2 hover:bg-[#1F2937] transition-all text-xs font-bold text-slate-300 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>
        </div>

        {/* Filter Input */}
        <div className="bg-[#111827] border border-[#1F2937] p-4 flex items-center relative">
          <Search className="absolute left-7 top-7 h-4.5 w-4.5 text-[#9CA3AF]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="FILTER BY ASSET NAME OR SECTOR CLASS..."
            className="w-full bg-[#0A0E17] border border-[#1F2937] pl-12 pr-4 py-2 text-xs text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#10B981] font-bold"
          />
        </div>

        {/* History Table */}
        <div className="bg-[#111827] border border-[#1F2937]">
          {loading ? (
            <div className="py-20 text-center space-y-4">
              <RefreshCw className="h-6 w-6 text-[#10B981] animate-spin mx-auto" />
              <div className="text-[10px] text-[#9CA3AF] uppercase tracking-wider">Loading history database records...</div>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-20 text-center text-[#9CA3AF] text-xs">
              No historical runs match the current query.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-[#1F2937] text-[#9CA3AF] bg-[#0A0E17]/50 select-none">
                    <th className="p-4 font-bold">COMPANY NAME</th>
                    <th className="p-4 font-bold">INDUSTRY</th>
                    <th className="p-4 font-bold">RECOMMENDATION</th>
                    <th className="p-4 font-bold text-center">OVERALL SCORE</th>
                    <th className="p-4 font-bold text-center">CONFIDENCE</th>
                    <th className="p-4 font-bold">VETTING DATE</th>
                    <th className="p-4 font-bold text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2937]/50">
                  {filteredHistory.map((item) => (
                    <tr 
                      key={item.id}
                      onClick={() => navigate(`/analysis/${item.id}`)}
                      className="hover:bg-[#1F2937]/40 cursor-pointer text-slate-300 hover:text-white transition-colors duration-150"
                    >
                      <td className="p-4 font-bold text-white uppercase">{item.company}</td>
                      <td className="p-4 text-[11px] text-[#9CA3AF]">{item.industry || 'N/A'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 border text-[9px] font-bold ${getRecColor(item.recommendation)}`}>
                          {item.recommendation || 'WATCH'}
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold text-[#10B981]">
                        {item.overallScore !== null ? item.overallScore : 'N/A'}
                      </td>
                      <td className="p-4 text-center text-slate-200">
                        {item.confidence !== null ? `${item.confidence}%` : 'N/A'}
                      </td>
                      <td className="p-4 text-[11px] text-[#9CA3AF]">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/analysis/${item.id}`);
                          }}
                          className="inline-flex items-center space-x-1 border border-[#1F2937] hover:bg-[#1F2937] px-2.5 py-1 text-[10px] font-bold text-[#9CA3AF] hover:text-white"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>OPEN</span>
                        </button>
                        
                        <button
                          onClick={(e) => handleDelete(e, item.id)}
                          disabled={deletingId === item.id}
                          className="inline-flex items-center space-x-1 border border-[#EF4444]/30 hover:border-[#EF4444] hover:bg-[#EF4444]/10 px-2.5 py-1 text-[10px] font-bold text-[#EF4444] disabled:opacity-50"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>{deletingId === item.id ? '...' : 'PURGE'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default History;
