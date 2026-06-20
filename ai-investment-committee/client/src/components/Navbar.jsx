import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, ShieldAlert, Cpu, LayoutDashboard, Home } from 'lucide-react';
import api from '../api/axios';

const Navbar = () => {
  const location = useLocation();
  const [apiStatus, setApiStatus] = useState('checking'); // 'checking', 'online', 'offline'

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await api.get('/health');
        if (response.success) {
          setApiStatus('online');
        } else {
          setApiStatus('offline');
        }
      } catch (err) {
        setApiStatus('offline');
      }
    };
    checkHealth();
    // Poll every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-borderDark bg-darkBg/75 backdrop-blur-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-accentPrimary to-accentSecondary text-white shadow-neon transition-transform duration-300 group-hover:scale-105">
                <Cpu className="h-5 w-5" />
              </div>
              <span className="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-xl font-bold tracking-tight text-transparent font-sans">
                AI Investment Committee
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            <Link
              to="/"
              className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                isActive('/') 
                  ? 'bg-panelBg text-white border border-borderDark/60' 
                  : 'text-textMuted hover:bg-cardBg hover:text-white'
              }`}
            >
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Link>
            
            <Link
              to="/dashboard"
              className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                isActive('/dashboard') 
                  ? 'bg-panelBg text-white border border-borderDark/60' 
                  : 'text-textMuted hover:bg-cardBg hover:text-white'
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          </div>

          {/* Health Status & Action */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 rounded-full border border-borderDark bg-cardBg/60 px-3.5 py-1.5 text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                  apiStatus === 'online' ? 'bg-emerald-400' : apiStatus === 'offline' ? 'bg-rose-400' : 'bg-amber-400'
                }`}></span>
                <span className={`relative inline-flex h-2 w-2 rounded-full ${
                  apiStatus === 'online' ? 'bg-emerald-500' : apiStatus === 'offline' ? 'bg-rose-500' : 'bg-amber-500'
                }`}></span>
              </span>
              <span className="text-slate-300">
                API: {apiStatus === 'online' ? 'ONLINE' : apiStatus === 'offline' ? 'OFFLINE' : 'CHECKING'}
              </span>
            </div>

            <Link
              to="/dashboard"
              className="relative hidden sm:inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-accentPrimary to-accentSecondary px-4.5 py-2 text-sm font-semibold text-white shadow-neon transition-all duration-300 hover:shadow-indigo-500/50 hover:brightness-110 active:scale-95"
            >
              Start Analysis
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
