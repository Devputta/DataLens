import React, { useEffect } from 'react';
import {
  CheckCircle2,
  X,
  FileSpreadsheet,
  FileText,
  Download,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export interface ExportSuccessDetails {
  title?: string;
  filename: string;
  format: 'xlsx' | 'pbit' | 'pdf' | 'csv' | 'md' | 'png' | 'print';
  description: string;
  highlights?: string[];
}

interface ExportSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  details: ExportSuccessDetails | null;
}

export const ExportSuccessModal: React.FC<ExportSuccessModalProps> = ({
  isOpen,
  onClose,
  details,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !details) return null;

  const getFormatBadge = () => {
    switch (details.format) {
      case 'xlsx':
        return {
          icon: FileSpreadsheet,
          label: 'Excel Workbook (.xlsx)',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
        };
      case 'pbit':
        return {
          icon: Download,
          label: 'Power BI Template (.pbit)',
          badgeColor: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
          iconColor: 'text-amber-600 dark:text-amber-400',
          iconBg: 'bg-amber-100 dark:bg-amber-900/50',
        };
      case 'pdf':
        return {
          icon: FileText,
          label: 'PDF Document (.pdf)',
          badgeColor: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
          iconColor: 'text-red-600 dark:text-red-400',
          iconBg: 'bg-red-100 dark:bg-red-900/50',
        };
      case 'csv':
        return {
          icon: FileSpreadsheet,
          label: 'CSV Dataset (.csv)',
          badgeColor: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
          iconColor: 'text-slate-600 dark:text-slate-400',
          iconBg: 'bg-slate-100 dark:bg-slate-800',
        };
      case 'png':
        return {
          icon: ImageIcon,
          label: 'Image Snapshot (.png)',
          badgeColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800',
          iconColor: 'text-purple-600 dark:text-purple-400',
          iconBg: 'bg-purple-100 dark:bg-purple-900/50',
        };
      case 'md':
      default:
        return {
          icon: FileText,
          label: 'Markdown Report (.md)',
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
          iconColor: 'text-blue-600 dark:text-blue-400',
          iconBg: 'bg-blue-100 dark:bg-blue-900/50',
        };
    }
  };

  const badgeInfo = getFormatBadge();
  const FormatIcon = badgeInfo.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in no-print"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Normal Dialog Header */}
        <div
          className={`px-5 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-slate-800 bg-slate-950/30' : 'border-slate-100 bg-slate-50/70'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                {details.title || 'Download Complete'}
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                File is ready in your browser
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
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Normal Dialog Content */}
        <div className="p-5 space-y-4">
          {/* File Card Box */}
          <div
            className={`p-3.5 rounded-xl border flex items-start gap-3 ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${badgeInfo.iconBg}`}>
              <FormatIcon className={`w-5 h-5 ${badgeInfo.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold truncate" title={details.filename}>
                  {details.filename}
                </span>
              </div>
              <span className={`inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-md border ${badgeInfo.badgeColor}`}>
                {badgeInfo.label}
              </span>
            </div>
          </div>

          {/* Description text */}
          <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {details.description}
          </p>

          {/* Highlights checklist if provided */}
          {details.highlights && details.highlights.length > 0 && (
            <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
              isDark ? 'bg-slate-950/40 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                Included in this file:
              </div>
              {details.highlights.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* Download location note */}
          <div className={`text-[11px] px-3 py-2 rounded-lg border ${
            isDark ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-slate-100/70 border-slate-200 text-slate-500'
          }`}>
            Saved to your device's default <strong>Downloads</strong> folder.
          </div>
        </div>

        {/* Normal Dialog Footer */}
        <div
          className={`px-5 py-3.5 border-t flex items-center justify-end gap-2 ${
            isDark ? 'border-slate-800 bg-slate-950/30' : 'border-slate-100 bg-slate-50/70'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer shadow-xs"
          >
            OK, Got it
          </button>
        </div>
      </div>
    </div>
  );
};
