'use client';

import React, { useState, useEffect } from 'react';
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
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
    }
  }, [isOpen]);

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

  const handleRoleChange = (userId: number, role: 'admin' | 'user') => {
    setUserPerms((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        role,
        // If promoted to admin, enable all permissions by default
        ...(role === 'admin'
          ? {
              can_view_documents: true,
              can_add_documents: true,
              can_edit_documents: true,
              can_delete_documents: true,
            }
          : {}),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#e8ded1] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#faf7f2] border-b border-[#e8ded1] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0d3d24] text-[#f3a628] flex items-center justify-center shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#0d3d24]">
                User Permissions & Access Control
              </h3>
              <p className="text-xs text-[#5e6660]">
                Control which users can view, upload, edit, and delete knowledge base documents
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddUser(!showAddUser)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0d3d24] text-white text-xs font-semibold hover:bg-[#154d2e] transition shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#f3a628]" />
              <span>{showAddUser ? 'Close Form' : 'Add New User'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#5e6660] hover:text-red-600 hover:bg-red-50 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl flex items-center gap-2 text-xs font-medium border ${
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
                    className="px-3 py-1.5 rounded-xl text-xs font-medium text-[#5e6660] hover:bg-[#e8ded1]/50"
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

          {/* Users List & Permissions Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#0d3d24] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#d48b14]" />
                System Users ({users.length})
              </h4>
              <button
                onClick={fetchUsers}
                className="text-xs text-[#5e6660] hover:text-[#0d3d24] flex items-center gap-1 font-medium"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {loading && users.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <RotateCw className="w-6 h-6 text-[#0d3d24] animate-spin mb-2" />
                <p className="text-xs text-[#5e6660]">Loading users...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => {
                  const perms = userPerms[u.id] || {
                    role: u.role,
                    can_view_documents: u.can_view_documents,
                    can_add_documents: u.can_add_documents,
                    can_edit_documents: u.can_edit_documents,
                    can_delete_documents: u.can_delete_documents,
                  };
                  const isPrimaryAdmin = u.id === 1;

                  return (
                    <div
                      key={u.id}
                      className="p-4 rounded-2xl bg-white border border-[#e8ded1] shadow-sm hover:border-[#0d3d24]/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      {/* User Info */}
                      <div className="flex items-start gap-3 min-w-[200px]">
                        <div className="w-9 h-9 rounded-xl bg-[#0d3d24]/10 text-[#0d3d24] flex items-center justify-center shrink-0 font-bold text-sm">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[#0d3d24]">
                              {u.name}
                            </span>
                            {isPrimaryAdmin ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#d48b14]/15 text-[#d48b14] border border-[#d48b14]/30">
                                Primary Admin
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
                          </div>
                          <p className="text-xs text-[#5e6660]">{u.email}</p>
                        </div>
                      </div>

                      {/* Permissions Toggles */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Can View */}
                        <button
                          type="button"
                          disabled={isPrimaryAdmin}
                          onClick={() => handleTogglePermission(u.id, 'can_view_documents')}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition border ${
                            perms.can_view_documents
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-gray-50 text-gray-500 border-gray-200 opacity-60'
                          } ${isPrimaryAdmin ? 'cursor-not-allowed opacity-90' : 'cursor-pointer hover:shadow-xs'}`}
                          title="Permission to view knowledge base documents"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </button>

                        {/* Can Add */}
                        <button
                          type="button"
                          disabled={isPrimaryAdmin}
                          onClick={() => handleTogglePermission(u.id, 'can_add_documents')}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition border ${
                            perms.can_add_documents
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : 'bg-gray-50 text-gray-500 border-gray-200 opacity-60'
                          } ${isPrimaryAdmin ? 'cursor-not-allowed opacity-90' : 'cursor-pointer hover:shadow-xs'}`}
                          title="Permission to upload new documents"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Add / Upload</span>
                        </button>

                        {/* Can Edit */}
                        <button
                          type="button"
                          disabled={isPrimaryAdmin}
                          onClick={() => handleTogglePermission(u.id, 'can_edit_documents')}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition border ${
                            perms.can_edit_documents
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-gray-50 text-gray-500 border-gray-200 opacity-60'
                          } ${isPrimaryAdmin ? 'cursor-not-allowed opacity-90' : 'cursor-pointer hover:shadow-xs'}`}
                          title="Permission to edit document metadata or reprocess"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {/* Can Delete */}
                        <button
                          type="button"
                          disabled={isPrimaryAdmin}
                          onClick={() => handleTogglePermission(u.id, 'can_delete_documents')}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition border ${
                            perms.can_delete_documents
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-gray-50 text-gray-500 border-gray-200 opacity-60'
                          } ${isPrimaryAdmin ? 'cursor-not-allowed opacity-90' : 'cursor-pointer hover:shadow-xs'}`}
                          title="Permission to delete documents from knowledge base"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>

                        {/* Save Button */}
                        {!isPrimaryAdmin && (
                          <button
                            type="button"
                            disabled={savingId === u.id}
                            onClick={() => handleSaveUserPermissions(u.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0d3d24] text-white text-xs font-semibold hover:bg-[#154d2e] disabled:opacity-50 transition shadow-xs ml-1"
                            title="Save updated permissions for this user"
                          >
                            {savingId === u.id ? (
                              <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-[#f3a628]" />
                            )}
                            <span className="hidden sm:inline">Save</span>
                          </button>
                        )}

                        {/* Delete User Button */}
                        {!isPrimaryAdmin && u.id !== currentUser?.id && (
                          <button
                            type="button"
                            disabled={savingId === u.id}
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="p-1.5 rounded-xl text-red-600 hover:bg-red-50 transition"
                            title="Delete this user account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#faf7f2] border-t border-[#e8ded1] flex items-center justify-between text-xs text-[#5e6660]">
          <span>
            Changes to permissions take effect immediately across all active user sessions.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-[#e8ded1] bg-white font-medium hover:bg-[#f4efe6] transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
