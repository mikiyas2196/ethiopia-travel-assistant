'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  FileText,
  RotateCw,
  Trash2,
  Eye,
  Edit,
  AlertCircle,
  UploadCloud,
  CheckCircle2,
  Clock,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { DocumentItem } from '../types';
import { api } from '../services/api';

interface DocumentManagerProps {
  onOpenUpload: () => void;
  onViewDetails: (docId: number) => void;
  onViewFile: (doc: DocumentItem) => void;
  onEditDocument: (doc: DocumentItem) => void;
  isAuthenticated: boolean;
  currentUser?: import('../types').AdminUser | null;
  onOpenLogin: () => void;
}

export const DocumentManager: React.FC<DocumentManagerProps> = ({
  onOpenUpload,
  onViewDetails,
  onViewFile,
  onEditDocument,
  isAuthenticated,
  currentUser,
  onOpenLogin,
}) => {
  const isAdmin = currentUser?.is_admin || currentUser?.role === 'admin';
  const canAdd = isAdmin || currentUser?.can_add_documents;
  const canEdit = isAdmin || currentUser?.can_edit_documents || currentUser?.can_add_documents;
  const canDelete = isAdmin || currentUser?.can_delete_documents;
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchDocuments = async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.getDocuments({
        search: search.trim() || undefined,
        category: categoryFilter || undefined,
        file_type: fileTypeFilter || undefined,
        status: statusFilter || undefined,
        page: currentPage,
      });

      setDocuments(res.data);
      setTotalPages(res.meta.last_page);
      setTotalCount(res.meta.total);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [categoryFilter, fileTypeFilter, statusFilter, currentPage, isAuthenticated]);

  // Auto-refresh periodically when any document is processing in background
  useEffect(() => {
    const hasProcessing = documents.some(
      (d) => d.processing_status === 'pending' || d.processing_status === 'processing'
    );

    if (!hasProcessing) return;

    const timer = setInterval(() => {
      api.getDocuments({
        search: search.trim() || undefined,
        category: categoryFilter || undefined,
        file_type: fileTypeFilter || undefined,
        status: statusFilter || undefined,
        page: currentPage,
      }).then((res) => {
        setDocuments(res.data);
        setTotalPages(res.meta.last_page);
        setTotalCount(res.meta.total);
      }).catch(() => {});
    }, 3000);

    return () => clearInterval(timer);
  }, [documents, search, categoryFilter, fileTypeFilter, statusFilter, currentPage]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchDocuments();
  };

  const handleReprocess = async (id: number) => {
    setActionLoadingId(id);
    setError(null);
    setFeedback(null);
    try {
      const res = await api.reprocessDocument(id);
      setFeedback(res.message || 'Document reprocessed successfully.');
      fetchDocuments();
    } catch (err: any) {
      setError(err.message || 'Reprocessing failed.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This will also remove its associated chunks and vector embeddings.`)) {
      return;
    }

    setActionLoadingId(id);
    setError(null);
    setFeedback(null);
    try {
      await api.deleteDocument(id);
      setFeedback(`Document "${title}" and its embeddings were deleted successfully.`);
      fetchDocuments();
    } catch (err: any) {
      setError(err.message || 'Failed to delete document.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // If unauthenticated, show admin prompt
  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="bg-white p-8 rounded-2xl border border-[#e8ded1] shadow-sm max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#0d3d24]/10 text-[#0d3d24] flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-[#0d3d24]" />
          </div>
          <h2 className="text-xl font-bold text-[#0d3d24] mb-2">
            Administrator Access Required
          </h2>
          <p className="text-xs sm:text-sm text-[#5e6660] mb-6">
            Document management, uploads, edits, and deletions are restricted to authorized administrators.
          </p>
          <button
            onClick={onOpenLogin}
            className="w-full py-2.5 rounded-xl bg-[#0d3d24] text-white font-semibold text-sm hover:bg-[#165b36] transition shadow-sm"
          >
            Log In as Administrator
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-6">
      {/* Header and Action Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e8ded1] shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0d3d24]">
            Document Repository
          </h1>
          <p className="text-xs sm:text-sm text-[#5e6660] mt-1">
            Manage your knowledge base documents, check extraction status, and trigger re-embedding.
          </p>
        </div>

        {canAdd && (
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#d48b14] text-white hover:bg-[#b46f08] transition shadow-sm shrink-0"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 font-bold text-xs">Dismiss</button>
        </div>
      )}

      {feedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-700 font-bold text-xs">Dismiss</button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#e8ded1] shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#5e6660] absolute left-3 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, filename, or description..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-[#e8ded1] bg-[#faf7f2] focus:bg-white focus:border-[#0d3d24] outline-none transition"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#0d3d24] text-white text-xs sm:text-sm font-medium hover:bg-[#165b36] transition"
          >
            Search
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#e8ded1] bg-[#faf7f2] text-[#1e2420] outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Format Dropdown */}
          <select
            value={fileTypeFilter}
            onChange={(e) => {
              setFileTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#e8ded1] bg-[#faf7f2] text-[#1e2420] outline-none"
          >
            <option value="">All Formats (PDF, XLSX, CSV)</option>
            <option value="pdf">PDF Documents</option>
            <option value="xlsx">Excel (XLSX / XLS)</option>
            <option value="csv">CSV Spreadsheets</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs rounded-lg border border-[#e8ded1] bg-[#faf7f2] text-[#1e2420] outline-none"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed & Active</option>
            <option value="processing">Processing</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed Extraction</option>
          </select>
        </div>
      </div>

      {/* Document List Table */}
      <div className="bg-white rounded-2xl border border-[#e8ded1] shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <RotateCw className="w-8 h-8 text-[#0d3d24] animate-spin mb-3" />
            <p className="text-xs sm:text-sm text-[#5e6660]">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#0d3d24]">No documents found</h3>
            <p className="text-xs sm:text-sm text-[#5e6660] max-w-sm mx-auto mt-1 mb-4">
              {search || categoryFilter || fileTypeFilter || statusFilter
                ? 'Try adjusting your filters or search keywords.'
                : 'Upload your first tourism PDF or Excel file to get started.'}
            </p>
            <button
              onClick={onOpenUpload}
              className="px-4 py-2 rounded-xl bg-[#0d3d24] text-white text-xs font-semibold hover:bg-[#165b36] transition"
            >
              Upload Document
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#faf7f2] text-[#5e6660] uppercase text-[10px] sm:text-xs">
                <tr>
                  <th className="py-3 px-4">Title & Source</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Chunks</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#faf7f2]/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#1e2420]">{doc.title}</div>
                      <div className="text-[11px] text-[#5e6660] truncate max-w-xs mt-0.5">
                        {doc.original_filename}
                        {doc.source_name && ` • Source: ${doc.source_name}`}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#5e6660]">
                      <span className="px-2 py-0.5 rounded-full bg-[#faf7f2] border border-[#e8ded1] text-xs">
                        {doc.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="uppercase text-xs font-bold text-[#0d3d24]">
                        {doc.file_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#5e6660] font-mono">
                      {doc.chunk_count}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          doc.processing_status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : doc.processing_status === 'failed'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {doc.processing_status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                        {doc.processing_status === 'failed' && <AlertCircle className="w-3 h-3" />}
                        {doc.processing_status === 'processing' && <RefreshCw className="w-3 h-3 animate-spin" />}
                        {doc.processing_status}
                      </span>
                      {doc.processing_error && (
                        <div className="text-[10px] text-red-600 truncate max-w-[180px] mt-0.5" title={doc.processing_error}>
                          {doc.processing_error}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* In-Browser Document Viewer */}
                        <button
                          onClick={() => onViewFile(doc)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#0d3d24]/10 text-[#0d3d24] hover:bg-[#0d3d24] hover:text-white transition shadow-2xs"
                          title="View document content directly in browser"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden xl:inline">View File</span>
                        </button>

                        {/* View Details & Chunks */}
                        <button
                          onClick={() => onViewDetails(doc.id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-[#0d3d24] hover:bg-gray-100 transition"
                          title="View metadata and extracted text chunks"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        {/* Edit metadata */}
                        {canEdit && (
                          <button
                            onClick={() => onEditDocument(doc)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#d48b14] hover:bg-gray-100 transition"
                            title="Edit Document Information"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}

                        {/* Reprocess */}
                        {canEdit && (
                          <button
                            onClick={() => handleReprocess(doc.id)}
                            disabled={actionLoadingId === doc.id}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-gray-100 transition disabled:opacity-40"
                            title="Reprocess Extraction and Embeddings"
                          >
                            <RefreshCw className={`w-4 h-4 ${actionLoadingId === doc.id ? 'animate-spin' : ''}`} />
                          </button>
                        )}

                        {/* Delete */}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(doc.id, doc.title)}
                            disabled={actionLoadingId === doc.id}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40"
                            title="Delete Document"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-[#5e6660]">
            <div>
              Showing page {currentPage} of {totalPages} ({totalCount} total documents)
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1 rounded-md border border-[#e8ded1] hover:bg-[#faf7f2] disabled:opacity-30"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 rounded-md border border-[#e8ded1] hover:bg-[#faf7f2] disabled:opacity-30"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
