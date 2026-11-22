'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  LayoutDashboard,
  FolderOpen,
  UploadCloud,
  LogIn,
  LogOut,
  Compass,
  Users,
  ChevronDown,
  Shield,
  CheckCircle2,
  XCircle,
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

  // Profile dropdown menu state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const userInitial = currentUser?.name
    ? currentUser.name.charAt(0).toUpperCase()
    : 'U';

  // Close dropdown on outside click or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsProfileOpen(false);
      }
    };

    if (isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isProfileOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-[#092617]/95 backdrop-blur-md text-white shadow-lg border-b border-[#164e2f]">
      {/* Top Ethiopian Gold Brand Accent Line */}
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

          {/* ================= RIGHT: Action & User Profile ================= */}
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
              <div className="relative" ref={profileDropdownRef}>
                {/* Clickable Profile Pill (Click to open menu & logout) */}
                <button
                  type="button"
                  onClick={() => setIsProfileOpen((prev) => !prev)}
                  className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#061a10] hover:bg-[#103a22] border transition-all whitespace-nowrap active:scale-95 shadow-sm cursor-pointer ${
                    isProfileOpen
                      ? 'border-[#d48b14] ring-2 ring-[#d48b14]/30 bg-[#103a22]'
                      : 'border-[#144b2d]'
                  }`}
                  title="Click to view profile, permissions, and logout"
                  aria-expanded={isProfileOpen}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#d48b14] to-[#f3a628] text-[#092617] font-bold flex items-center justify-center text-xs shadow-sm shrink-0">
                    {userInitial}
                  </div>
                  <span
                    className="text-[#faf7f2] font-semibold text-xs sm:text-sm max-w-[120px] truncate"
                    title={currentUser.name}
                  >
                    {currentUser.name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#165b36] text-[#f3a628] border border-[#d48b14]/40 shrink-0">
                    {isAdmin ? 'Admin' : 'Staff'}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-[#cfc5b0] transition-transform duration-200 shrink-0 ${
                      isProfileOpen ? 'rotate-180 text-[#f3a628]' : ''
                    }`}
                  />
                </button>

                {/* Profile & Logout Dropdown Menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-[#092617] text-white rounded-2xl shadow-2xl border border-[#1d633b] py-2 z-50 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* User Header Details */}
                    <div className="px-4 py-3 border-b border-[#144b2d] flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#d48b14] to-[#f3a628] text-[#092617] font-bold flex items-center justify-center text-sm shadow-md shrink-0">
                        {userInitial}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm text-[#faf7f2] truncate">
                          {currentUser.name}
                        </p>
                        <p className="text-xs text-[#cfc5b0] truncate">
                          {currentUser.email}
                        </p>
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#165b36] text-[#f3a628] border border-[#d48b14]/30">
                          {isAdmin ? 'System Administrator' : 'Staff Account'}
                        </span>
                      </div>
                    </div>

                    {/* Permissions Overview Summary */}
                    <div className="px-4 py-2.5 bg-[#061a10]/70 border-b border-[#144b2d]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[#d48b14] mb-1.5 flex items-center gap-1.5">
                        <Shield className="w-3 h-3 text-[#f3a628]" />
                        <span>Document Permissions</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-[#cfc5b0]">
                        <div className="flex items-center gap-1.5">
                          {currentUser.can_view_documents ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-3 h-3 text-zinc-500 shrink-0" />
                          )}
                          <span>View: {currentUser.can_view_documents ? 'Allowed' : 'Off'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {currentUser.can_add_documents ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-3 h-3 text-zinc-500 shrink-0" />
                          )}
                          <span>Upload: {currentUser.can_add_documents ? 'Allowed' : 'Off'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {currentUser.can_edit_documents ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-3 h-3 text-zinc-500 shrink-0" />
                          )}
                          <span>Edit: {currentUser.can_edit_documents ? 'Allowed' : 'Off'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {currentUser.can_delete_documents ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          ) : (
                            <XCircle className="w-3 h-3 text-zinc-500 shrink-0" />
                          )}
                          <span>Delete: {currentUser.can_delete_documents ? 'Allowed' : 'Off'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="p-2 space-y-1">
                      {isAdmin && onOpenUserManagement && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileOpen(false);
                            onOpenUserManagement();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#faf7f2] hover:bg-[#103a22] transition-colors group cursor-pointer"
                        >
                          <Users className="w-4 h-4 text-[#f3a628] group-hover:scale-110 transition-transform" />
                          <span>Users & Permissions</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-white hover:bg-rose-950/70 border border-transparent hover:border-rose-800/40 transition-colors group cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
                        <span>Logout of Account</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Guest Login Button */
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-[#103a22] hover:bg-[#165b36] text-[#faf7f2] border border-[#d48b14]/40 shadow-sm transition-all whitespace-nowrap active:scale-95"
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
