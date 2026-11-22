export interface SourceCitation {
  document_id: number;
  title: string;
  category: string;
  source_name?: string | null;
  source_url?: string | null;
  similarity?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceCitation[];
  timestamp: string;
}

export interface DocumentItem {
  id: number;
  title: string;
  description: string | null;
  category: string;
  original_filename: string;
  stored_file_path: string;
  file_type: 'pdf' | 'xlsx' | 'xls' | 'csv';
  extracted_content?: string | null;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error: string | null;
  source_name: string | null;
  source_url: string | null;
  file_size: number | null;
  chunk_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: number;
  document_id: number;
  chunk_index: number;
  content: string;
  metadata: Record<string, unknown> | null;
  token_count: number | null;
  created_at: string;
}

export interface KnowledgeBaseStats {
  total_documents: number;
  completed_documents: number;
  pending_documents: number;
  processing_documents?: number;
  failed_documents: number;
  total_chunks: number;
  total_embeddings: number;
  categories_breakdown: Record<string, number>;
  file_types_breakdown: Record<string, number>;
  recent_documents: DocumentItem[];
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  is_admin: boolean;
  can_view_documents: boolean;
  can_add_documents: boolean;
  can_edit_documents: boolean;
  can_delete_documents: boolean;
  created_at?: string;
}

export interface SpreadsheetSheet {
  title: string;
  headers: string[];
  rows: string[][];
  total_rows: number;
}

export interface SpreadsheetPreviewResponse {
  success: boolean;
  type: 'spreadsheet';
  document: DocumentItem;
  data: {
    sheets: SpreadsheetSheet[];
    sheet_count: number;
  };
}
