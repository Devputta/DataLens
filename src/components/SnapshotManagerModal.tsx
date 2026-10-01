import React, { useState } from 'react';
import {
  Bookmark,
  BookmarkPlus,
  BookmarkCheck,
  Check,
  Trash2,
  X,
  Sparkles,
  LayoutGrid,
  Maximize2,
  RotateCcw,
  Clock,
  EyeOff,
  Layers,
} from 'lucide-react';
import { DashboardLayoutSnapshot } from '../types/analytics';
import { useTheme } from '../context/ThemeContext';

interface SnapshotManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshots: DashboardLayoutSnapshot[];
  activeSnapshotId: string | null;
  onSaveSnapshot: (name: string) => void;
  onApplySnapshot: (snapshot: DashboardLayoutSnapshot) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
  onResetToDefault: () => void;
  currentChartCount: number;
  currentHiddenCount: number;
  currentFullWidthCount: number;
}

export const SnapshotManagerModal: React.FC<SnapshotManagerModalProps> = ({
  isOpen,
  onClose,
  snapshots,
  activeSnapshotId,
  onSaveSnapshot,
  onApplySnapshot,
  onDeleteSnapshot,
  onResetToDefault,
  currentChartCount,
  currentHiddenCount,
  currentFullWidthCount,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [snapshotName, setSnapshotName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = snapshotName.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a name for your snapshot');
      return;
    }
    onSaveSnapshot(trimmed);
    setSnapshotName('');
    setErrorMsg('');
  };

  const nameSuggestions = [
    'Executive Board View',
    'Financial & Revenue Deep-Dive',
    'Operations & Trends Grid',
    'Compact Performance Matrix',
    'Regional Geographic Focus',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in no-print">
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all ${
          isDark
            ? 'bg-slate-900 border-slate-700/80 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between shrink-0 ${
            isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Dashboard Layout Snapshots</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Save and recall customized chart orders, visibility, and card width arrangements
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition-colors ${
              isDark
                ? 'border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                : 'border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Section 1: Save Current Layout */}
          <div
            className={`p-4 rounded-xl border ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1.5">
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Save Current Dashboard Layout</span>
              </span>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className={`px-2 py-0.5 rounded-md border ${
                  isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                }`}>
                  {currentChartCount} {currentChartCount === 1 ? 'chart' : 'charts'}
                </span>
                {currentHiddenCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md border bg-amber-500/10 border-amber-500/30 text-amber-500">
                    {currentHiddenCount} hidden
                  </span>
                )}
                {currentFullWidthCount > 0 && (
                  <span className="px-2 py-0.5 rounded-md border bg-indigo-500/10 border-indigo-500/30 text-indigo-500">
                    {currentFullWidthCount} full-width
                  </span>
                )}
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={snapshotName}
                  onChange={(e) => {
                    setSnapshotName(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Enter snapshot name (e.g., Executive Board View)..."
                  className={`flex-1 rounded-xl px-3.5 py-2 text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-colors ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
                  }`}
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm flex items-center justify-center gap-1.5 shrink-0 transition-colors"
                >
                  <BookmarkCheck className="w-4 h-4" />
                  <span>Save Snapshot</span>
                </button>
              </div>

              {errorMsg && <p className="text-xs text-rose-500 font-medium">{errorMsg}</p>}

              {/* Quick suggestion chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Suggestions:
                </span>
                {nameSuggestions.map((sug, idx) => (
                  <button
                    key={`sug-${sug}-${idx}`}
                    type="button"
                    onClick={() => {
                      setSnapshotName(sug);
                      if (errorMsg) setErrorMsg('');
                    }}
                    className={`text-[11px] px-2 py-0.5 rounded-lg border transition-colors ${
                      isDark
                        ? 'border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300'
                    }`}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </form>
          </div>

          {/* Section 2: Saved Snapshots List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Saved Snapshots ({snapshots.length})
              </h3>
              <button
                type="button"
                onClick={onResetToDefault}
                className={`text-xs flex items-center gap-1 hover:underline ${
                  isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Default Layout</span>
              </button>
            </div>

            {snapshots.length === 0 ? (
              <div
                className={`p-6 rounded-xl border text-center ${
                  isDark ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-30 text-blue-500" />
                <p className="text-xs font-semibold">No saved layout snapshots yet</p>
                <p className="text-[11px] mt-0.5 opacity-80">
                  Arrange your charts in the dashboard, adjust widths, and click "Save Snapshot" above to recall them anytime.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {snapshots.map((snap) => {
                  const isActive = activeSnapshotId === snap.id;
                  const dateStr = new Date(snap.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={snap.id}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                        isActive
                          ? isDark
                            ? 'bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/20'
                            : 'bg-blue-50 border-blue-300 ring-1 ring-blue-400/20'
                          : isDark
                          ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                            {snap.name}
                          </span>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-500 text-white">
                              <Check className="w-2.5 h-2.5" />
                              Active
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 opacity-70" />
                            {dateStr}
                          </span>
                          <span>·</span>
                          <span>
                            {snap.chartOrder.length > 0 ? snap.chartOrder.length : currentChartCount} charts
                          </span>
                          {snap.hiddenChartIds.length > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-amber-500">
                                {snap.hiddenChartIds.length} hidden
                              </span>
                            </>
                          )}
                          {Object.keys(snap.chartWidthOverrides || {}).length > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-indigo-400">
                                {Object.values(snap.chartWidthOverrides).filter((w) => w === 'full').length} full-width
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            onApplySnapshot(snap);
                            onClose();
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-blue-600 text-white hover:bg-blue-500'
                              : isDark
                              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                          }`}
                        >
                          <BookmarkCheck className="w-3.5 h-3.5" />
                          <span>{isActive ? 'Re-Apply' : 'Recall Layout'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteSnapshot(snap.id)}
                          title="Delete snapshot"
                          className={`p-1.5 rounded-lg border transition-colors ${
                            isDark
                              ? 'border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 hover:bg-rose-500/10'
                              : 'border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50'
                          }`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 3: Built-in Quick Presets */}
          <div className="pt-2 border-t border-inherit">
            <h4 className={`text-xs font-bold uppercase tracking-wider mb-2.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Standard Layout Presets
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onResetToDefault();
                  onClose();
                }}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  isDark ? 'border-slate-800 hover:bg-slate-800/60' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5 text-blue-500">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Default Flow</span>
                </div>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Restore original visual hierarchy and unhide all visuals.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  // Apply compact preset (all half-width)
                  const halfOverrides: Record<string, 'half'> = {};
                  snapshots.forEach((s) => s.chartOrder.forEach((id) => (halfOverrides[id] = 'half')));
                  onApplySnapshot({
                    id: 'preset_compact',
                    name: 'High-Density 2-Column Matrix',
                    createdAt: new Date().toISOString(),
                    chartOrder: [],
                    hiddenChartIds: [],
                    chartWidthOverrides: halfOverrides,
                  });
                  onClose();
                }}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  isDark ? 'border-slate-800 hover:bg-slate-800/60' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5 text-emerald-500">
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>High-Density Matrix</span>
                </div>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Equal half-width two-column grid for dense executive scanning.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  // Apply full-width showcase preset
                  const fullOverrides: Record<string, 'full'> = {};
                  snapshots.forEach((s) => s.chartOrder.forEach((id) => (fullOverrides[id] = 'full')));
                  onApplySnapshot({
                    id: 'preset_full',
                    name: 'Full-Width Showcase',
                    createdAt: new Date().toISOString(),
                    chartOrder: [],
                    hiddenChartIds: [],
                    chartWidthOverrides: fullOverrides,
                  });
                  onClose();
                }}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  isDark ? 'border-slate-800 hover:bg-slate-800/60' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5 text-indigo-500">
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Full-Width Showcase</span>
                </div>
                <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Expand visuals to maximum horizontal width for detailed presentations.
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`px-6 py-3 border-t flex items-center justify-between shrink-0 text-xs ${
            isDark ? 'border-slate-800 bg-slate-950/40 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-600'
          }`}
        >
          <span>Layout snapshots persist in your browser session storage.</span>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 rounded-lg border font-semibold transition-colors ${
              isDark
                ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
                : 'border-slate-300 bg-white hover:bg-slate-100 text-slate-800 shadow-2xs'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
