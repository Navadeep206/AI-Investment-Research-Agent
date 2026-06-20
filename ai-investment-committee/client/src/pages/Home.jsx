import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  Cpu, 
  ShieldCheck, 
  TrendingUp, 
  HelpCircle, 
  Award,
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';

const Home = () => {
  const agents = [
    {
      name: 'Research Agent',
      icon: Cpu,
      color: 'from-blue-500 to-indigo-500',
      description: 'Performs deep fundamental analysis, assesses competitive advantages, and analyzes historical financials.'
    },
    {
      name: 'Risk Agent',
      icon: ShieldCheck,
      color: 'from-rose-500 to-red-500',
      description: 'Checks leverage, evaluates debt covenants, performs stress testing, and calculates downside margin of safety.'
    },
    {
      name: 'Market Agent',
      icon: TrendingUp,
      color: 'from-emerald-500 to-teal-500',
      description: 'Tracks sector-wide multiple benchmarks, momentum indicators, and macro-economic factors.'
    },
    {
      name: 'Devil\'s Advocate',
      icon: HelpCircle,
      color: 'from-amber-500 to-orange-500',
      description: 'Deliberately challenges core investment assumptions to stress test the thesis and reveal hidden threats.'
    },
    {
      name: 'Committee Agent',
      icon: Award,
      color: 'from-purple-500 to-fuchsia-500',
      description: 'Synthesizes findings, assigns portfolio weightings, and outputs the final investment resolution.'
    }
  ];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-darkBg py-16 sm:py-24">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-accentPrimary/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-10 -z-10 h-72 w-72 rounded-full bg-accentSecondary/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute top-10 left-10 -z-10 h-72 w-72 rounded-full bg-accentCyan/10 blur-[100px] pointer-events-none"></div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero Header */}
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 rounded-full border border-accentPrimary/30 bg-accentPrimary/5 px-4.5 py-1.5 text-xs font-semibold text-accentPrimary shadow-sm mb-6 animate-pulse">
            <Sparkles className="h-3.5 w-3.5" />
            <span>LangGraph Multi-Agent Architecture</span>
          </div>
          
          <h1 className="font-sans text-5xl font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl">
            <span className="block">AI Investment</span>
            <span className="block mt-2 bg-gradient-to-r from-accentPrimary via-accentSecondary to-accentCyan bg-clip-text text-transparent">
              Committee
            </span>
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg text-textMuted sm:text-xl">
            Multi-Agent Investment Research Platform. Combine deep fundamental analysis, rigorous risk checks, and adversarial reviews to reach higher-conviction decisions.
          </p>

          <div className="mt-10 flex justify-center">
            <Link
              to="/dashboard"
              className="group flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-accentPrimary to-accentSecondary px-6 py-3.5 text-base font-bold text-white shadow-neon transition-all duration-300 hover:shadow-indigo-500/50 hover:brightness-110 active:scale-95"
            >
              <span>Start Analysis</span>
              <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        {/* Committee Agents Section */}
        <div className="mt-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Meet Your Autonomous Advisory Board</h2>
            <p className="mt-4 text-textMuted max-w-xl mx-auto">
              Our structured multi-agent state graph guides a company valuation through 5 expert agents sequentially.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {agents.map((agent, index) => {
              const Icon = agent.icon;
              return (
                <div 
                  key={index} 
                  className="group relative rounded-2xl border border-borderDark bg-cardBg/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accentPrimary/50 hover:bg-cardBg"
                >
                  <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr ${agent.color} text-white shadow-md mb-5`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{agent.name}</h3>
                  <p className="text-sm leading-relaxed text-textMuted group-hover:text-slate-300">
                    {agent.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Workflow Showcase */}
        <div className="mt-28 rounded-3xl border border-borderDark bg-cardBg/40 p-8 sm:p-12">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-center">
            <div className="lg:col-span-5">
              <span className="text-xs font-bold uppercase tracking-wider text-accentCyan">System Workflow</span>
              <h2 className="mt-3 text-3xl font-bold text-white">LangGraph Pipeline</h2>
              <p className="mt-4 text-sm text-textMuted leading-relaxed">
                The agent sequence ensures thoroughness. Information starts at the <strong>Research Agent</strong>, passes through structured vetting gates, undergoes an active challenge by the <strong>Devil's Advocate</strong>, and finally enters the <strong>Committee</strong> for consensus and portfolio allocation logic.
              </p>
              
              <div className="mt-6 space-y-3">
                <div className="flex items-center space-x-3 text-sm text-slate-300">
                  <Layers className="h-5 w-5 text-accentPrimary" />
                  <span>Stateful consensus tracing</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-slate-300">
                  <ShieldCheck className="h-5 w-5 text-accentCyan" />
                  <span>Downside vulnerability mitigation</span>
                </div>
              </div>
            </div>
            
            <div className="mt-10 lg:mt-0 lg:col-span-7 flex justify-center">
              {/* Graphic Representation */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-darkBg/60 p-6 rounded-2xl border border-borderDark w-full">
                <div className="flex flex-col items-center p-3.5 rounded-lg border border-borderDark bg-cardBg/80 text-center w-28">
                  <span className="text-xs font-bold text-slate-300">Research</span>
                </div>
                <ChevronRight className="h-5 w-5 text-textMuted hidden sm:block" />
                <div className="flex flex-col items-center p-3.5 rounded-lg border border-borderDark bg-cardBg/80 text-center w-28">
                  <span className="text-xs font-bold text-slate-300">Risk & Market</span>
                </div>
                <ChevronRight className="h-5 w-5 text-textMuted hidden sm:block" />
                <div className="flex flex-col items-center p-3.5 rounded-lg border border-borderDark bg-cardBg/80 text-center w-28">
                  <span className="text-xs font-bold text-slate-300">Devil's Adv.</span>
                </div>
                <ChevronRight className="h-5 w-5 text-textMuted hidden sm:block" />
                <div className="flex flex-col items-center p-3.5 rounded-lg border border-borderDark bg-cardBg/80 text-center w-28">
                  <span className="text-xs font-bold text-slate-300">Committee</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
