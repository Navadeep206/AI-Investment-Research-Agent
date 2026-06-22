import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Search, 
  GitCompare, 
  History, 
  Settings,
  Database,
  Cpu,
  Globe,
  Radio,
  Briefcase
} from 'lucide-react';
import apiService from '../services/apiService';

const Sidebar = () => {
  const [dbConnected, setDbConnected] = useState(true);
  const [cacheStats, setCacheStats] = useState({ totalAnalyses: 0, cacheHitRate: '0%' });

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const stats = await apiService.getCacheStats();
        setCacheStats({
          totalAnalyses: stats.totalAnalyses || 0,
          cacheHitRate: stats.cacheHitRate || '0%'
        });
        setDbConnected(true);
      } catch (err) {
        setDbConnected(false);
      }
    };
    fetchStatus();
    // Poll every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { to: '/', label: 'DASHBOARD', icon: LayoutDashboard },
    { to: '/analyze', label: 'ANALYZE', icon: Search },
    { to: '/compare', label: 'COMPARE', icon: GitCompare },
    { to: '/portfolio', label: 'PORTFOLIO', icon: Briefcase },
    { to: '/history', label: 'HISTORY', icon: History },
    { to: '/settings', label: 'SETTINGS', icon: Settings },
  ];

  return (
    <aside className="w-64 min-h-screen bg-[#0A0E17] border-r border-[#1F2937] flex flex-col font-mono text-xs select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#1F2937]">
        <div className="flex items-center space-x-2.5">
          <div className="h-5 w-5 bg-[#10B981] flex items-center justify-center rounded-sm text-[#0A0E17] font-black text-[10px]">
            AI
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-widest leading-none font-sans">
              INVEST.TERMINAL
            </h1>
            <span className="text-[9px] text-[#9CA3AF] tracking-wide block mt-1">
              DECISION ENGINE v1.0.0
            </span>
          </div>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `
                flex items-center space-x-3 px-3 py-3 rounded-md transition-all duration-150 font-bold group
                ${isActive 
                  ? 'bg-[#111827] text-[#10B981] border border-[#1F2937]' 
                  : 'text-[#9CA3AF] hover:text-white hover:bg-[#111827]/50'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-[#10B981]' : 'text-[#9CA3AF] group-hover:text-white'}`} />
                  <span className="tracking-widest">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1 h-3.5 bg-[#10B981]" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Telemetry Panel */}
      <div className="p-4 border-t border-[#1F2937] bg-[#111827]/40 space-y-3.5 text-[#9CA3AF]">
        <div className="text-[10px] font-bold text-white tracking-wider pb-1.5 border-b border-[#1F2937]">
          SYSTEM TELEMETRY
        </div>

        {/* Database Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="h-3.5 w-3.5" />
            <span>POSTGRESQL DB</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className={`h-1.5 w-1.5 rounded-full ${dbConnected ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
            <span className={dbConnected ? 'text-slate-300' : 'text-[#EF4444]'}>
              {dbConnected ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* LLM Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Cpu className="h-3.5 w-3.5" />
            <span>GEMINI ENGINE</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
            <span className="text-slate-300">ACTIVE</span>
          </div>
        </div>

        {/* Web Search Agent Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Globe className="h-3.5 w-3.5" />
            <span>TAVILY CRAWLER</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
            <span className="text-slate-300">READY</span>
          </div>
        </div>

        {/* Cache status info */}
        <div className="pt-2 border-t border-[#1F2937] flex items-center justify-between text-[10px]">
          <span>CACHE COVERAGE</span>
          <span className="font-bold text-white">{cacheStats.cacheHitRate}</span>
        </div>

        <div className="flex items-center justify-between text-[10px]">
          <span>RUNS STORED</span>
          <span className="font-bold text-white">{cacheStats.totalAnalyses}</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
