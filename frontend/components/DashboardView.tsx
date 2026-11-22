'use client';

import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Database,
  Layers,
  UploadCloud,
  RotateCw,
  FolderOpen,
  PieChart,
  Tag,
} from 'lucide-react';
import { KnowledgeBaseStats } from '../types';
import { api } from '../services/api';

interface DashboardViewProps {
  onNavigateToUpload: () => void;
  onNavigateToDocuments: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToUpload,
  onNavigateToDocuments,
}) => {
  const [stats, setStats] = useState<KnowledgeBaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getStatistics();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load knowledge base statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[400px]">
        <RotateCw className="w-8 h-8 text-[#0d3d24] animate-spin mb-4" />
        <p className="text-sm text-[#5e6660]">Loading knowledge base metrics...</p>
      </div>
    );
  }

  const isEmpty = !stats || stats.total_documents === 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e8ded1] shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#0d3d24]">
            Tourism Knowledge Base Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[#5e6660] mt-1">
            Real-time database metrics for documents, chunks, and embeddings powering the RAG chatbot.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium bg-[#faf7f2] border border-[#e8ded1] text-[#0d3d24] hover:bg-[#f4efe6] transition"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onNavigateToUpload}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#d48b14] text-white hover:bg-[#b46f08] transition shadow-sm"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State Banner */}
      {isEmpty && (
        <div className="p-8 text-center bg-white rounded-2xl border border-[#e8ded1] shadow-sm flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-[#faf7f2] border border-[#e8ded1] text-[#d48b14] flex items-center justify-center mb-4">
            <Database className="w-8 h-8" />
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-[#0d3d24] mb-2">
            Your tourism knowledge base is empty
          </h3>
          <p className="text-sm text-[#5e6660] max-w-md mb-6">
            Upload your first tourism PDF, Excel, or CSV document to populate the knowledge base and start answering user inquiries.
          </p>
          <button
            onClick={onNavigateToUpload}
            className="px-5 py-2.5 rounded-xl bg-[#0d3d24] text-white text-sm font-semibold hover:bg-[#165b36] transition shadow-sm flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4 text-[#f3a628]" />
            <span>Upload First Tourism Document</span>
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Documents */}
          <div className="bg-white p-5 rounded-2xl border border-[#e8ded1] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#5e6660] uppercase tracking-wider">Total Documents</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-[#0d3d24] mt-1">{stats.total_documents}</h3>
              <p className="text-[11px] text-[#5e6660] mt-0.5">Uploaded files</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#0d3d24]/10 text-[#0d3d24] flex items-center justify-center">
              <FileText className="w-6 h-6 text-[#0d3d24]" />
            </div>
          </div>

          {/* Processed & Ready */}
          <div className="bg-white p-5 rounded-2xl border border-[#e8ded1] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#5e6660] uppercase tracking-wider">Processed & Active</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-emerald-700 mt-1">{stats.completed_documents}</h3>
              <p className="text-[11px] text-emerald-600 mt-0.5">Ready for RAG search</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          {/* Text Chunks */}
          <div className="bg-white p-5 rounded-2xl border border-[#e8ded1] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#5e6660] uppercase tracking-wider">Knowledge Chunks</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-[#d48b14] mt-1">{stats.total_chunks}</h3>
              <p className="text-[11px] text-[#5e6660] mt-0.5">Indexed sections</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#d48b14] flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          {/* Vector Embeddings */}
          <div className="bg-white p-5 rounded-2xl border border-[#e8ded1] shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[#5e6660] uppercase tracking-wider">Vector Embeddings</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-indigo-700 mt-1">{stats.total_embeddings}</h3>
              <p className="text-[11px] text-[#5e6660] mt-0.5">768-dim vectors</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Categories & File Types Distribution */}
      {stats && !isEmpty && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Categories Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-[#e8ded1] shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-[#d48b14]" />
                <h3 className="font-bold text-[#0d3d24] text-sm sm:text-base">
                  Documents by Category
                </h3>
              </div>
              <span className="text-xs text-[#5e6660]">
                {Object.keys(stats.categories_breakdown).length} active categories
              </span>
            </div>

            <div className="space-y-3">
              {Object.entries(stats.categories_breakdown).map(([cat, count]) => {
                const percent = Math.round((count / stats.total_documents) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-[#1e2420] truncate max-w-[80%]">{cat}</span>
                      <span className="text-[#5e6660] font-semibold">{count} docs ({percent}%)</span>
                    </div>
                    <div className="w-full bg-[#f4efe6] h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#0d3d24] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* File Formats & Processing Status Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-[#e8ded1] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#d48b14]" />
                  <h3 className="font-bold text-[#0d3d24] text-sm sm:text-base">
                    Document Format Distribution
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                {['pdf', 'xlsx', 'csv'].map((type) => {
                  const count = stats.file_types_breakdown[type] || 0;
                  return (
                    <div key={type} className="p-3 rounded-xl bg-[#faf7f2] border border-[#e8ded1] text-center">
                      <span className="text-xs uppercase font-bold text-[#0d3d24] block">{type}</span>
                      <span className="text-xl font-bold text-[#1e2420] mt-1 block">{count}</span>
                      <span className="text-[10px] text-[#5e6660]">files</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status alerts */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200/60 text-xs text-amber-800">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">{stats.pending_documents}</span> Pending / In-progress
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50/80 border border-red-200/60 text-xs text-red-800">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <div>
                  <span className="font-bold">{stats.failed_documents}</span> Processing Errors
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Uploaded Documents Table */}
      {stats && stats.recent_documents.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#e8ded1] shadow-sm overflow-hidden">
          <div className="p-5 flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[#d48b14]" />
              <h3 className="font-bold text-[#0d3d24] text-sm sm:text-base">
                Recent Tourism Documents
              </h3>
            </div>
            <button
              onClick={onNavigateToDocuments}
              className="text-xs font-semibold text-[#0d3d24] hover:underline"
            >
              View All Documents &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#faf7f2] text-[#5e6660] uppercase text-[10px] sm:text-xs">
                <tr>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Chunks</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recent_documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-[#faf7f2]/50 transition">
                    <td className="py-3 px-4 font-medium text-[#1e2420]">
                      {doc.title}
                    </td>
                    <td className="py-3 px-4 text-[#5e6660]">
                      <span className="px-2 py-0.5 rounded-full bg-[#faf7f2] border border-[#e8ded1] text-xs">
                        {doc.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 uppercase text-xs font-semibold text-[#0d3d24]">
                      {doc.file_type}
                    </td>
                    <td className="py-3 px-4 text-[#5e6660] font-mono">
                      {doc.chunk_count}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          doc.processing_status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : doc.processing_status === 'failed'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {doc.processing_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#5e6660] text-xs">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
