import React from 'react';
import { 
  Cpu, 
  Clock, 
  Activity, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Play,
  Heart
} from 'lucide-react';

const AgentExecutionPanel = ({ agents = [] }) => {
  // If no agents yet, use standard default pending states
  const defaultAgents = [
    { agentName: "Research Agent", status: "PENDING", durationMs: 0, summary: "" },
    { agentName: "Scoring Agent", status: "PENDING", durationMs: 0, summary: "" },
    { agentName: "Devil Advocate Agent", status: "PENDING", durationMs: 0, summary: "" },
    { agentName: "Committee Agent", status: "PENDING", durationMs: 0, summary: "" }
  ];

  const displayAgents = agents.length > 0 ? agents : defaultAgents;

  // Calculate metrics
  const totalDurationMs = displayAgents.reduce((sum, a) => sum + (a.durationMs || 0), 0);
  const totalDurationSec = (totalDurationMs / 1000).toFixed(1);

  const completedCount = displayAgents.filter(a => a.status === 'COMPLETED').length;
  const runningCount = displayAgents.filter(a => a.status === 'RUNNING').length;
  const failedCount = displayAgents.filter(a => a.status === 'FAILED').length;

  let workflowHealth = "HEALTHY";
  let healthColor = "text-[#10B981] border-[#10B981]/30 bg-[#10B981]/5";
  if (failedCount > 0) {
    workflowHealth = "FAILED";
    healthColor = "text-[#EF4444] border-[#EF4444]/30 bg-[#EF4444]/5";
  } else if (runningCount > 0) {
    workflowHealth = "ACTIVE VETTING";
    healthColor = "text-[#3B82F6] border-[#3B82F6]/30 bg-[#3B82F6]/5";
  } else if (completedCount === displayAgents.length) {
    workflowHealth = "ARCHIVED SUCCESS";
    healthColor = "text-[#10B981] border-[#10B981]/30 bg-[#10B981]/5";
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'RUNNING':
        return {
          bg: 'bg-[#3B82F6]/10 border-[#3B82F6]',
          text: 'text-[#3B82F6]',
          label: 'RUNNING',
          dot: 'bg-[#3B82F6] animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.7)]'
        };
      case 'COMPLETED':
        return {
          bg: 'bg-[#10B981]/5 border-[#10B981]/40',
          text: 'text-[#10B981]',
          label: 'COMPLETED',
          dot: 'bg-[#10B981]'
        };
      case 'FAILED':
        return {
          bg: 'bg-[#EF4444]/10 border-[#EF4444]/40',
          text: 'text-[#EF4444]',
          label: 'FAILED',
          dot: 'bg-[#EF4444] shadow-[0_0_10px_rgba(239,68,68,0.7)]'
        };
      default:
        return {
          bg: 'bg-[#111827] border-[#1F2937]',
          text: 'text-[#9CA3AF]',
          label: 'PENDING',
          dot: 'bg-[#1F2937]'
        };
    }
  };

  return (
    <div className="bg-[#111827] border border-[#1F2937] p-6 space-y-6 font-mono">
      
      {/* Panel Title & Telemetry Header */}
      <div className="border-b border-[#1F2937] pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
        <div>
          <h2 className="text-xs font-bold text-white tracking-widest flex items-center gap-2">
            <Cpu className="h-4.5 w-4.5 text-[#10B981] animate-pulse" />
            LANGGRAPH STATEGRAPH TRACING
          </h2>
          <p className="text-[9px] text-[#9CA3AF] mt-0.5 font-sans">
            Real-time step telemetry monitor of the investment advisory committee graph.
          </p>
        </div>
        
        {/* Telemetry Widgets */}
        <div className="flex flex-wrap items-center gap-3">
          
          <div className="border border-[#1F2937] px-2.5 py-1 text-[9px] text-[#9CA3AF] flex items-center space-x-1.5">
            <Clock className="h-3 w-3" />
            <span>ELAPSED: <strong className="text-white">{totalDurationSec}s</strong></span>
          </div>

          <div className="border border-[#1F2937] px-2.5 py-1 text-[9px] text-[#9CA3AF] flex items-center space-x-1.5">
            <Activity className="h-3 w-3" />
            <span>AGENTS: <strong className="text-white">{completedCount} / 4</strong></span>
          </div>

          <div className={`border px-2.5 py-1 text-[9px] font-bold flex items-center space-x-1.5 ${healthColor}`}>
            <Heart className="h-3 w-3 animate-pulse" />
            <span>STATUS: {workflowHealth}</span>
          </div>

        </div>
      </div>

      {/* Vertical Timeline */}
      <div className="relative pl-7 border-l-2 border-[#1F2937]/60 space-y-7 py-2">
        {displayAgents.map((agent, index) => {
          const stepNum = index + 1;
          const status = getStatusStyle(agent.status);
          const duration = (agent.durationMs / 1000).toFixed(1);

          return (
            <div key={index} className="relative group">
              
              {/* Timeline Connector Dot */}
              <div className={`absolute -left-[37px] top-0.5 h-4.5 w-4.5 rounded-full border-2 border-[#0A0E17] flex items-center justify-center ${status.bg}`}>
                <div className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              </div>

              <div className="bg-[#0A0E17]/40 border border-[#1F2937]/50 p-4 space-y-2 hover:border-[#1F2937] transition-all">
                
                {/* Node details header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-[#1F2937]/35 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[9px] text-[#9CA3AF] font-bold">NODE 0{stepNum}</span>
                    <h3 className="text-xs font-bold text-white tracking-widest uppercase">
                      {agent.agentName}
                    </h3>
                  </div>
                  
                  <div className="flex items-center space-x-3.5 text-[10px]">
                    <span className={`font-bold text-[9px] ${status.text}`}>
                      {status.label}
                    </span>
                    {agent.status !== 'PENDING' && (
                      <span className="text-[#9CA3AF] font-bold">
                        {duration}s
                      </span>
                    )}
                  </div>
                </div>

                {/* Node Output Summary */}
                <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
                  {agent.status === 'PENDING' 
                    ? 'Awaiting token activation...' 
                    : agent.status === 'RUNNING'
                      ? (agent.summary || 'Processing neural network node execution directives...')
                      : agent.summary
                  }
                </p>

              </div>
            </div>
          );
        })}
      </div>

      {/* High Density audit footer */}
      {failedCount > 0 && (
        <div className="border border-[#EF4444]/30 bg-[#EF4444]/5 p-3 text-[#EF4444] text-[10px] leading-relaxed flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <strong>CRITICAL FAILURE DETECTED: </strong>
            One or more multi-agent nodes crashed during execution. Check terminal stdout logging details to resolve configuration errors.
          </div>
        </div>
      )}

    </div>
  );
};

export default AgentExecutionPanel;
