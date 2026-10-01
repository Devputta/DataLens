import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Download, Eye, EyeOff, Search, ArrowUpDown, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { ColumnProfile } from '../types/analytics';
import { downloadCsv } from '../utils/exportUtils';
import { formatMetric } from '../utils/visualizationEngine';
import { useTheme } from '../context/ThemeContext';

interface DataTableProps {
  records: Record<string, any>[];
  columns: ColumnProfile[];
  datasetName: string;
}

export const DataTable: React.FC<DataTableProps> = ({
  records,
  columns,
  datasetName,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [visibleColNames, setVisibleColNames] = useState<string[]>(
    columns.map((c) => c.name)
  );
  const [showColPicker, setShowColPicker] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Column search filter
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase().trim();
    return records.filter((r) =>
      Object.values(r).some((val) => val !== null && val !== undefined && String(val).toLowerCase().includes(q))
    );
  }, [records, search]);

  // Sorting
  const sortedRecords = useMemo(() => {
    if (!sortCol) return filteredRecords;
    const colProfile = columns.find((c) => c.name === sortCol);
    const isNum = colProfile?.type === 'numeric';

    return [...filteredRecords].sort((a, b) => {
      const valA = a[sortCol];
      const valB = b[sortCol];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (isNum) {
        return sortDir === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDir === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [filteredRecords, sortCol, sortDir, columns]);

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, currentPage, pageSize]);

  const handleSort = (colName: string) => {
    if (sortCol === colName) {
      if (sortDir === 'asc') setSortDir('desc');
      else {
        setSortCol(null);
        setSortDir('asc');
      }
    } else {
      setSortCol(colName);
      setSortDir('asc');
    }
  };

  const toggleColumnVisibility = (colName: string) => {
    if (visibleColNames.includes(colName)) {
      if (visibleColNames.length > 1) {
        setVisibleColNames(visibleColNames.filter((c) => c !== colName));
      }
    } else {
      setVisibleColNames([...visibleColNames, colName]);
    }
  };

  const handleExportFilteredCsv = () => {
    setIsExporting(true);
    // Export only the visible columns for the currently filtered/sorted records
    const recordsToExport = sortedRecords.map((row) => {
      const filteredRow: Record<string, any> = {};
      for (const colName of visibleColNames) {
        filteredRow[colName] = row[colName];
      }
      return filteredRow;
    });

    const safeBaseName = datasetName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadCsv(recordsToExport, `${safeBaseName}_filtered_${timestamp}.csv`);
    
    setTimeout(() => {
      setIsExporting(false);
    }, 1200);
  };

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${
      isDark ? 'bg-slate-900 border-slate-800 shadow-sm' : 'bg-white border-slate-200 shadow-xs'
    }`}>
      {/* Table Toolbar */}
      <div className={`p-4 border-b flex flex-wrap items-center justify-between gap-3 ${
        isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
      }`}>
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filter displayed table rows..."
              className={`w-full rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 border ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder-slate-500'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Column Toggle Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowColPicker(!showColPicker)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>Columns ({visibleColNames.length}/{columns.length})</span>
            </button>

            {showColPicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowColPicker(false)} />
                <div className={`absolute right-0 mt-1.5 z-50 w-56 rounded-xl shadow-xl p-2 max-h-64 overflow-y-auto border ${
                  isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
                }`}>
                  <div className={`px-2 py-1 text-[11px] font-semibold uppercase tracking-wider ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    Toggle Column Visibility
                  </div>
                  {columns.map((c) => {
                    const isVisible = visibleColNames.includes(c.name);
                    return (
                      <div
                        key={c.name}
                        onClick={() => toggleColumnVisibility(c.name)}
                        className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-xs ${
                          isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <span className="truncate pr-2">{c.name}</span>
                        {isVisible ? (
                          <Eye className="w-3.5 h-3.5 text-blue-500" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Export Filtered CSV button */}
          <button
            onClick={handleExportFilteredCsv}
            disabled={isExporting || sortedRecords.length === 0}
            title={`Export ${sortedRecords.length.toLocaleString()} filtered records to CSV`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isExporting
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {isExporting ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-white" />
                <span>Download as CSV ({sortedRecords.length.toLocaleString()})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* High-Density Data Grid */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className={`w-full text-left text-xs border-collapse ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          <thead className={`uppercase font-mono tracking-wider sticky top-0 z-10 border-b ${
            isDark ? 'bg-slate-950 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}>
            <tr>
              <th className="py-2.5 px-4 w-12 font-normal">#</th>
              {columns
                .filter((col) => visibleColNames.includes(col.name))
                .map((col) => {
                  const isSorted = sortCol === col.name;
                  const isRight = col.type === 'numeric';

                  return (
                    <th
                      key={col.name}
                      onClick={() => handleSort(col.name)}
                      className={`py-2.5 px-4 font-semibold cursor-pointer select-none transition-colors ${
                        isDark ? 'hover:text-white' : 'hover:text-slate-900'
                      } ${isRight ? 'text-right' : 'text-left'}`}
                    >
                      <div className={`flex items-center gap-1.5 ${isRight ? 'justify-end' : 'justify-start'}`}>
                        <span>{col.name}</span>
                        {isSorted ? (
                          sortDir === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100 shrink-0" />
                        )}
                      </div>
                    </th>
                  );
                })}
            </tr>
          </thead>
          <tbody className={`divide-y font-sans ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
            {paginatedRecords.length > 0 ? (
              paginatedRecords.map((row, rowIdx) => {
                const globalRowIdx = (currentPage - 1) * pageSize + rowIdx + 1;
                return (
                  <tr
                    key={`row-${currentPage}-${globalRowIdx}-${rowIdx}`}
                    className={`transition-colors ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}
                  >
                    <td className={`py-2.5 px-4 font-mono text-[11px] tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                      {globalRowIdx}
                    </td>
                    {columns
                      .filter((col) => visibleColNames.includes(col.name))
                      .map((col) => {
                        const val = row[col.name];
                        const isRight = col.type === 'numeric';

                        let displayVal: React.ReactNode = '—';
                        if (val !== null && val !== undefined) {
                          if (col.type === 'numeric' && typeof val === 'number') {
                            displayVal = (
                              <span className="font-mono tabular-nums font-medium">
                                {formatMetric(val, 'number')}
                              </span>
                            );
                          } else if (col.type === 'boolean') {
                            displayVal = val ? (
                              <span className="text-emerald-500 font-mono">true</span>
                            ) : (
                              <span className="text-slate-400 font-mono">false</span>
                            );
                          } else if (col.type === 'date') {
                            displayVal = <span className="font-mono">{String(val)}</span>;
                          } else {
                            displayVal = <span className="truncate">{String(val)}</span>;
                          }
                        }

                        return (
                          <td
                            key={col.name}
                            className={`py-2.5 px-4 ${isRight ? 'text-right' : 'text-left'}`}
                          >
                            {displayVal}
                          </td>
                        );
                      })}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={visibleColNames.length + 1}
                  className={`py-12 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
                >
                  No matching records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className={`p-3.5 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
        isDark ? 'border-slate-800 bg-slate-950/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
      }`}>
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className={`border rounded px-2 py-1 focus:outline-none ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
            }`}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="ml-2 font-mono tabular-nums">
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, sortedRecords.length)} of {sortedRecords.length.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`p-1 rounded border disabled:opacity-40 disabled:cursor-not-allowed ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono tabular-nums px-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className={`p-1 rounded border disabled:opacity-40 disabled:cursor-not-allowed ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:text-slate-900'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
