'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileText,
  Table,
  Download,
  Search,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  RotateCw,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { DocumentItem, SpreadsheetSheet } from '../types';
import { api } from '../services/api';

interface DocumentViewerModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  isOpen,
  onClose,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Spreadsheet viewer state
  const [sheets, setSheets] = useState<SpreadsheetSheet[]>([]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    if (!isOpen || !document) {
      setSheets([]);
      setSearchQuery('');
      setCurrentPage(1);
      setError(null);
      return;
    }

    const fileType = document.file_type.toLowerCase();

    if (fileType !== 'pdf') {
      // Excel or CSV: fetch structured data for interactive table viewer
      setLoading(true);
      setError(null);

      api.viewSpreadsheetDocument(document.id)
        .then((res) => {
          if (res.data?.sheets && res.data.sheets.length > 0) {
            setSheets(res.data.sheets);
            setActiveSheetIndex(0);
          } else {
            setError('The spreadsheet contains no readable worksheets or records.');
          }
        })
        .catch((err) => {
          setError(err.message || 'Failed to load spreadsheet content.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, document]);

  const activeSheet = sheets[activeSheetIndex] || null;

  // Filter spreadsheet rows based on search query
  const filteredRows = useMemo(() => {
    if (!activeSheet || !activeSheet.rows) return [];
    if (!searchQuery.trim()) return activeSheet.rows;

    const q = searchQuery.toLowerCase();
    return activeSheet.rows.filter((row) =>
      row.some((cell) => cell.toLowerCase().includes(q))
    );
  }, [activeSheet, searchQuery]);

  // Paginate filtered rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;

  if (!isOpen || !document) return null;

  const isPdf = document.file_type.toLowerCase() === 'pdf';
  const fileUrl = api.getDocumentFileUrl(document.id);
  const downloadUrl = api.getDocumentDownloadUrl(document.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`bg-white rounded-2xl shadow-2xl border border-[#e8ded1] flex flex-col transition-all duration-300 overflow-hidden ${
          isFullscreen
            ? 'w-full h-full rounded-none'
            : 'w-full max-w-6xl h-[90vh]'
        }`}
      >
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-[#faf7f2] border-b border-[#e8ded1] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#0d3d24] text-[#f3a628] flex items-center justify-center shrink-0 shadow-sm">
              {isPdf ? (
                <FileText className="w-5 h-5" />
              ) : (
                <FileSpreadsheet className="w-5 h-5" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-[#0d3d24] text-base truncate">
                  {document.title}
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#0d3d24]/10 text-[#0d3d24] shrink-0 uppercase tracking-wider">
                  {document.file_type}
                </span>
              </div>
              <p className="text-xs text-[#5e6660] truncate">
                {document.original_filename} • {document.category}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Download Original File */}
            <a
              href={downloadUrl}
              download={document.original_filename}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#0d3d24] bg-white border border-[#e8ded1] hover:bg-[#f4efe6] transition shadow-sm"
              title="Download original file"
            >
              <Download className="w-3.5 h-3.5 text-[#d48b14]" />
              <span className="hidden sm:inline">Download</span>
            </a>

            {/* Open in New Window (for PDF) */}
            {isPdf && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#0d3d24] bg-white border border-[#e8ded1] hover:bg-[#f4efe6] transition shadow-sm"
                title="Open PDF in new browser tab"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[#d48b14]" />
                <span className="hidden sm:inline">New Tab</span>
              </a>
            )}

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg text-[#5e6660] hover:text-[#0d3d24] hover:bg-[#f4efe6] transition"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#5e6660] hover:text-red-600 hover:bg-red-50 transition"
              title="Close viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Area */}
        <div className="flex-1 min-h-0 bg-white flex flex-col relative overflow-hidden">
          {/* PDF Viewer */}
          {isPdf ? (
            <div className="w-full h-full bg-[#525659] relative">
              <iframe
                src={`${fileUrl}#toolbar=1&navpanes=1`}
                className="w-full h-full border-0"
                title={document.title}
              />
            </div>
          ) : (
            /* Spreadsheet / Table Viewer */
            <div className="flex-1 flex flex-col min-h-0">
              {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                  <RotateCw className="w-8 h-8 text-[#0d3d24] animate-spin mb-3" />
                  <p className="text-sm font-medium text-[#0d3d24]">
                    Loading spreadsheet records...
                  </p>
                  <p className="text-xs text-[#5e6660] mt-1">
                    Parsing worksheet columns and rows
                  </p>
                </div>
              ) : error ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <AlertCircle className="w-10 h-10 text-amber-500 mb-3" />
                  <h4 className="text-base font-bold text-[#0d3d24] mb-1">
                    Unable to display spreadsheet
                  </h4>
                  <p className="text-sm text-[#5e6660] max-w-md mb-4">{error}</p>
                  <a
                    href={downloadUrl}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0d3d24] text-white text-xs font-semibold hover:bg-[#154d2e] transition"
                  >
                    <Download className="w-4 h-4" />
                    Download Original File Instead
                  </a>
                </div>
              ) : activeSheet ? (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Spreadsheet Toolbar (Sheet tabs, search, page stats) */}
                  <div className="px-5 py-3 bg-[#faf7f2]/60 border-b border-[#e8ded1] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
                    {/* Sheet Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                      {sheets.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setActiveSheetIndex(idx);
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition shrink-0 flex items-center gap-1.5 ${
                            activeSheetIndex === idx
                              ? 'bg-[#0d3d24] text-white shadow-sm'
                              : 'bg-white border border-[#e8ded1] text-[#5e6660] hover:text-[#0d3d24] hover:bg-[#f4efe6]'
                          }`}
                        >
                          <Table className="w-3.5 h-3.5" />
                          <span>{s.title}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                              activeSheetIndex === idx
                                ? 'bg-white/20 text-white'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {s.total_rows}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Search & Records Count */}
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="w-3.5 h-3.5 text-[#8c948e] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                          }}
                          placeholder="Search records in sheet..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#e8ded1] bg-white focus:outline-none focus:ring-1 focus:ring-[#0d3d24] text-[#1e2420]"
                        />
                      </div>

                      <span className="text-xs text-[#5e6660] shrink-0 font-medium">
                        {filteredRows.length} {filteredRows.length === 1 ? 'record' : 'records'}
                      </span>
                    </div>
                  </div>

                  {/* Table Grid Area */}
                  <div className="flex-1 min-h-0 overflow-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#f4efe6] sticky top-0 z-10 shadow-sm">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold text-[#0d3d24] border-b border-[#e8ded1] w-12 text-center">
                            #
                          </th>
                          {activeSheet.headers.map((h, hIdx) => (
                            <th
                              key={hIdx}
                              className="py-2.5 px-3 font-semibold text-[#0d3d24] border-b border-[#e8ded1] whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e8ded1]/60">
                        {paginatedRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={activeSheet.headers.length + 1}
                              className="py-12 text-center text-[#5e6660]"
                            >
                              No records match your search filter.
                            </td>
                          </tr>
                        ) : (
                          paginatedRows.map((row, rIdx) => {
                            const globalRowIndex =
                              (currentPage - 1) * pageSize + rIdx + 1;
                            return (
                              <tr
                                key={rIdx}
                                className="hover:bg-[#faf7f2] transition-colors"
                              >
                                <td className="py-2 px-3 text-center text-[#8c948e] font-mono text-[11px] bg-[#faf7f2]/30 border-r border-[#e8ded1]/40">
                                  {globalRowIndex}
                                </td>
                                {activeSheet.headers.map((_, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className="py-2 px-3 text-[#1e2420] max-w-xs truncate"
                                    title={row[cIdx] || ''}
                                  >
                                    {row[cIdx] || (
                                      <span className="text-gray-300 italic">
                                        —
                                      </span>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="px-5 py-2.5 bg-[#faf7f2] border-t border-[#e8ded1] flex items-center justify-between shrink-0 text-xs text-[#5e6660]">
                    <div className="flex items-center gap-2">
                      <span>Rows per page:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => {
                          setPageSize(Number(e.target.value));
                          setCurrentPage(1);
                        }}
                        className="bg-white border border-[#e8ded1] rounded px-2 py-0.5 text-xs text-[#1e2420] focus:outline-none"
                      >
                        <option value={15}>15</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span className="hidden sm:inline">
                        • Showing{' '}
                        {filteredRows.length === 0
                          ? 0
                          : (currentPage - 1) * pageSize + 1}{' '}
                        to{' '}
                        {Math.min(currentPage * pageSize, filteredRows.length)}{' '}
                        of {filteredRows.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="mr-2">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="p-1 rounded bg-white border border-[#e8ded1] hover:bg-[#f4efe6] disabled:opacity-40 disabled:cursor-not-allowed transition"
                        title="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage >= totalPages}
                        className="p-1 rounded bg-white border border-[#e8ded1] hover:bg-[#f4efe6] disabled:opacity-40 disabled:cursor-not-allowed transition"
                        title="Next page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
