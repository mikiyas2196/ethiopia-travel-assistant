import {
  AdminUser,
  ChatMessage,
  DocumentChunk,
  DocumentItem,
  KnowledgeBaseStats,
  SourceCitation,
} from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * Retrieve auth token from localStorage if in browser environment.
 */
function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('ethiopia_travel_admin_token');
  }
  return null;
}

/**
 * Custom fetch wrapper with error handling and Authorization header.
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Public Chat APIs
  async sendChatMessage(question: string, sessionId?: string): Promise<{
    success: boolean;
    answer: string;
    sources: SourceCitation[];
    session_id?: string;
  }> {
    return request('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, session_id: sessionId }),
    });
  },

  async getSuggestions(): Promise<string[]> {
    const res = await request<{ success: boolean; suggestions: string[] }>('/chat/suggestions');
    return res.suggestions || [];
  },

  async getChatHistory(sessionId: string): Promise<ChatMessage[]> {
    const res = await request<{ success: boolean; messages: any[] }>(`/chat/history/${sessionId}`);
    return (res.messages || []).map((m) => ({
      id: String(m.id),
      role: m.role,
      content: m.content,
      sources: m.sources,
      timestamp: m.created_at,
    }));
  },

  async clearChatSession(sessionId: string): Promise<boolean> {
    try {
      await request(`/chat/session/${sessionId}`, {
        method: 'DELETE',
      });
      return true;
    } catch {
      return false;
    }
  },

  getAuthToken(): string | null {
    return getAuthToken();
  },

  async getUserChatSession(): Promise<{ session_id: string; messages: ChatMessage[] }> {
    const res = await request<{ success: boolean; session_id: string; messages: any[] }>('/chat/user-session');
    return {
      session_id: res.session_id,
      messages: (res.messages || []).map((m) => ({
        id: String(m.id),
        role: m.role,
        content: m.content,
        sources: m.sources,
        timestamp: m.created_at,
      })),
    };
  },

  // User & Permission Management (Admin APIs)
  async register(name: string, email: string, password: string): Promise<{ token: string; user: AdminUser }> {
    const res = await request<{ success: boolean; token: string; user: AdminUser }>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    if (res.token && typeof window !== 'undefined') {
      localStorage.setItem('ethiopia_travel_admin_token', res.token);
      localStorage.setItem('ethiopia_travel_admin_user', JSON.stringify(res.user));
    }

    return res;
  },

  async getUsers(): Promise<AdminUser[]> {
    const res = await request<{ success: boolean; users: AdminUser[] }>('/admin/users');
    return res.users || [];
  },

  async createAdminUser(userData: {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'user';
    can_view_documents: boolean;
    can_add_documents: boolean;
    can_edit_documents: boolean;
    can_delete_documents: boolean;
  }): Promise<AdminUser> {
    const res = await request<{ success: boolean; user: AdminUser }>('/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return res.user;
  },

  async updateUserPermissions(
    userId: number,
    permissions: {
      role?: 'admin' | 'user';
      can_view_documents: boolean;
      can_add_documents: boolean;
      can_edit_documents: boolean;
      can_delete_documents: boolean;
    }
  ): Promise<AdminUser> {
    const res = await request<{ success: boolean; user: AdminUser }>(`/admin/users/${userId}/permissions`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(permissions),
    });
    return res.user;
  },

  async updateBulkPermissions(params: {
    user_ids?: number[];
    target_all?: boolean;
    action?: 'grant_all' | 'revoke_all' | 'custom';
    can_view_documents?: boolean;
    can_add_documents?: boolean;
    can_edit_documents?: boolean;
    can_delete_documents?: boolean;
  }): Promise<{ success: boolean; message: string; affected_count: number }> {
    return request('/admin/users/bulk-permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  },

  async deleteUser(userId: number): Promise<{ success: boolean; message: string }> {
    return request(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  // Document Viewing & Content APIs
  getDocumentFileUrl(id: number): string {
    const token = getAuthToken() || '';
    return `${API_BASE_URL}/documents/${id}/view${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  getDocumentDownloadUrl(id: number): string {
    const token = getAuthToken() || '';
    return `${API_BASE_URL}/documents/${id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  },

  async viewSpreadsheetDocument(id: number): Promise<any> {
    return request(`/documents/${id}/view`);
  },

  // Knowledge Base Metadata APIs
  async getStatistics(): Promise<KnowledgeBaseStats> {
    const res = await request<{ success: boolean; statistics: KnowledgeBaseStats }>('/knowledge-base/statistics');
    return res.statistics;
  },

  async getCategories(): Promise<string[]> {
    const res = await request<{ success: boolean; categories: string[] }>('/knowledge-base/categories');
    return res.categories || [];
  },

  async createCategory(name: string, description?: string): Promise<{ success: boolean; message: string; category: string; categories: string[] }> {
    return await request<{ success: boolean; message: string; category: string; categories: string[] }>('/knowledge-base/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
  },

  async deleteCategory(name: string): Promise<{ success: boolean; message: string; categories: string[] }> {
    return await request<{ success: boolean; message: string; categories: string[] }>(`/knowledge-base/categories/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  },

  // Admin Authentication
  async login(email: string, password: string): Promise<{ token: string; user: AdminUser }> {
    const res = await request<{ success: boolean; token: string; user: AdminUser }>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (res.token && typeof window !== 'undefined') {
      localStorage.setItem('ethiopia_travel_admin_token', res.token);
      localStorage.setItem('ethiopia_travel_admin_user', JSON.stringify(res.user));
    }

    return res;
  },

  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' }).catch(() => {});
    } catch {
      // Ignore network or token expiration errors on logout
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ethiopia_travel_admin_token');
        localStorage.removeItem('ethiopia_travel_admin_user');
      }
    }
  },

  getCurrentUser(): AdminUser | null {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ethiopia_travel_admin_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
    }
    return null;
  },

  isAuthenticated(): boolean {
    return !!getAuthToken();
  },

  // Document Management APIs (Admin Protected)
  async getDocuments(params: {
    category?: string;
    file_type?: string;
    status?: string;
    search?: string;
    page?: number;
  } = {}): Promise<{
    data: DocumentItem[];
    meta: { current_page: number; last_page: number; per_page: number; total: number };
  }> {
    const query = new URLSearchParams();
    if (params.category) query.append('category', params.category);
    if (params.file_type) query.append('file_type', params.file_type);
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', String(params.page));

    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/documents${qs}`);
  },

  async getDocument(id: number): Promise<{
    document: DocumentItem;
    chunks_preview: DocumentChunk[];
  }> {
    return request(`/documents/${id}`);
  },

  async uploadDocument(formData: FormData): Promise<{
    success: boolean;
    message: string;
    document: DocumentItem;
  }> {
    const token = getAuthToken();
    const headers: HeadersInit = {
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      formData.append('token', token);
    }

    const currentUser = this.getCurrentUser();
    if (currentUser?.email) {
      formData.append('user_email', currentUser.email);
    }

    const qs = token ? `?token=${encodeURIComponent(token)}` : '';
    const response = await fetch(`${API_BASE_URL}/documents${qs}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    let data: any = {};
    try {
      data = await response.json();
    } catch {
      if (response.status === 413) {
        data = { message: 'The uploaded file exceeds the server upload limit. Maximum size is 70MB.' };
      } else {
        data = { message: response.statusText || `Upload failed with status ${response.status}` };
      }
    }

    if (!response.ok && response.status !== 202) {
      throw new Error(data.message || 'Upload failed');
    }

    return data;
  },

  async updateDocument(id: number, formData: FormData): Promise<{
    success: boolean;
    message: string;
    document: DocumentItem;
  }> {
    const token = getAuthToken();
    const headers: HeadersInit = {
      Accept: 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      formData.append('token', token);
    }

    const currentUser = this.getCurrentUser();
    if (currentUser?.email) {
      formData.append('user_email', currentUser.email);
    }

    const qs = token ? `?token=${encodeURIComponent(token)}` : '';
    const response = await fetch(`${API_BASE_URL}/documents/${id}${qs}`, {
      method: 'POST', // using POST to handle multipart with Laravel
      headers,
      body: formData,
    });

    const data = await response.json();
    if (!response.ok && response.status !== 202) {
      throw new Error(data.message || 'Update failed');
    }

    return data;
  },

  async deleteDocument(id: number): Promise<{ success: boolean; message: string }> {
    return request(`/documents/${id}`, {
      method: 'DELETE',
    });
  },

  async reprocessDocument(id: number): Promise<{
    success: boolean;
    message: string;
    document: DocumentItem;
  }> {
    return request(`/documents/${id}/reprocess`, {
      method: 'POST',
    });
  },
};
