'use client';

import React from 'react';
import {
  MessageSquare,
  LayoutDashboard,
  FolderOpen,
  UploadCloud,
  LogIn,
  LogOut,
  ShieldCheck,
  Compass,
  Users,
} from 'lucide-react';
import { AdminUser } from '../types';

interface NavbarProps {
  currentTab: 'chat' | 'dashboard' | 'documents' | 'upload';
  onSelectTab: (tab: 'chat' | 'dashboard' | 'documents' | 'upload') => void;
  currentUser: AdminUser | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenUserManagement?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onOpenLogin,
  onLogout,
  onOpenUserManagement,
}) => {
  const isAdmin = currentUser?.is_admin || currentUser?.role === 'admin';
  const canViewDocs = isAdmin || currentUser?.can_view_documents;
  const canAddDocs = isAdmin || currentUser?.can_add_documents;
  return (
    <header className="sticky top-0 z-40 bg-[#0d3d24] text-white shadow-md border-b border-[#1c5c37]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => onSelectTab('chat')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#d48b14] via-[#f3a628] to-[#165b36] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-[#faf7f2]">
                  Ethiopian Tourist
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#d48b14]/20 text-[#f3a628] border border-[#d48b14]/40 font-medium">
                  RAG Assistant
                </span>
              </div>
              <p className="text-[11px] text-[#e2d8c3]/80 -mt-0.5">
                AI Destination & Heritage Companion
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => onSelectTab('chat')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'chat'
                  ? 'bg-[#165b36] text-[#faf7f2] shadow-sm'
                  : 'text-[#e2d8c3] hover:bg-[#135231] hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-[#d48b14]" />
              Chat Assistant
            </button>

            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-[#165b36] text-[#faf7f2] shadow-sm'
                  : 'text-[#e2d8c3] hover:bg-[#135231] hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#d48b14]" />
              Dashboard
            </button>

            <button
              onClick={() => onSelectTab('documents')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'documents'
                  ? 'bg-[#165b36] text-[#faf7f2] shadow-sm'
                  : 'text-[#e2d8c3] hover:bg-[#135231] hover:text-white'
              }`}
            >
              <FolderOpen className="w-4 h-4 text-[#d48b14]" />
              Manage Documents
            </button>

            <button
              onClick={() => onSelectTab('upload')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'upload'
                  ? 'bg-[#d48b14] text-white shadow-sm'
                  : 'bg-[#d48b14]/20 text-[#f3a628] hover:bg-[#d48b14] hover:text-white'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              Upload Document
            </button>
          </nav>

          {/* Admin User / Auth Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2">
                {isAdmin && onOpenUserManagement && (
                  <button
                    onClick={onOpenUserManagement}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#165b36] text-[#faf7f2] border border-[#d48b14]/50 hover:bg-[#d48b14] hover:text-white transition shadow-sm"
                    title="Manage users and document permissions"
                  >
                    <Users className="w-3.5 h-3.5 text-[#f3a628]" />
                    <span className="hidden lg:inline">Users & Permissions</span>
                  </button>
                )}

                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#135231] text-xs text-[#e2d8c3]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#f3a628]" />
                  <span>
                    {isAdmin ? 'Admin' : 'User'}: {currentUser.name}
                  </span>
                </div>

                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-950/40 text-red-300 border border-red-800/50 hover:bg-red-900/60 transition"
                  title="Log out of account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#165b36] text-[#faf7f2] border border-[#d48b14]/40 hover:bg-[#d48b14] hover:text-white transition shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5 text-[#f3a628]" />
                <span>Account Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden overflow-x-auto py-2 space-x-1 border-t border-[#165b36]/60">
          <button
            onClick={() => onSelectTab('chat')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
              currentTab === 'chat' ? 'bg-[#165b36] text-white' : 'text-[#e2d8c3]'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
              currentTab === 'dashboard' ? 'bg-[#165b36] text-white' : 'text-[#e2d8c3]'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onSelectTab('documents')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
              currentTab === 'documents' ? 'bg-[#165b36] text-white' : 'text-[#e2d8c3]'
            }`}
          >
            Documents
          </button>
          <button
            onClick={() => onSelectTab('upload')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
              currentTab === 'upload' ? 'bg-[#d48b14] text-white' : 'text-[#f3a628]'
            }`}
          >
            Upload
          </button>
        </div>
      </div>
    </header>
  );
};
