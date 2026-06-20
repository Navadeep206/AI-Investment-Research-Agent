import React from 'react';
import { 
  Building2, 
  Search, 
  BarChart3, 
  PieChart, 
  AlertTriangle,
  History,
  Info
} from 'lucide-react';

const Dashboard = () => {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-darkBg text-slate-100 p-6 sm:p-8">
      {/* Decorative blurred shapes */}
      <div className="absolute top-10 right-10 -z-10 h-72 w-72 rounded-full bg-accentPrimary/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 -z-10 h-72 w-72 rounded-full bg-accentCyan/5 blur-[100px] pointer-events-none"></div>

      <div className="mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-8 border-b border-borderDark/60 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">
              Investment Analysis Dashboard
            </h1>
            <p className="text-sm text-textMuted mt-1">
              Select an asset or equity ticker to initiate the multi-agent committee process.
            </p>
          </div>
          
          {/* Mock Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-textMuted" />
            <input 
              type="text" 
              placeholder="Search ticker (e.g. AAPL, MSFT)..." 
              disabled
              className="w-full bg-cardBg/60 border border-borderDark rounded-xl pl-10 pr-4 py-2 text-sm text-slate-400 cursor-not-allowed focus:outline-none"
            />
          </div>
        </div>

        {/* Dashboard Content Container */}
        <div className="relative min-h-[500px] rounded-2xl border border-borderDark/60 bg-cardBg/20 overflow-hidden p-6 sm:p-8">
          
          {/* Overlay Screen (Glassmorphic) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-darkBg/65 backdrop-blur-[5px] z-20 text-center p-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-accentPrimary/20 to-accentSecondary/20 text-accentPrimary border border-accentPrimary/30 shadow-neon mb-6">
              <Building2 className="h-8 w-8" />
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Investment Analysis Dashboard Coming Soon
            </h2>
            <p className="mt-3 text-textMuted max-w-md text-sm leading-relaxed">
              We are finalizing the LangGraph consensus runner. In the next release, you will be able to dispatch tickers, inspect intermediate agent chat streams, and download investment memos.
            </p>
            
            <div className="mt-6 flex items-center space-x-2 text-xs text-accentCyan bg-accentCyan/5 border border-accentCyan/20 rounded-full px-4 py-1.5 font-medium">
              <Info className="h-3.5 w-3.5" />
              <span>Integration build v0.1.0-alpha active</span>
            </div>
          </div>

          {/* Background Mock Elements (to give the dashboard depth behind the overlay) */}
          <div className="opacity-20 select-none pointer-events-none filter blur-[1px]">
            {/* Grid of Cards */}
            <div className="grid gap-6 md:grid-cols-3 mb-8">
              <div className="rounded-xl border border-borderDark bg-cardBg p-5">
                <span className="text-xs text-textMuted">Selected Security</span>
                <div className="text-xl font-bold text-white mt-1">AAPL (Apple Inc.)</div>
              </div>
              <div className="rounded-xl border border-borderDark bg-cardBg p-5">
                <span className="text-xs text-textMuted">Agent Status</span>
                <div className="text-xl font-bold text-accentCyan mt-1">Awaiting Trigger</div>
              </div>
              <div className="rounded-xl border border-borderDark bg-cardBg p-5">
                <span className="text-xs text-textMuted">Risk Score</span>
                <div className="text-xl font-bold text-rose-500 mt-1">N/A</div>
              </div>
            </div>

            {/* Table Mock */}
            <div className="rounded-xl border border-borderDark bg-cardBg overflow-hidden mb-8">
              <div className="border-b border-borderDark p-4 font-bold text-sm bg-panelBg/30 text-white">
                Agent Decision History
              </div>
              <div className="p-4 space-y-4">
                <div className="h-8 rounded-lg bg-panelBg animate-shimmer"></div>
                <div className="h-8 rounded-lg bg-panelBg animate-shimmer"></div>
                <div className="h-8 rounded-lg bg-panelBg animate-shimmer"></div>
              </div>
            </div>

            {/* Chart Grid Mock */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-borderDark bg-cardBg p-5 h-48 flex items-center justify-center text-textMuted">
                <BarChart3 className="h-10 w-10 mr-2" /> Fundamental Metric Analysis Chart
              </div>
              <div className="rounded-xl border border-borderDark bg-cardBg p-5 h-48 flex items-center justify-center text-textMuted">
                <PieChart className="h-10 w-10 mr-2" /> Asset Allocation Weighting
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
