export interface Collection {
  id: number
  name: string
  description: string
  provider: string
  api_key?: string | null
  base_url?: string | null
  llm_model: string
  embedding_model: string
  created_at: string
  updated_at: string
}

export interface CollectionCreate {
  name: string
  description?: string
  provider?: string | null
  api_key?: string | null
  base_url?: string | null
  llm_model?: string
  embedding_model?: string
}

export interface CollectionStats {
  id: number
  name: string
  doc_count: number
  chunk_count: number
}

export interface Document {
  id: number
  collection_id: number
  filename: string
  file_type: string
  file_size: number
  tags: string
  status: string
  chunk_count: number
  error_message?: string | null
  created_at: string
  updated_at: string
}

export interface Chunk {
  id: number
  document_id: number
  chunk_index: number
  content: string
  page_number?: number | null
  chroma_id: string
}

export interface SearchRequest {
  query: string
  collection_id: number
  top_k?: number
  search_type?: 'hybrid' | 'vector' | 'keyword'
}

export interface SearchResult {
  chunk_id: number
  content: string
  score: number
  document_id: number
  filename: string
  page_number?: number | null
  highlight_content?: string
}

export interface ChatRequest {
  query: string
  collection_id: number
  conversation_id?: number | null
  top_k?: number
}

export interface ChatResponse {
  answer: string
  sources: SearchResult[]
  conversation_id: number
  message_id: number
}

export interface Conversation {
  id: number
  collection_id: number
  title: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: number
  conversation_id: number
  role: 'user' | 'assistant'
  content: string
  sources_json?: string | null
  created_at: string
}
