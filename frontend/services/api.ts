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

  // Knowledge Base Metadata APIs
  async getStatistics(): Promise<KnowledgeBaseStats> {
    const res = await request<{ success: boolean; statistics: KnowledgeBaseStats }>('/knowledge-base/statistics');
    return res.statistics;
  },

  async getCategories(): Promise<string[]> {
    const res = await request<{ success: boolean; categories: string[] }>('/knowledge-base/categories');
    return res.categories || [];
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
      await request('/auth/logout', { method: 'POST' });
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
    }

    const response = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();
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
    }

    const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
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
