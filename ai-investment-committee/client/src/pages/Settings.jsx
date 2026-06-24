import React, { useEffect, useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Database, 
  Cpu, 
  Network, 
  ShieldCheck, 
  Layers,
  Flame,
  Globe
} from 'lucide-react';
import apiService from '../services/apiService';

const Settings = () => {
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    freshAnalyses: 0,
    staleAnalyses: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheRepairs: 0,
    cacheHitRate: '0%'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const cacheData = await apiService.getCacheStats();
        setStats(cacheData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="bg-[#0A0E17] min-h-screen text-slate-100 p-6 sm:p-8 font-mono terminal-grid">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="sticky top-0 z-20 bg-[#0A0E17] pt-2 pb-6 border-b border-[#1F2937] flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-widest flex items-center gap-3">
              <SettingsIcon className="h-5 w-5 text-[#10B981]" />
              TERMINAL CONFIGURATION
            </h1>
            <p className="text-xs text-[#9CA3AF] mt-1 font-sans">
              Review environment telemetry, smart cache metrics, and API engine specifications.
            </p>
          </div>
          <div className="text-[10px] bg-[#111827] border border-[#1F2937] px-3 py-1 text-[#10B981] font-bold">
            STATUS: ACTIVE
          </div>
        </div>

        {/* Configurations Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Section 1: Cache Control */}
          <div className="bg-[#111827] border border-[#1F2937] p-6 space-y-6">
            <h2 className="text-xs font-bold text-white tracking-widest border-b border-[#1F2937] pb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#10B981]" />
              SMART CACHE POLICIES
            </h2>

            {loading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-[#1F2937] w-full"></div>
                <div className="h-4 bg-[#1F2937] w-3/4"></div>
              </div>
            ) : (
              <div className="space-y-4 text-xs text-[#9CA3AF]">
                <div className="flex justify-between border-b border-[#1F2937]/50 pb-2">
                  <span>MAX CACHE AGE</span>
                  <span className="text-white font-bold">24 HOURS</span>
                </div>
                <div className="flex justify-between border-b border-[#1F2937]/50 pb-2">
                  <span>COMPLETENESS THRESHOLD</span>
                  <span className="text-white font-bold">80% SCORE</span>
                </div>
                <div className="flex justify-between border-b border-[#1F2937]/50 pb-2">
                  <span>CACHE HITS REGISTERED</span>
                  <span className="text-[#10B981] font-bold">{stats.cacheHits}</span>
                </div>
                <div className="flex justify-between border-b border-[#1F2937]/50 pb-2">
                  <span>CACHE MISSES (API INVOKED)</span>
                  <span className="text-[#EF4444] font-bold">{stats.cacheMisses}</span>
                </div>
                <div className="flex justify-between border-b border-[#1F2937]/50 pb-2">
                  <span>AUTO-REPAIRED REPORTS</span>
                  <span className="text-amber-500 font-bold">{stats.cacheRepairs}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span>COMPUTED HIT RATIO</span>
                  <span className="text-white font-bold text-sm text-[#10B981]">{stats.cacheHitRate}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Engine Specifications */}
          <div className="bg-[#111827] border border-[#1F2937] p-6 space-y-6">
            <h2 className="text-xs font-bold text-white tracking-widest border-b border-[#1F2937] pb-3 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-[#10B981]" />
              ENGINE SPECIFICATIONS
            </h2>
            <div className="space-y-4 text-xs text-[#9CA3AF]">
              <div className="flex justify-between border-b border-[#1F2937]/50 pb-2">
                <span>LLM PROVIDER</span>
                <span className="text-white font-bold">GEMINI 2.5 FLASH</span>
              </div>
              <div className="flex justify-between border-b border-[#1F2937]/50 pb-2">
                <span>DATA INTEGRATION</span>
                <span className="text-white font-bold">YAHOO FINANCE / WIKIPEDIA</span>
              </div>
              <div className="flex justify-between border-b border-[#1F2937]/50 pb-2">
                <span>EVIDENCE CRAWLER</span>
                <span className="text-white font-bold">TAVILY SEARCH API</span>
              </div>
              <div className="flex justify-between border-b border-[#1F2937]/50 pb-2">
                <span>GRAPH WORKFLOW</span>
                <span className="text-white font-bold">LANGGRAPH STATEGRAPH</span>
              </div>
              <div className="flex justify-between border-b border-[#1F2937]/50 pb-2">
                <span>PERSISTENCE STORE</span>
                <span className="text-white font-bold">POSTGRESQL (NEON)</span>
              </div>
              <div className="flex justify-between pt-2">
                <span>API INSTANCE URI</span>
                <span className="text-blue-400 font-bold font-sans text-[10px]">http://localhost:5001/api</span>
              </div>
            </div>
          </div>

        </div>

        {/* Network Gateways */}
        <div className="bg-[#111827] border border-[#1F2937] p-6 space-y-6">
          <h2 className="text-xs font-bold text-white tracking-widest border-b border-[#1F2937] pb-3 flex items-center gap-2">
            <Network className="h-4 w-4 text-[#10B981]" />
            NETWORK GATEWAYS
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            
            <div className="border border-[#1F2937] p-4 bg-[#0A0E17] flex items-center space-x-3">
              <div className="h-2 w-2 rounded-full bg-[#10B981]" />
              <div>
                <div className="text-[10px] text-white font-bold">WIKIPEDIA GATEWAY</div>
                <div className="text-[9px] text-[#9CA3AF]">REST v1 - DISPATCHED</div>
              </div>
            </div>

            <div className="border border-[#1F2937] p-4 bg-[#0A0E17] flex items-center space-x-3">
              <div className="h-2 w-2 rounded-full bg-[#10B981]" />
              <div>
                <div className="text-[10px] text-white font-bold">TAVILY API GATEWAY</div>
                <div className="text-[9px] text-[#9CA3AF]">HTTPS CRAWL - ACTIVE</div>
              </div>
            </div>

            <div className="border border-[#1F2937] p-4 bg-[#0A0E17] flex items-center space-x-3">
              <div className="h-2 w-2 rounded-full bg-[#10B981]" />
              <div>
                <div className="text-[10px] text-white font-bold">GEMINI AI GATEWAY</div>
                <div className="text-[9px] text-[#9CA3AF]">GENERATION GATEWAY - ACTIVE</div>
              </div>
            </div>

          </div>
        </div>

        {/* Security & System Info */}
        <div className="border border-[#1F2937] p-4 text-[#9CA3AF] text-[9px] leading-relaxed">
          <div className="font-bold text-white mb-1 flex items-center gap-1.5 uppercase">
            <ShieldCheck className="h-3 w-3 text-[#10B981]" />
            Institutional Compliance & Sandbox Verification
          </div>
          This terminal operates in developer mode. Database access endpoints are configured to securely access the remote PostgreSQL cluster via SSL configuration keys. LLM requests are managed through internal state graph annotations, guaranteeing complete consensus verification before final committee decisions are logged.
        </div>

      </div>
    </div>
  );
};

export default Settings;
