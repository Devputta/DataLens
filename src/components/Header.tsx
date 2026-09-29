import React from 'react';
import { Activity, BarChart3, Database, FileSpreadsheet, FileText, Play, Pause, Upload, Sun, Moon } from 'lucide-react';
import { Dataset } from '../types/analytics';
import { useTheme } from '../context/ThemeContext';
import { useCurrency } from '../context/CurrencyContext';

interface HeaderProps {
  currentTab: 'dashboard' | 'reports' | 'table' | 'quality';
  setCurrentTab: (tab: 'dashboard' | 'reports' | 'table' | 'quality') => void;
  dataset: Dataset | null;
  onOpenUpload: () => void;
  onOpenSamples: () => void;
  isStreaming: boolean;
  onToggleStreaming: () => void;
  streamTickCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  dataset,
  onOpenUpload,
  onOpenSamples,
  isStreaming,
  onToggleStreaming,
  streamTickCount,
}) => {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const { currency, setCurrency, useKFormat, toggleUseKFormat } = useCurrency();

  return (
    <header className={`sticky top-0 z-30 border-b transition-colors duration-150 no-print ${
      isDark
        ? 'bg-slate-900 border-slate-800 text-slate-100'
        : 'bg-white border-slate-200 text-slate-900 shadow-xs'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          
          {/* Zone 1: Wordmark & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold shadow-sm">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className={`text-base font-semibold tracking-tight transition-colors ${
                  isDark ? 'text-white group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-600'
                }`}>
                  DataLens
                </span>
                <span className="text-[9px] font-mono tracking-widest uppercase opacity-60">Analytics Studio</span>
              </div>
            </button>
          </div>

          {/* Zone 2: Navigation Links / Segmented Tabs */}
          <nav className={`flex items-center gap-1 p-1 rounded-lg border transition-colors overflow-x-auto ${
            isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-100 border-slate-200'
          }`}>
            {/* Dashboard Tab */}
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                currentTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            {/* Automation Report Tab (Incorporating Power BI report & visual dashboarder) */}
            <button
              onClick={() => setCurrentTab('reports')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                currentTab === 'reports'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Automation Report</span>
            </button>

            {/* Data Table Tab */}
            <button
              onClick={() => setCurrentTab('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                currentTab === 'table'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Data Table</span>
            </button>

            {/* Data Quality Tab */}
            <button
              onClick={() => setCurrentTab('quality')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                currentTab === 'quality'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Data Quality</span>
              <span className="md:hidden">Quality</span>
              {dataset && dataset.qualityReport.warnings.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              )}
            </button>
          </nav>

          {/* Zone 3: Actions, Currency Switcher ($ / ₹ / k), & Theme */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Currency & Unit Formatter ($ Dollars, ₹ Rupees, 'k' Thousands) */}
            <div className={`flex items-center p-0.5 rounded-lg border text-xs font-medium ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
            }`}>
              {/* Dollars ($) Button */}
              <button
                type="button"
                onClick={() => setCurrency('USD')}
                title="Format in US Dollars ($)"
                className={`px-2 py-1 rounded font-semibold transition-colors flex items-center gap-1 ${
                  currency === 'USD'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <span>$ USD</span>
              </button>

              {/* Rupees (₹) Button */}
              <button
                type="button"
                onClick={() => setCurrency('INR')}
                title="Format in Indian Rupees (₹)"
                className={`px-2 py-1 rounded font-semibold transition-colors flex items-center gap-1 ${
                  currency === 'INR'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'opacity-70 hover:opacity-100'
                }`}
              >
                <span>₹ INR</span>
              </button>

              {/* 'k' Compact Notation Toggle */}
              <button
                type="button"
                onClick={toggleUseKFormat}
                title={useKFormat ? "Disable 'k' abbreviation and display full numbers" : "Enable 'k' thousands abbreviation (e.g. $12.5k / ₹12.5k)"}
                className={`px-2 py-1 rounded font-mono font-bold transition-colors ml-0.5 border ${
                  useKFormat
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                    : isDark
                    ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    : 'bg-white text-slate-500 border-slate-200 hover:text-slate-900'
                }`}
              >
                <span>k</span>
              </button>
            </div>

            {/* Dark / Light Theme Mode Toggle */}
            <div className={`flex items-center p-0.5 rounded-lg border text-xs font-medium ${
              isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
            }`}>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                title="Dark Mode"
                className={`p-1.5 rounded transition-colors ${
                  isDark ? 'bg-blue-600 text-white shadow-xs' : 'opacity-60 hover:opacity-100'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setTheme('light')}
                title="Light Mode"
                className={`p-1.5 rounded transition-colors ${
                  !isDark ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'opacity-60 hover:opacity-100'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              </button>
            </div>

            {/* Real-time Streaming Toggle */}
            <button
              onClick={onToggleStreaming}
              title={isStreaming ? 'Pause real-time data stream' : 'Start live real-time simulation'}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                isStreaming
                  ? isDark
                    ? 'bg-emerald-950/60 border-emerald-700/80 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {isStreaming ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <Pause className="w-3 h-3 text-emerald-500" />
                  <span className="font-mono tabular-nums text-[11px] hidden sm:inline">LIVE ({streamTickCount})</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-slate-400" />
                  <span className="hidden sm:inline">Live Mode</span>
                </>
              )}
            </button>

            {/* Sample Datasets quick selector */}
            <button
              onClick={onOpenSamples}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                isDark
                  ? 'border-slate-700 text-slate-300 bg-slate-800/80 hover:bg-slate-700'
                  : 'border-slate-300 text-slate-700 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
              <span>Sample Data</span>
            </button>

            {/* Upload Button */}
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Data</span>
            </button>

          </div>
        </div>
      </div>
    </header>
  );
};
