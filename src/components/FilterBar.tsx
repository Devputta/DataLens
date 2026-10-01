import React, { useState } from 'react';
import { Search, RotateCcw, Calendar, SlidersHorizontal, ChevronDown, Check, X, FileSpreadsheet } from 'lucide-react';
import { ColumnProfile, Dataset, FilterState } from '../types/analytics';
import { useTheme } from '../context/ThemeContext';

interface FilterBarProps {
  dataset: Dataset;
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onResetFilters: () => void;
  filteredCount: number;
  totalCount: number;
  onSheetChange?: (sheetName: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  dataset,
  filters,
  onFilterChange,
  onResetFilters,
  filteredCount,
  totalCount,
  onSheetChange,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const { columns, sheetNames, activeSheet } = dataset;
  const dateCol = columns.find((c) => c.type === 'date');
  const categoryCols = columns.filter((c) => c.type === 'category' && c.uniqueCount >= 2 && c.uniqueCount <= 20).slice(0, 3);

  // Calculate active filter count
  let activeFilterCount = 0;
  if (filters.searchQuery.trim() !== '') activeFilterCount++;
  if (filters.dateRange.start || filters.dateRange.end) activeFilterCount++;
  for (const list of Object.values(filters.categories)) {
    if (list.length > 0) activeFilterCount += list.length;
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({
      ...filters,
      searchQuery: e.target.value,
    });
  };

  const handleCategoryToggle = (columnName: string, value: string) => {
    const current = filters.categories[columnName] || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    onFilterChange({
      ...filters,
      categories: {
        ...filters.categories,
        [columnName]: updated,
      },
    });
  };

  const handleDatePreset = (preset: 'all' | '7d' | '30d') => {
    if (!dateCol || !dateCol.maxDate) return;
    
    if (preset === 'all') {
      onFilterChange({
        ...filters,
        dateRange: { column: dateCol.name, start: null, end: null },
      });
      return;
    }

    const maxD = new Date(dateCol.maxDate);
    const startD = new Date(maxD);
    if (preset === '7d') startD.setDate(maxD.getDate() - 7);
    if (preset === '30d') startD.setDate(maxD.getDate() - 30);

    onFilterChange({
      ...filters,
      dateRange: {
        column: dateCol.name,
        start: startD.toISOString().split('T')[0],
        end: dateCol.maxDate,
      },
    });
  };

  return (
    <div className={`border-b px-4 sm:px-6 lg:px-8 py-3 transition-colors no-print ${
      isDark
        ? 'bg-slate-900 border-slate-800'
        : 'bg-white border-slate-200 shadow-2xs'
    }`}>
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Left side: Search & Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          
          {/* Active Dataset File Context Badge */}
          <div className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono ${
            isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
          }`} title={`Loaded File: ${dataset.name}`}>
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate max-w-[160px]">{dataset.name}</span>
          </div>

          {/* Multi-sheet selector if more than 1 sheet exists */}
          {sheetNames.length > 1 && onSheetChange && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs ${
              isDark ? 'bg-slate-950 border-slate-700/80' : 'bg-slate-100 border-slate-300'
            }`}>
              <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>Sheet:</span>
              <select
                value={activeSheet}
                onChange={(e) => onSheetChange(e.target.value)}
                className={`bg-transparent font-medium focus:outline-none cursor-pointer ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                {sheetNames.map((s) => (
                  <option key={s} value={s} className={isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Search Input */}
          <div className="relative min-w-[180px] max-w-xs flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={handleSearchChange}
              placeholder="Search across records..."
              className={`w-full rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 transition-colors border ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
            {filters.searchQuery && (
              <button
                onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
                className={`absolute right-2 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Dynamic Categorical Filters */}
          {categoryCols.map((col) => {
            const selectedList = filters.categories[col.name] || [];
            const isMenuOpen = openDropdown === col.name;

            return (
              <div key={col.name} className="relative">
                <button
                  onClick={() => setOpenDropdown(isMenuOpen ? null : col.name)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    selectedList.length > 0
                      ? isDark
                        ? 'bg-blue-950/60 border-blue-600 text-blue-200 font-medium'
                        : 'bg-blue-50 border-blue-400 text-blue-800 font-medium'
                      : isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      : 'bg-slate-50 border-slate-300 text-slate-700 hover:border-slate-400'
                  }`}
                >
                  <span className="truncate max-w-[120px]">{col.name}</span>
                  {selectedList.length > 0 && (
                    <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded text-[10px] font-mono">
                      {selectedList.length}
                    </span>
                  )}
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {isMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setOpenDropdown(null)}
                    />
                    <div className={`absolute left-0 mt-1.5 z-50 w-52 rounded-xl shadow-xl py-1 text-xs max-h-60 overflow-y-auto border ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
                    }`}>
                      <div className={`px-3 py-1.5 border-b flex justify-between items-center ${
                        isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
                      }`}>
                        <span className="font-semibold">{col.name}</span>
                        {selectedList.length > 0 && (
                          <button
                            onClick={() =>
                              onFilterChange({
                                ...filters,
                                categories: { ...filters.categories, [col.name]: [] },
                              })
                            }
                            className="text-[11px] text-blue-500 hover:underline font-medium"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      {col.topCategories?.map((cat, catIdx) => {
                        const isChecked = selectedList.includes(cat.value);
                        return (
                          <div
                            key={`filter-${col.name}-${cat.value}-${catIdx}`}
                            onClick={() => handleCategoryToggle(col.name, cat.value)}
                            className={`flex items-center justify-between px-3 py-1.5 cursor-pointer transition-colors ${
                              isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <span className="truncate pr-2">{cat.value}</span>
                            <div className={`flex items-center gap-2 font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              <span>{cat.count}</span>
                              <div
                                className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                                  isChecked
                                    ? 'bg-blue-600 border-blue-500 text-white'
                                    : isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isChecked && <Check className="w-2.5 h-2.5" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}

          {/* Date Range quick buttons if date column exists */}
          {dateCol && (
            <div className={`flex items-center p-0.5 rounded-lg border text-xs ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
            }`}>
              <button
                onClick={() => handleDatePreset('all')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  !filters.dateRange.start && !filters.dateRange.end
                    ? isDark ? 'bg-slate-800 text-white font-medium' : 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => handleDatePreset('30d')}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  filters.dateRange.start
                    ? isDark ? 'bg-slate-800 text-white font-medium' : 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Last 30D
              </button>
            </div>
          )}

        </div>

        {/* Right side: Reset Filters */}
        <div className={`flex flex-wrap items-center gap-2.5 shrink-0 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          {activeFilterCount > 0 && (
            <button
              onClick={onResetFilters}
              className={`flex items-center gap-1 px-2.5 py-1 rounded border transition-colors ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-300'
              }`}
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>Reset ({activeFilterCount})</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

