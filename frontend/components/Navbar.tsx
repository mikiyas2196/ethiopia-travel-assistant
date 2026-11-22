'use client';

import React from 'react';
import {
  MessageSquare,
  LayoutDashboard,
  FolderOpen,
  UploadCloud,
  LogIn,
  LogOut,
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
  const canAddDocs = isAdmin || currentUser?.can_add_documents;

  const userInitial = currentUser?.name
    ? currentUser.name.charAt(0).toUpperCase()
    : 'U';

  return (
    <header className="sticky top-0 z-40 bg-[#092617] text-white shadow-lg border-b border-[#164e2f]">
      {/* Subtle Ethiopian Gold Brand Accent Line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-[#d48b14] via-[#f3a628] to-[#165b36]" />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 sm:h-20 gap-2 sm:gap-4">
          
          {/* ================= LEFT: Brand Emblem & Title ================= */}
          <div
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0 select-none py-1"
            onClick={() => onSelectTab('chat')}
            title="Ethiopian Tourist Destination Assistant"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#d48b14] via-[#f3a628] to-[#0d3d24] p-[1.5px] shadow-md shadow-black/30 flex items-center justify-center transition-transform group-hover:scale-105">
              <div className="w-full h-full rounded-[10px] bg-[#0d3d24] flex items-center justify-center">
                <Compass className="w-5 h-5 sm:w-6 sm:h-6 text-[#f3a628] group-hover:rotate-45 transition-transform duration-300" />
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-[#faf7f2] whitespace-nowrap">
                  Ethiopian Tourist
                </span>
                <span className="hidden xl:inline-block font-semibold text-base tracking-tight text-[#faf7f2]">
                  Assistant
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-[#d48b14]/20 text-[#f3a628] border border-[#d48b14]/40 whitespace-nowrap">
                  RAG AI
                </span>
              </div>
              <p className="text-[11px] text-[#cfc5b0] tracking-wide whitespace-nowrap hidden sm:block">
                AI Destination & Heritage Knowledge Base
              </p>
            </div>
          </div>

          {/* ================= CENTER: Navigation Tabs ================= */}
          <nav className="hidden md:flex items-center bg-[#061a10] p-1 rounded-xl border border-[#144b2d] shadow-inner shrink-0">
            <button
              onClick={() => onSelectTab('chat')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap ${
                currentTab === 'chat'
                  ? 'bg-[#165b36] text-[#faf7f2] shadow-sm font-semibold'
                  : 'text-[#cfc5b0] hover:bg-[#103a22] hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-[#f3a628]" />
              <span>Chat Assistant</span>
            </button>

            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap ${
                currentTab === 'dashboard'
                  ? 'bg-[#165b36] text-[#faf7f2] shadow-sm font-semibold'
                  : 'text-[#cfc5b0] hover:bg-[#103a22] hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-[#f3a628]" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => onSelectTab('documents')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap ${
                currentTab === 'documents'
                  ? 'bg-[#165b36] text-[#faf7f2] shadow-sm font-semibold'
                  : 'text-[#cfc5b0] hover:bg-[#103a22] hover:text-white'
              }`}
            >
              <FolderOpen className="w-4 h-4 text-[#f3a628]" />
              <span>Documents</span>
            </button>
          </nav>

          {/* ================= RIGHT: Action & User Controls ================= */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Primary Action: Upload Document */}
            <button
              onClick={() => onSelectTab('upload')}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold bg-gradient-to-r from-[#d48b14] to-[#f3a628] hover:from-[#c27c0f] hover:to-[#e09820] text-[#092617] shadow-sm hover:shadow-md transition-all whitespace-nowrap active:scale-95"
              title={canAddDocs ? 'Upload and index tourism document' : 'Login to upload documents'}
            >
              <UploadCloud className="w-4 h-4 text-[#092617] shrink-0" />
              <span>Upload Document</span>
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2 sm:gap-2.5">
                {/* Admin Users & Permissions Manager Pill */}
                {isAdmin && onOpenUserManagement && (
                  <button
                    onClick={onOpenUserManagement}
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-lg text-xs font-semibold bg-[#103a22] hover:bg-[#165b36] text-[#faf7f2] border border-[#d48b14]/50 shadow-sm transition-all whitespace-nowrap active:scale-95"
                    title="Manage users, permissions, and roles in bulk"
                  >
                    <Users className="w-3.5 h-3.5 text-[#f3a628] shrink-0" />
                    <span className="hidden xl:inline">Users & Permissions</span>
                    <span className="xl:hidden">Users</span>
                  </button>
                )}

                {/* User Profile Badge */}
                <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#061a10] border border-[#144b2d] text-xs whitespace-nowrap">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#d48b14] to-[#f3a628] text-[#092617] font-bold flex items-center justify-center text-[11px] shadow-sm shrink-0">
                    {userInitial}
                  </div>
                  <span className="text-[#faf7f2] font-medium max-w-[110px] truncate" title={currentUser.name}>
                    {currentUser.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#165b36] text-[#f3a628] border border-[#d48b14]/40">
                    {isAdmin ? 'Admin' : 'Staff'}
                  </span>
                </div>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-xs font-medium text-rose-300 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 transition-all whitespace-nowrap shadow-sm active:scale-95"
                  title="Sign out of your account"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden md:inline">Logout</span>
                </button>
              </div>
            ) : (
              /* Guest Login Button */
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-[#103a22] hover:bg-[#165b36] text-[#faf7f2] border border-[#d48b14]/40 shadow-sm transition-all whitespace-nowrap active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5 text-[#f3a628] shrink-0" />
                <span>Account Login</span>
              </button>
            )}
          </div>
        </div>

        {/* ================= MOBILE BOTTOM NAV STRIP (md:hidden) ================= */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-[#144b2d] bg-[#061a10]/60 -mx-3 px-3">
          <button
            onClick={() => onSelectTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              currentTab === 'chat'
                ? 'bg-[#165b36] text-white font-semibold'
                : 'text-[#cfc5b0] hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#f3a628]" />
            <span>Chat</span>
          </button>

          <button
            onClick={() => onSelectTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              currentTab === 'dashboard'
                ? 'bg-[#165b36] text-white font-semibold'
                : 'text-[#cfc5b0] hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-[#f3a628]" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onSelectTab('documents')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              currentTab === 'documents'
                ? 'bg-[#165b36] text-white font-semibold'
                : 'text-[#cfc5b0] hover:text-white'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#f3a628]" />
            <span>Documents</span>
          </button>
        </div>
      </div>
    </header>
  );
};
