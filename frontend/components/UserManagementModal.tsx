'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Users,
  Shield,
  UserPlus,
  Trash2,
  Check,
  RotateCw,
  Eye,
  Upload,
  Edit,
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  Square,
  MinusSquare,
  Sparkles,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { AdminUser } from '../types';
import { api } from '../services/api';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AdminUser | null;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search filter
  const [userSearch, setUserSearch] = useState('');

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // New User Form State
  const [showAddUser, setShowAddUser] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [newCanView, setNewCanView] = useState(true);
  const [newCanAdd, setNewCanAdd] = useState(false);
  const [newCanEdit, setNewCanEdit] = useState(false);
  const [newCanDelete, setNewCanDelete] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  // Edit Permissions State mapping by user ID
  const [userPerms, setUserPerms] = useState<
    Record<
      number,
      {
        role: 'admin' | 'user';
        can_view_documents: boolean;
        can_add_documents: boolean;
        can_edit_documents: boolean;
        can_delete_documents: boolean;
      }
    >
  >({});

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const list = await api.getUsers();
      setUsers(list);

      const permsMap: Record<number, any> = {};
      list.forEach((u) => {
        permsMap[u.id] = {
          role: u.role,
          can_view_documents: u.can_view_documents,
          can_add_documents: u.can_add_documents,
          can_edit_documents: u.can_edit_documents,
          can_delete_documents: u.can_delete_documents,
        };
      });
      setUserPerms(permsMap);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to fetch users list.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setFeedbackMsg(null);
      setSelectedIds(new Set());
    }
  }, [isOpen]);

  // Manageable users (exclude primary admin ID 1 from batch demotions)
  const nonPrimaryUsers = useMemo(() => users.filter((u) => u.id !== 1), [users]);

  // Filtered users by search keyword
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users;
    const q = userSearch.toLowerCase();
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  const allNonPrimarySelected =
    nonPrimaryUsers.length > 0 &&
    nonPrimaryUsers.every((u) => selectedIds.has(u.id));

  const someSelected =
    selectedIds.size > 0 && !allNonPrimarySelected;

  const handleToggleSelectAll = () => {
    if (allNonPrimarySelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(nonPrimaryUsers.map((u) => u.id)));
    }
  };

  const handleToggleSelectUser = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Bulk Apply Permission Action
  const handleBulkAction = async (action: 'grant_all' | 'revoke_all' | 'view_only' | 'view_add') => {
    const targetIds = selectedIds.size > 0 ? Array.from(selectedIds) : nonPrimaryUsers.map((u) => u.id);
    if (targetIds.length === 0) return;

    setBulkActionLoading(true);
    setFeedbackMsg(null);

    try {
      if (action === 'grant_all') {
        await api.updateBulkPermissions({
          user_ids: targetIds,
          action: 'grant_all',
        });
        setFeedbackMsg({
          type: 'success',
          text: `Granted all permissions (View, Add, Edit, Delete) to ${targetIds.length} user(s).`,
        });
      } else if (action === 'revoke_all') {
        await api.updateBulkPermissions({
          user_ids: targetIds,
          action: 'revoke_all',
        });
        setFeedbackMsg({
          type: 'success',
          text: `Revoked all document permissions from ${targetIds.length} user(s).`,
        });
      } else if (action === 'view_only') {
        await api.updateBulkPermissions({
          user_ids: targetIds,
          can_view_documents: true,
          can_add_documents: false,
          can_edit_documents: false,
          can_delete_documents: false,
        });
        setFeedbackMsg({
          type: 'success',
          text: `Set ${targetIds.length} user(s) to View-Only access.`,
        });
      } else if (action === 'view_add') {
        await api.updateBulkPermissions({
          user_ids: targetIds,
          can_view_documents: true,
          can_add_documents: true,
          can_edit_documents: true,
          can_delete_documents: false,
        });
        setFeedbackMsg({
          type: 'success',
          text: `Granted View + Upload permissions to ${targetIds.length} user(s).`,
        });
      }

      await fetchUsers();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Failed to update bulk permissions.',
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Column-wide bulk toggle for selected (or all) users
  const handleBulkColumnToggle = async (
    field: 'can_view_documents' | 'can_add_documents' | 'can_edit_documents' | 'can_delete_documents',
    enable: boolean
  ) => {
    const targetIds = selectedIds.size > 0 ? Array.from(selectedIds) : nonPrimaryUsers.map((u) => u.id);
    if (targetIds.length === 0) return;

    setBulkActionLoading(true);
    setFeedbackMsg(null);

    try {
      await api.updateBulkPermissions({
        user_ids: targetIds,
        [field]: enable,
      });

      const label =
        field === 'can_view_documents'
          ? 'View'
          : field === 'can_add_documents'
          ? 'Upload / Add'
          : field === 'can_edit_documents'
          ? 'Edit'
          : 'Delete';

      setFeedbackMsg({
        type: 'success',
        text: `${enable ? 'Enabled' : 'Disabled'} ${label} permission for ${targetIds.length} user(s).`,
      });

      await fetchUsers();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Failed to update permission column.',
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleTogglePermission = (
    userId: number,
    field: 'can_view_documents' | 'can_add_documents' | 'can_edit_documents' | 'can_delete_documents'
  ) => {
    setUserPerms((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: !prev[userId]?.[field],
      },
    }));
  };

  const handleSaveUserPermissions = async (userId: number) => {
    const perms = userPerms[userId];
    if (!perms) return;

    setSavingId(userId);
    setFeedbackMsg(null);

    try {
      await api.updateUserPermissions(userId, perms);
      setFeedbackMsg({
        type: 'success',
        text: 'User permissions updated and active immediately.',
      });
      fetchUsers();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Failed to update permissions.',
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"?`)) {
      return;
    }

    setSavingId(userId);
    setFeedbackMsg(null);

    try {
      await api.deleteUser(userId);
      setFeedbackMsg({
        type: 'success',
        text: `User "${userName}" was deleted.`,
      });
      fetchUsers();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Failed to delete user.',
      });
    } finally {
      setSavingId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    setFeedbackMsg(null);

    try {
      await api.createAdminUser({
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
        can_view_documents: newRole === 'admin' ? true : newCanView,
        can_add_documents: newRole === 'admin' ? true : newCanAdd,
        can_edit_documents: newRole === 'admin' ? true : newCanEdit,
        can_delete_documents: newRole === 'admin' ? true : newCanDelete,
      });

      setFeedbackMsg({
        type: 'success',
        text: `User "${newName}" created successfully with specified permissions.`,
      });

      // Reset form
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setShowAddUser(false);
      fetchUsers();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err.message || 'Failed to create user.',
      });
    } finally {
      setCreatingUser(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#e8ded1] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#faf7f2] border-b border-[#e8ded1] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#0d3d24] text-[#f3a628] flex items-center justify-center shadow-md">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#0d3d24]">
                  User Permissions & Access Control
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#d48b14]/15 text-[#d48b14] border border-[#d48b14]/30">
                  {users.length} Users
                </span>
              </div>
              <p className="text-xs text-[#5e6660]">
                Manage individual or bulk access to view, upload, edit, and delete tourism knowledge base documents
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowAddUser(!showAddUser)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0d3d24] text-white text-xs font-semibold hover:bg-[#154d2e] transition shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#f3a628]" />
              <span>{showAddUser ? 'Close Form' : 'Add New User'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#5e6660] hover:text-red-600 hover:bg-red-50 transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`mx-6 mt-4 p-3 rounded-2xl flex items-center gap-2.5 text-xs font-medium border ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Bulk Management Panel */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#faf7f2] to-[#f4efe6] border border-[#e8ded1] shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#d48b14]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#0d3d24]">
                  Bulk Permission Manager
                </span>
                <span className="text-xs text-[#5e6660]">
                  ({selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Applying to all non-admin users'})
                </span>
              </div>

              {/* Select All Toggle */}
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#0d3d24] hover:text-[#d48b14] transition cursor-pointer self-start md:self-auto"
              >
                {allNonPrimarySelected ? (
                  <CheckSquare className="w-4 h-4 text-[#0d3d24]" />
                ) : someSelected ? (
                  <MinusSquare className="w-4 h-4 text-[#d48b14]" />
                ) : (
                  <Square className="w-4 h-4 text-[#8c948e]" />
                )}
                <span>
                  {allNonPrimarySelected ? 'Deselect All Users' : 'Select All Users (Mark All)'}
                </span>
              </button>
            </div>

            {/* Quick Bulk Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={bulkActionLoading}
                onClick={() => handleBulkAction('grant_all')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d3d24] text-white text-xs font-semibold hover:bg-[#154d2e] disabled:opacity-50 transition shadow-xs"
                title="Grant View, Add, Edit, and Delete to selected users"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#f3a628]" />
                <span>Grant All Permissions</span>
              </button>

              <button
                type="button"
                disabled={bulkActionLoading}
                onClick={() => handleBulkAction('view_add')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#e8ded1] text-[#0d3d24] text-xs font-semibold hover:bg-[#faf7f2] disabled:opacity-50 transition shadow-xs"
                title="Grant View and Upload access"
              >
                <Upload className="w-3.5 h-3.5 text-[#d48b14]" />
                <span>Grant View + Upload</span>
              </button>

              <button
                type="button"
                disabled={bulkActionLoading}
                onClick={() => handleBulkAction('view_only')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#e8ded1] text-[#0d3d24] text-xs font-semibold hover:bg-[#faf7f2] disabled:opacity-50 transition shadow-xs"
                title="Set to View-Only access"
              >
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>Set View Only</span>
              </button>

              <button
                type="button"
                disabled={bulkActionLoading}
                onClick={() => handleBulkAction('revoke_all')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 transition shadow-xs"
                title="Revoke all document permissions"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" />
                <span>Revoke All Permissions</span>
              </button>

              {bulkActionLoading && (
                <div className="flex items-center gap-1 text-xs text-[#0d3d24] font-medium ml-2">
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Applying bulk changes...</span>
                </div>
              )}
            </div>
          </div>

          {/* New User Form Collapse */}
          {showAddUser && (
            <div className="p-5 rounded-2xl bg-[#faf7f2] border border-[#e8ded1] shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <h4 className="text-sm font-bold text-[#0d3d24] mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#d48b14]" />
                Create New User Account
              </h4>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1e2420] mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Almaz Bekele"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8ded1] bg-white text-[#1e2420] focus:ring-1 focus:ring-[#0d3d24] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1e2420] mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="e.g. almaz@ethiopiatravel.com"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8ded1] bg-white text-[#1e2420] focus:ring-1 focus:ring-[#0d3d24] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1e2420] mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8ded1] bg-white text-[#1e2420] focus:ring-1 focus:ring-[#0d3d24] outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#e8ded1]/80">
                  <span className="block text-xs font-semibold text-[#1e2420] mb-2">
                    Permissions & Access:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-[#e8ded1] cursor-pointer hover:border-[#0d3d24]">
                      <input
                        type="checkbox"
                        checked={newCanView}
                        onChange={(e) => setNewCanView(e.target.checked)}
                        className="rounded text-[#0d3d24] focus:ring-0"
                      />
                      <span className="font-medium text-[#1e2420]">View Documents</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-[#e8ded1] cursor-pointer hover:border-[#0d3d24]">
                      <input
                        type="checkbox"
                        checked={newCanAdd}
                        onChange={(e) => setNewCanAdd(e.target.checked)}
                        className="rounded text-[#0d3d24] focus:ring-0"
                      />
                      <span className="font-medium text-[#1e2420]">Add / Upload</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-[#e8ded1] cursor-pointer hover:border-[#0d3d24]">
                      <input
                        type="checkbox"
                        checked={newCanEdit}
                        onChange={(e) => setNewCanEdit(e.target.checked)}
                        className="rounded text-[#0d3d24] focus:ring-0"
                      />
                      <span className="font-medium text-[#1e2420]">Edit Metadata</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-[#e8ded1] cursor-pointer hover:border-[#0d3d24]">
                      <input
                        type="checkbox"
                        checked={newCanDelete}
                        onChange={(e) => setNewCanDelete(e.target.checked)}
                        className="rounded text-[#0d3d24] focus:ring-0"
                      />
                      <span className="font-medium text-[#1e2420]">Delete Documents</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddUser(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-[#5e6660] hover:bg-[#e8ded1]/50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingUser}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#0d3d24] text-white text-xs font-semibold hover:bg-[#154d2e] disabled:opacity-50 transition"
                  >
                    {creatingUser && <RotateCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Create User Account</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* User Search & Table Header */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#d48b14]" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0d3d24]">
                  Registered User Accounts ({users.length})
                </h4>
              </div>

              <div className="flex items-center gap-2">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#8c948e] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[#e8ded1] bg-white focus:outline-none focus:ring-1 focus:ring-[#0d3d24] text-[#1e2420] w-52 sm:w-64"
                  />
                </div>

                <button
                  onClick={fetchUsers}
                  className="p-1.5 rounded-xl border border-[#e8ded1] bg-white text-[#5e6660] hover:text-[#0d3d24] transition shadow-2xs"
                  title="Refresh users"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {loading && users.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <RotateCw className="w-6 h-6 text-[#0d3d24] animate-spin mb-2" />
                <p className="text-xs text-[#5e6660]">Loading users list...</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[#e8ded1] shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#f4efe6] text-[#0d3d24] font-semibold border-b border-[#e8ded1]">
                    <tr>
                      <th className="py-3 px-3.5 w-10 text-center">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          className="cursor-pointer"
                          title="Select / Deselect all users"
                        >
                          {allNonPrimarySelected ? (
                            <CheckSquare className="w-4 h-4 text-[#0d3d24]" />
                          ) : someSelected ? (
                            <MinusSquare className="w-4 h-4 text-[#d48b14]" />
                          ) : (
                            <Square className="w-4 h-4 text-[#8c948e]" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-3">User & Email</th>
                      <th className="py-3 px-2 text-center">Role</th>
                      <th className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span>View</span>
                          <button
                            type="button"
                            onClick={() => handleBulkColumnToggle('can_view_documents', true)}
                            className="text-[10px] text-[#0d3d24] hover:text-[#d48b14] underline"
                            title="Enable View for all selected"
                          >
                            All
                          </button>
                        </div>
                      </th>
                      <th className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span>Upload</span>
                          <button
                            type="button"
                            onClick={() => handleBulkColumnToggle('can_add_documents', true)}
                            className="text-[10px] text-[#0d3d24] hover:text-[#d48b14] underline"
                            title="Enable Upload for all selected"
                          >
                            All
                          </button>
                        </div>
                      </th>
                      <th className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span>Edit</span>
                          <button
                            type="button"
                            onClick={() => handleBulkColumnToggle('can_edit_documents', true)}
                            className="text-[10px] text-[#0d3d24] hover:text-[#d48b14] underline"
                            title="Enable Edit for all selected"
                          >
                            All
                          </button>
                        </div>
                      </th>
                      <th className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span>Delete</span>
                          <button
                            type="button"
                            onClick={() => handleBulkColumnToggle('can_delete_documents', true)}
                            className="text-[10px] text-[#0d3d24] hover:text-[#d48b14] underline"
                            title="Enable Delete for all selected"
                          >
                            All
                          </button>
                        </div>
                      </th>
                      <th className="py-3 px-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e8ded1]/70 bg-white">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-[#5e6660]">
                          No users match your search query.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const perms = userPerms[u.id] || {
                          role: u.role,
                          can_view_documents: u.can_view_documents,
                          can_add_documents: u.can_add_documents,
                          can_edit_documents: u.can_edit_documents,
                          can_delete_documents: u.can_delete_documents,
                        };
                        const isPrimaryAdmin = u.id === 1;
                        const isSelected = selectedIds.has(u.id);

                        return (
                          <tr
                            key={u.id}
                            className={`hover:bg-[#faf7f2]/60 transition ${
                              isSelected ? 'bg-amber-50/40' : ''
                            }`}
                          >
                            {/* Checkbox */}
                            <td className="py-3 px-3.5 text-center">
                              {!isPrimaryAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleSelectUser(u.id)}
                                  className="cursor-pointer"
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-[#0d3d24]" />
                                  ) : (
                                    <Square className="w-4 h-4 text-[#8c948e]" />
                                  )}
                                </button>
                              ) : (
                                <span title="Primary Admin" className="inline-flex justify-center w-full">
                                  <Shield className="w-4 h-4 text-[#d48b14] mx-auto opacity-70" />
                                </span>
                              )}
                            </td>

                            {/* User details */}
                            <td className="py-3 px-3">
                              <div className="font-bold text-[#1e2420] text-xs sm:text-sm">
                                {u.name}
                              </div>
                              <div className="text-[11px] text-[#5e6660]">
                                {u.email}
                              </div>
                            </td>

                            {/* Role Badge */}
                            <td className="py-3 px-2 text-center">
                              {isPrimaryAdmin ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#d48b14]/15 text-[#d48b14] border border-[#d48b14]/30">
                                  Primary
                                </span>
                              ) : perms.role === 'admin' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Admin
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-700">
                                  User
                                </span>
                              )}
                            </td>

                            {/* View Toggle */}
                            <td className="py-3 px-2 text-center">
                              <input
                                type="checkbox"
                                disabled={isPrimaryAdmin}
                                checked={perms.can_view_documents}
                                onChange={() => handleTogglePermission(u.id, 'can_view_documents')}
                                className="w-4 h-4 rounded text-[#0d3d24] focus:ring-0 cursor-pointer disabled:opacity-60"
                              />
                            </td>

                            {/* Add Toggle */}
                            <td className="py-3 px-2 text-center">
                              <input
                                type="checkbox"
                                disabled={isPrimaryAdmin}
                                checked={perms.can_add_documents}
                                onChange={() => handleTogglePermission(u.id, 'can_add_documents')}
                                className="w-4 h-4 rounded text-[#0d3d24] focus:ring-0 cursor-pointer disabled:opacity-60"
                              />
                            </td>

                            {/* Edit Toggle */}
                            <td className="py-3 px-2 text-center">
                              <input
                                type="checkbox"
                                disabled={isPrimaryAdmin}
                                checked={perms.can_edit_documents}
                                onChange={() => handleTogglePermission(u.id, 'can_edit_documents')}
                                className="w-4 h-4 rounded text-[#0d3d24] focus:ring-0 cursor-pointer disabled:opacity-60"
                              />
                            </td>

                            {/* Delete Toggle */}
                            <td className="py-3 px-2 text-center">
                              <input
                                type="checkbox"
                                disabled={isPrimaryAdmin}
                                checked={perms.can_delete_documents}
                                onChange={() => handleTogglePermission(u.id, 'can_delete_documents')}
                                className="w-4 h-4 rounded text-[#0d3d24] focus:ring-0 cursor-pointer disabled:opacity-60"
                              />
                            </td>

                            {/* Actions */}
                            <td className="py-3 px-3.5 text-right whitespace-nowrap">
                              {!isPrimaryAdmin && (
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    disabled={savingId === u.id}
                                    onClick={() => handleSaveUserPermissions(u.id)}
                                    className="px-2.5 py-1 rounded-lg bg-[#0d3d24] text-white text-[11px] font-semibold hover:bg-[#154d2e] disabled:opacity-50 transition shadow-2xs flex items-center gap-1"
                                    title="Save changes for this user"
                                  >
                                    {savingId === u.id ? (
                                      <RotateCw className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Check className="w-3 h-3 text-[#f3a628]" />
                                    )}
                                    <span>Save</span>
                                  </button>

                                  {u.id !== currentUser?.id && (
                                    <button
                                      type="button"
                                      disabled={savingId === u.id}
                                      onClick={() => handleDeleteUser(u.id, u.name)}
                                      className="p-1 rounded-lg text-red-600 hover:bg-red-50 transition"
                                      title="Delete user"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-[#faf7f2] border-t border-[#e8ded1] flex items-center justify-between text-xs text-[#5e6660]">
          <span>
            {selectedIds.size > 0
              ? `${selectedIds.size} of ${nonPrimaryUsers.length} user(s) selected.`
              : 'Select individual users or use Mark All to apply bulk permission changes.'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-[#e8ded1] text-[#0d3d24] font-semibold hover:bg-[#f4efe6] transition shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
