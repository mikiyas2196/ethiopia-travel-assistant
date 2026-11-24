'use client';

import React, { useState } from 'react';
import { X, Lock, Mail, User, ShieldCheck, AlertCircle, RotateCw, UserPlus } from 'lucide-react';
import { api } from '../services/api';
import { AdminUser } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AdminUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const res = await api.login(email.trim(), password);
        onSuccess(res.user);
        onClose();
      } else {
        const res = await api.register(name.trim(), email.trim(), password);
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
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
              {mode === 'login' ? (
                <ShieldCheck className="w-5 h-5 text-[#d48b14]" />
              ) : (
                <UserPlus className="w-5 h-5 text-[#d48b14]" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0d3d24]">
                {mode === 'login' ? 'Account Login' : 'Create Account'}
              </h2>
              <p className="text-[11px] text-[#5e6660]">
                {mode === 'login'
                  ? 'Sign in as administrator or authorized user'
                  : 'Register for an assistant user account'}
              </p>
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

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-[#1e2420] mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#5e6660] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-[#e8ded1] focus:border-[#0d3d24] outline-none text-[#1e2420]"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#1e2420] mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#5e6660] absolute left-3 top-2.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@ethiopiatravel.com"
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-[#e8ded1] focus:border-[#0d3d24] outline-none text-[#1e2420]"
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
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-[#e8ded1] focus:border-[#0d3d24] outline-none text-[#1e2420]"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-[#0d3d24] text-white font-semibold text-xs sm:text-sm hover:bg-[#165b36] transition shadow-sm flex items-center justify-center gap-2 mt-2"
          >
            {loading && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
            <span>
              {loading
                ? mode === 'login'
                  ? 'Authenticating...'
                  : 'Registering...'
                : mode === 'login'
                ? 'Sign In'
                : 'Create Account'}
            </span>
          </button>
        </form>

        {/* Mode Toggle */}
        <div className="mt-4 pt-3 border-t border-[#e8ded1] text-center">
          {mode === 'login' ? (
            <p className="text-xs text-[#5e6660]">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setEmail('');
                  setPassword('');
                  setError(null);
                }}
                className="font-bold text-[#0d3d24] hover:text-[#d48b14] underline ml-1"
              >
                Register
              </button>
            </p>
          ) : (
            <p className="text-xs text-[#5e6660]">
              Already registered?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setEmail('');
                  setPassword('');
                  setError(null);
                }}
                className="font-bold text-[#0d3d24] hover:text-[#d48b14] underline ml-1"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
