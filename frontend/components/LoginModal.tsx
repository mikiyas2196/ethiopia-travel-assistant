'use client';

import React, { useState } from 'react';
import { X, Lock, Mail, ShieldCheck, AlertCircle, RotateCw } from 'lucide-react';
import { api } from '../services/api';
import { AdminUser } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AdminUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('admin@ethiopiatravel.com');
  const [password, setPassword] = useState('admin123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.login(email.trim(), password);
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-[#e8ded1]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0d3d24]/10 text-[#0d3d24] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0d3d24]">Admin Authentication</h2>
              <p className="text-[11px] text-[#5e6660]">Secure administrator portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
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
              Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#5e6660] absolute left-3 top-2.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ethiopiatravel.com"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-[#e8ded1] focus:border-[#0d3d24] outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1e2420] mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#5e6660] absolute left-3 top-2.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-[#e8ded1] focus:border-[#0d3d24] outline-none"
                required
              />
            </div>
            <p className="text-[11px] text-[#5e6660] mt-1.5">
              Default credentials: <code className="bg-gray-100 px-1 py-0.5 rounded text-[10px]">admin@ethiopiatravel.com</code> / <code className="bg-gray-100 px-1 py-0.5 rounded text-[10px]">admin123456</code>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[#0d3d24] text-white font-semibold text-xs sm:text-sm hover:bg-[#165b36] transition shadow-sm flex items-center justify-center gap-2 mt-2"
          >
            {loading && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
