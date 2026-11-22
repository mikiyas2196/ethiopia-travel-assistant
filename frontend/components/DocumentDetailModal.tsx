'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Layers,
  Calendar,
  Database,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Eye,
  Download,
} from 'lucide-react';
import { DocumentChunk, DocumentItem } from '../types';
import { api } from '../services/api';

interface DocumentDetailModalProps {
  documentId: number | null;
  onClose: () => void;
  onViewFile?: (doc: DocumentItem) => void;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  documentId,
  onClose,
  onViewFile,
}) => {
  const [document, setDocument] = useState<DocumentItem | null>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chunks' | 'raw'>('chunks');

  useEffect(() => {
    if (!documentId) return;

    setLoading(true);
    setError(null);

    api.getDocument(documentId)
      .then((res) => {
        setDocument(res.document);
        setChunks(res.chunks_preview || []);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch document details.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [documentId]);

  if (!documentId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl border border-[#e8ded1] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0d3d24]/10 text-[#0d3d24] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-[#0d3d24]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0d3d24] leading-tight">
                {document?.title || 'Document Details'}
              </h2>
              <p className="text-xs text-[#5e6660] mt-0.5">
                {document?.original_filename}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {document && onViewFile && (
              <button
                onClick={() => onViewFile(document)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d3d24] text-white text-xs font-semibold hover:bg-[#154d2e] transition shadow-xs"
              >
                <Eye className="w-3.5 h-3.5 text-[#f3a628]" />
                <span>View File in Browser</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center flex-1">
            <RotateCw className="w-8 h-8 text-[#0d3d24] animate-spin mb-3" />
            <p className="text-xs text-[#5e6660]">Loading document structure and chunks...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 text-sm">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        ) : document ? (
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Metadata Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#faf7f2] border border-[#e8ded1]">
                <span className="text-[10px] uppercase font-bold text-[#5e6660] block">Category</span>
                <span className="font-semibold text-[#0d3d24] truncate block mt-0.5">{document.category}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#faf7f2] border border-[#e8ded1]">
                <span className="text-[10px] uppercase font-bold text-[#5e6660] block">Format & Size</span>
                <span className="font-semibold text-[#0d3d24] uppercase block mt-0.5">
                  {document.file_type} {document.file_size ? `(${(document.file_size / 1024).toFixed(1)} KB)` : ''}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#faf7f2] border border-[#e8ded1]">
                <span className="text-[10px] uppercase font-bold text-[#5e6660] block">Chunks Generated</span>
                <span className="font-semibold text-[#d48b14] block mt-0.5">{document.chunk_count} chunks</span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#faf7f2] border border-[#e8ded1]">
                <span className="text-[10px] uppercase font-bold text-[#5e6660] block">Status</span>
                <span className="font-semibold text-emerald-700 capitalize block mt-0.5">
                  {document.processing_status}
                </span>
              </div>
            </div>

            {/* Description / Source link */}
            {(document.description || document.source_name || document.source_url) && (
              <div className="p-3 bg-[#faf7f2] rounded-xl border border-[#e8ded1] text-xs space-y-1">
                {document.description && (
                  <p className="text-[#1e2420]">{document.description}</p>
                )}
                {(document.source_name || document.source_url) && (
                  <div className="flex items-center gap-1.5 text-[#5e6660] pt-1">
                    <span>Source:</span>
                    <span className="font-medium text-[#1e2420]">{document.source_name || 'Official Reference'}</span>
                    {document.source_url && (
                      <a
                        href={document.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#d48b14] hover:underline flex items-center gap-0.5 ml-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Content Tabs */}
            <div className="border-b border-gray-100 flex gap-4 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('chunks')}
                className={`pb-2 transition border-b-2 ${
                  activeTab === 'chunks'
                    ? 'border-[#0d3d24] text-[#0d3d24]'
                    : 'border-transparent text-[#5e6660] hover:text-[#0d3d24]'
                }`}
              >
                Generated Chunks ({chunks.length})
              </button>
              <button
                onClick={() => setActiveTab('raw')}
                className={`pb-2 transition border-b-2 ${
                  activeTab === 'raw'
                    ? 'border-[#0d3d24] text-[#0d3d24]'
                    : 'border-transparent text-[#5e6660] hover:text-[#0d3d24]'
                }`}
              >
                Extracted Text Preview
              </button>
            </div>

            {/* Tab 1: Chunks Preview */}
            {activeTab === 'chunks' && (
              <div className="space-y-3">
                {chunks.length === 0 ? (
                  <p className="text-xs text-gray-500 py-4 text-center">No chunks indexed yet.</p>
                ) : (
                  chunks.map((chunk) => (
                    <div
                      key={chunk.id}
                      className="p-3.5 bg-[#faf7f2]/70 rounded-xl border border-[#e8ded1] text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px] text-[#5e6660]">
                        <span className="font-bold text-[#0d3d24]">Chunk #{chunk.chunk_index}</span>
                        <span className="font-mono text-gray-500">~{chunk.token_count} tokens</span>
                      </div>
                      <p className="text-[#1e2420] whitespace-pre-wrap leading-relaxed">
                        {chunk.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2: Raw Extracted Content */}
            {activeTab === 'raw' && (
              <div className="p-4 bg-[#faf7f2] rounded-xl border border-[#e8ded1] text-xs font-mono whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed text-[#1e2420]">
                {document.extracted_content || 'No extracted text available.'}
              </div>
            )}
          </div>
        ) : null}

        {/* Footer */}
        <div className="pt-3 border-t border-gray-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
