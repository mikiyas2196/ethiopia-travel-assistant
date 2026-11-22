'use client';

import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  X,
  FileText,
  AlertCircle,
  CheckCircle2,
  Compass,
} from 'lucide-react';
import { api } from '../services/api';
import { DocumentItem } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDoc: DocumentItem) => void;
  categories: string[];
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categories,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(categories[0] || 'UNESCO World Heritage & Historic Sites');
  const [description, setDescription] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');

  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelection = (file: File) => {
    setError(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['pdf', 'xlsx', 'xls', 'csv'];

    if (!ext || !allowed.includes(ext)) {
      setError('Unsupported file type. Please upload a PDF, XLSX, XLS, or CSV document.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds the 50MB limit.');
      return;
    }

    setSelectedFile(file);

    // Auto-generate a readable title from filename if title is empty
    if (!title) {
      const cleanName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
      setTitle(cleanName);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }
    if (!title.trim()) {
      setError('Document title is required.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', title.trim());
    formData.append('category', category);
    if (description.trim()) formData.append('description', description.trim());
    if (sourceName.trim()) formData.append('source_name', sourceName.trim());
    if (sourceUrl.trim()) formData.append('source_url', sourceUrl.trim());

    try {
      const res = await api.uploadDocument(formData);
      setSuccessMsg(res.message || 'Document uploaded and processed successfully.');
      setTimeout(() => {
        onSuccess(res.document);
        handleReset();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Upload and processing failed.');
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setTitle('');
    setDescription('');
    setSourceName('');
    setSourceUrl('');
    setError(null);
    setSuccessMsg(null);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-[#e8ded1] max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0d3d24]/10 text-[#0d3d24] flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0d3d24]">Upload Tourism Document</h2>
              <p className="text-xs text-[#5e6660]">Automatic extraction, chunking, and embedding generation</p>
            </div>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            disabled={loading}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Drag and Drop Box */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-[#d48b14] bg-[#faf7f2]'
                : selectedFile
                ? 'border-emerald-400 bg-emerald-50/30'
                : 'border-[#e8ded1] bg-[#faf7f2]/60 hover:bg-[#faf7f2] hover:border-[#0d3d24]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelection(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex flex-col items-center">
                <FileText className="w-10 h-10 text-emerald-600 mb-2" />
                <span className="font-semibold text-xs sm:text-sm text-[#1e2420]">{selectedFile.name}</span>
                <span className="text-[11px] text-[#5e6660] mt-0.5">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Click or drag to replace
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <UploadCloud className="w-10 h-10 text-[#d48b14] mb-2" />
                <span className="text-xs sm:text-sm font-semibold text-[#0d3d24]">
                  Click to select file or drag & drop here
                </span>
                <span className="text-[11px] text-[#5e6660] mt-1">
                  Supported formats: PDF, Excel (.xlsx, .xls), CSV (up to 50MB)
                </span>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[#1e2420] mb-1">
              Document Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Lalibela Historic Rock-Hewn Churches Guide"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#e8ded1] focus:border-[#0d3d24] focus:ring-1 focus:ring-[#0d3d24] outline-none transition"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-[#1e2420] mb-1">
              Tourism Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#e8ded1] focus:border-[#0d3d24] outline-none"
              required
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#1e2420] mb-1">
              Description <span className="text-[11px] text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of document contents..."
              rows={2}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#e8ded1] focus:border-[#0d3d24] outline-none transition"
            />
          </div>

          {/* Source Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1e2420] mb-1">
                Source Name <span className="text-[11px] text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="e.g., Ethiopian Tourism Authority"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8ded1] focus:border-[#0d3d24] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1e2420] mb-1">
                Source URL <span className="text-[11px] text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8ded1] focus:border-[#0d3d24] outline-none"
              />
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                handleReset();
                onClose();
              }}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || !selectedFile || !title.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#0d3d24] text-white text-xs sm:text-sm font-semibold hover:bg-[#165b36] transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Compass className="w-4 h-4 animate-spin text-[#f3a628]" />}
              <span>{loading ? 'Processing & Generating Embeddings...' : 'Upload & Process'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
