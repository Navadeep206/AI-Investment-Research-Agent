import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Analyze from './pages/Analyze';
import Compare from './pages/Compare';
import History from './pages/History';
import AnalysisDetail from './pages/AnalysisDetail';
import Settings from './pages/Settings';
import PortfolioBuilder from './pages/PortfolioBuilder';

function App() {
  return (
    <Router>
      <div className="flex bg-[#0A0E17] text-slate-100 h-screen overflow-hidden">
        {/* Bloomberg-style left sidebar */}
        <Sidebar />
        
        {/* Main Workdesk Panel */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analyze" element={<Analyze />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/history" element={<History />} />
            <Route path="/analysis/:id" element={<AnalysisDetail />} />
            <Route path="/portfolio" element={<PortfolioBuilder />} />
            <Route path="/settings" element={<Settings />} />
            {/* Fallback routes redirect directly to Dashboard */}
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
