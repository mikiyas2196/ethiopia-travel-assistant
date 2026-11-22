'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit, AlertCircle, CheckCircle2, RotateCw, FileText } from 'lucide-react';
import { DocumentItem } from '../types';
import { api } from '../services/api';

interface EditDocumentModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categories: string[];
}

export const EditDocumentModal: React.FC<EditDocumentModalProps> = ({
  document,
  isOpen,
  onClose,
  onSuccess,
  categories,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [replacementFile, setReplacementFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setCategory(document.category);
      setDescription(document.description || '');
      setSourceName(document.source_name || '');
      setSourceUrl(document.source_url || '');
      setReplacementFile(null);
      setError(null);
    }
  }, [document]);

  if (!isOpen || !document) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title cannot be empty.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('_method', 'PUT');
    formData.append('title', title.trim());
    formData.append('category', category);
    if (description.trim()) formData.append('description', description.trim());
    if (sourceName.trim()) formData.append('source_name', sourceName.trim());
    if (sourceUrl.trim()) formData.append('source_url', sourceUrl.trim());
    if (replacementFile) formData.append('file', replacementFile);

    try {
      await api.updateDocument(document.id, formData);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update document.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#e8ded1] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#d48b14]/10 text-[#d48b14] flex items-center justify-center">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0d3d24]">Edit Document Details</h2>
              <p className="text-xs text-[#5e6660]">Update metadata or replace stored file</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#1e2420] mb-1">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#e8ded1] focus:border-[#0d3d24] outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1e2420] mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#e8ded1] focus:border-[#0d3d24] outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1e2420] mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl border border-[#e8ded1] focus:border-[#0d3d24] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#1e2420] mb-1">Source Name</label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8ded1] outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1e2420] mb-1">Source URL</label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8ded1] outline-none"
              />
            </div>
          </div>

          {/* Optional File Replacement */}
          <div className="p-3 bg-[#faf7f2] rounded-xl border border-[#e8ded1]">
            <label className="block text-xs font-semibold text-[#0d3d24] mb-1">
              Replace Document File <span className="text-[10px] text-gray-500 font-normal">(Optional - reprocesses embeddings)</span>
            </label>
            <input
              type="file"
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setReplacementFile(e.target.files[0]);
                }
              }}
              className="text-xs text-[#5e6660]"
            />
            {replacementFile && (
              <p className="text-[11px] text-emerald-700 mt-1">
                New file selected: {replacementFile.name} (will replace existing file and regenerate embeddings)
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-[#0d3d24] text-white text-xs font-semibold hover:bg-[#165b36] transition flex items-center gap-2"
            >
              {loading && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
