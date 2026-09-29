import React, { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, AlertCircle, Check, Loader2, ArrowRight } from 'lucide-react';
import { parseFile, ParsedWorkbook } from '../utils/fileParser';
import { profileDataset } from '../utils/dataProfiler';
import { Dataset } from '../types/analytics';
import { SAMPLE_DATASETS } from '../utils/sampleData';
import { useTheme } from '../context/ThemeContext';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetLoaded: (dataset: Dataset) => void;
  initialTab?: 'upload' | 'samples';
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onDatasetLoaded,
  initialTab = 'upload',
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'upload' | 'samples'>(initialTab);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedWorkbook, setParsedWorkbook] = useState<ParsedWorkbook | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    setErrorMessage(null);
    setIsProcessing(true);
    try {
      const workbook = await parseFile(file);
      setParsedWorkbook(workbook);
      setSelectedSheet(workbook.sheetNames[0]);
      
      // If single sheet, load immediately
      if (workbook.sheetNames.length === 1) {
        const records = workbook.sheets[workbook.sheetNames[0]];
        const profiled = profileDataset(workbook.filename, workbook.sheetNames, workbook.sheetNames[0], records);
        onDatasetLoaded(profiled);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while parsing the file. Please verify file formatting.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleConfirmSheet = () => {
    if (!parsedWorkbook || !selectedSheet) return;
    const records = parsedWorkbook.sheets[selectedSheet] || [];
    const profiled = profileDataset(parsedWorkbook.filename, parsedWorkbook.sheetNames, selectedSheet, records);
    onDatasetLoaded(profiled);
    onClose();
  };

  const handleSelectSample = (sampleId: string) => {
    const sample = SAMPLE_DATASETS.find((s) => s.id === sampleId);
    if (sample) {
      const dataset = sample.generateData();
      onDatasetLoaded(dataset);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 no-print">
      <div className={`border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}>
          <div>
            <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>Import Dataset into DataLens</h2>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Upload your own Excel or CSV file, or select a pre-configured sample dataset.
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selection */}
        <div className={`flex border-b px-6 ${
          isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
        }`}>
          <button
            onClick={() => { setActiveTab('upload'); setErrorMessage(null); }}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-blue-600 text-blue-600'
                : isDark
                ? 'border-transparent text-slate-400 hover:text-slate-200'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Upload File (.xlsx, .xls, .csv)
          </button>
          <button
            onClick={() => { setActiveTab('samples'); setErrorMessage(null); }}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'samples'
                ? 'border-blue-600 text-blue-600'
                : isDark
                ? 'border-transparent text-slate-400 hover:text-slate-200'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Ready-to-Use Sample Datasets
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className={`p-3.5 rounded-lg flex items-start gap-3 text-xs border ${
              isDark ? 'bg-rose-950/40 border-rose-800/80 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div>
                <p className="font-semibold">Unable to process file</p>
                <p className="mt-0.5 opacity-90">{errorMessage}</p>
                <p className="mt-1 text-[11px] opacity-75">
                  Ensure the spreadsheet contains a top header row and tabular data without password encryption.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'upload' ? (
            <div>
              {!parsedWorkbook ? (
                <div>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                      isDragging
                        ? 'border-blue-500 bg-blue-500/10'
                        : isDark
                        ? 'border-slate-700 bg-slate-950/40 hover:border-slate-600 hover:bg-slate-900/60'
                        : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/30'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />

                    {isProcessing ? (
                      <div className="flex flex-col items-center justify-center py-4">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                        <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>Parsing and profiling dataset...</p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Detecting data types, dates, and dimensions</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 text-blue-500 ${
                          isDark ? 'bg-slate-800' : 'bg-blue-50'
                        }`}>
                          <Upload className="w-6 h-6" />
                        </div>
                        <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          Click to browse or drop file here
                        </p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Supported formats: Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
                        </p>
                        <div className={`mt-4 flex items-center gap-2 text-[11px] font-mono ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          <span>Max 25MB</span>
                          <span>·</span>
                          <span>Client-side parsing</span>
                          <span>·</span>
                          <span>Strict privacy</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Multi-sheet chooser */
                <div className="space-y-4">
                  <div className={`p-4 border rounded-lg ${
                    isDark ? 'bg-slate-800/60 border-slate-700/80' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <p className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>File Analyzed:</p>
                    <p className={`text-sm font-mono mt-0.5 truncate font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{parsedWorkbook.filename}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Found {parsedWorkbook.sheetNames.length} sheet{parsedWorkbook.sheetNames.length > 1 ? 's' : ''}. Select the sheet you want to visualize:
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Active Sheet</label>
                    <select
                      value={selectedSheet}
                      onChange={(e) => setSelectedSheet(e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-hidden focus:border-blue-500 ${
                        isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      {parsedWorkbook.sheetNames.map((name) => (
                        <option key={name} value={name}>
                          {name} ({parsedWorkbook.sheets[name]?.length || 0} rows)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setParsedWorkbook(null)}
                      className={`px-3 py-1.5 text-xs transition-colors ${
                        isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Choose different file
                    </button>
                    <button
                      onClick={handleConfirmSheet}
                      className="px-4 py-2 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <span>Generate Dashboard</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Sample datasets */
            <div className="space-y-3">
              {SAMPLE_DATASETS.map((sample) => (
                <div
                  key={sample.id}
                  onClick={() => handleSelectSample(sample.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all group ${
                    isDark
                      ? 'bg-slate-950/60 border-slate-800 hover:border-blue-500/80 hover:bg-slate-800/60'
                      : 'bg-white border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className={`text-sm font-semibold transition-colors ${
                        isDark ? 'text-white group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-600'
                      }`}>
                        {sample.name}
                      </h4>
                      <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {sample.description}
                      </p>
                      <div className={`mt-2.5 flex items-center gap-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        <span className={`font-mono tabular-nums font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{sample.recordsCount} rows</span>
                        <span>·</span>
                        {sample.tags.map((t, idx) => (
                          <span key={t}>
                            {idx > 0 && <span className="mr-2">·</span>}
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                      isDark ? 'bg-slate-800 group-hover:bg-blue-600 text-slate-300 group-hover:text-white' : 'bg-slate-100 group-hover:bg-blue-600 text-slate-700 group-hover:text-white'
                    }`}>
                      Load Dataset
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`px-6 py-3 border-t flex justify-between items-center text-xs ${
          isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
        }`}>
          <span>Open-source client analytics · No accounts, no profiling, 100% local in-browser execution</span>
          <button
            onClick={onClose}
            className={`px-3 py-1.5 text-xs transition-colors ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};
