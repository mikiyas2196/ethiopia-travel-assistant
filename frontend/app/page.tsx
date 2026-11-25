'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { ChatInterface } from '../components/ChatInterface';
import { DashboardView } from '../components/DashboardView';
import { DocumentManager } from '../components/DocumentManager';
import { UploadModal } from '../components/UploadModal';
import { DocumentDetailModal } from '../components/DocumentDetailModal';
import { EditDocumentModal } from '../components/EditDocumentModal';
import { LoginModal } from '../components/LoginModal';
import { DocumentViewerModal } from '../components/DocumentViewerModal';
import { UserManagementModal } from '../components/UserManagementModal';
import { AdminUser, DocumentItem } from '../types';
import { api } from '../services/api';

export default function Home() {
  const [currentTab, setCurrentTab] = useState<'chat' | 'dashboard' | 'documents' | 'upload'>('chat');
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [categories, setCategories] = useState<string[]>([
    'UNESCO World Heritage & Historic Sites',
    'National Parks, Wildlife & Nature Reserves',
    'Lakes, Waterfalls, Mountains & Scenery',
    'Cities, Museums, Parks & Cultural Experiences',
    'Hotels, Resorts & Travel Agencies',
  ]);

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [detailDocId, setDetailDocId] = useState<number | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [viewerDoc, setViewerDoc] = useState<DocumentItem | null>(null);

  // Initialize auth & categories
  useEffect(() => {
    const user = api.getCurrentUser();
    setCurrentUser(user);

    api.getCategories().then((cats) => {
      if (cats.length > 0) {
        setCategories(cats.filter((c) => c.toLowerCase() !== 'other'));
      }
    }).catch(() => {});
  }, []);

  const handleCategoryCreated = (newCat: string, allCats?: string[]) => {
    if (allCats && allCats.length > 0) {
      setCategories(allCats.filter((c) => c.toLowerCase() !== 'other'));
    } else if (newCat) {
      setCategories((prev) =>
        Array.from(new Set([...prev.filter((c) => c.toLowerCase() !== 'other'), newCat]))
      );
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {
      // Fallback cleanup
    } finally {
      setCurrentUser(null);
    }
  };

  const handleTabChange = (tab: 'chat' | 'dashboard' | 'documents' | 'upload') => {
    if (tab === 'upload') {
      if (!currentUser) {
        setIsLoginModalOpen(true);
      } else if (!currentUser.is_admin && !currentUser.can_add_documents) {
        alert('You do not have permission to upload documents. Please ask an administrator to grant you document upload privileges.');
      } else {
        setIsUploadModalOpen(true);
      }
      return;
    }
    setCurrentTab(tab);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf7f2]">
      {/* Navigation Bar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleTabChange}
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
      />

      {/* Main Content Area (padded for fixed top navbar) */}
      <main className="flex-1 pt-[112px] md:pt-20">
        {currentTab === 'chat' && (
          <ChatInterface
            onNavigateToUpload={() => handleTabChange('upload')}
            currentUser={currentUser}
          />
        )}

        {currentTab === 'dashboard' && (
          <DashboardView
            onNavigateToUpload={() => handleTabChange('upload')}
            onNavigateToDocuments={() => setCurrentTab('documents')}
            currentUser={currentUser}
          />
        )}

        {currentTab === 'documents' && (
          <DocumentManager
            onOpenUpload={() => handleTabChange('upload')}
            onViewDetails={(id) => setDetailDocId(id)}
            onViewFile={(doc) => setViewerDoc(doc)}
            onEditDocument={(doc) => setEditingDoc(doc)}
            isAuthenticated={!!currentUser}
            currentUser={currentUser}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            categories={categories}
            onCategoryCreated={handleCategoryCreated}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e8ded1] bg-white/70 py-4 text-center text-xs text-[#5e6660]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-medium text-[#0d3d24]">
            <span>Ethiopian Tourist Destination Assistant</span>
            <span className="text-[#d48b14]">•</span>
            <span className="text-[11px] text-[#5e6660]">AI-Powered RAG Engine</span>
          </div>
          <div className="text-[11px]">
            UNESCO World Heritage • National Parks • Scenery • Culture • Hospitality
          </div>
        </div>
      </footer>

      {/* Upload Document Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          setIsUploadModalOpen(false);
          setCurrentTab('documents');
        }}
        categories={categories}
        onCategoryCreated={handleCategoryCreated}
      />

      {/* In-Browser Document Viewer Modal (PDF & Interactive Excel/CSV Spreadsheet Viewer) */}
      <DocumentViewerModal
        document={viewerDoc}
        isOpen={!!viewerDoc}
        onClose={() => setViewerDoc(null)}
      />

      {/* Document Details Modal */}
      <DocumentDetailModal
        documentId={detailDocId}
        onClose={() => setDetailDocId(null)}
        onViewFile={(doc) => {
          setDetailDocId(null);
          setViewerDoc(doc);
        }}
      />

      {/* Edit Document Modal */}
      <EditDocumentModal
        document={editingDoc}
        isOpen={!!editingDoc}
        onClose={() => setEditingDoc(null)}
        onSuccess={() => {
          setEditingDoc(null);
        }}
        categories={categories}
        onCategoryCreated={handleCategoryCreated}
      />

      {/* User & Permissions Management Modal (Admin Only) */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        currentUser={currentUser}
      />

      {/* Account Login / Registration Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    </div>
  );
}
