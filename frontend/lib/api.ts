const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Types ──────────────────────────────────────────────────

export interface DocumentInfo {
  id: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  num_pages: number;
  num_chunks: number;
  uploaded_at: string;
}

export interface ChunkInfo {
  chunk_id: string;
  chunk_index: number;
  text: string;
  text_preview?: string;
  page_number: number;
  token_count: number;
  metadata?: Record<string, unknown>;
}

export interface SourceInfo {
  chunk_id: string;
  document_name: string;
  page_number: number;
  text: string;
  relevance_score: number;
  rerank_score: number;
}

export interface RetrievalMetadata {
  total_chunks_searched: number;
  vector_candidates: number;
  bm25_candidates: number;
  after_fusion: number;
  after_reranking: number;
  retrieval_time_ms: number;
  generation_time_ms: number;
}

export interface RecentQuery {
  question: string;
  confidence: number;
  timestamp: string;
}

export interface StatsResponse {
  total_documents: number;
  total_chunks: number;
  avg_chunk_tokens: number;
  total_queries: number;
  avg_confidence: number;
  avg_retrieval_time_ms: number;
  recent_queries: RecentQuery[];
  documents_by_type: Record<string, number>;
}

export interface DocumentsListResponse {
  documents: DocumentInfo[];
  total: number;
}

export interface ChunksListResponse {
  chunks: ChunkInfo[];
  total: number;
  page: number;
  per_page: number;
}

export interface UploadResponse {
  documents: DocumentInfo[];
}

export interface ChatResponse {
  answer: string;
  sources: SourceInfo[];
  confidence: number;
  retrieval_metadata: RetrievalMetadata;
}

// ── Helpers ───────────────────────────────────────────────

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    return body?.detail || fallback;
  } catch {
    return fallback;
  }
}

// ── API Functions ──────────────────────────────────────────

export async function fetchStats(): Promise<StatsResponse> {
  const res = await fetch(`${API_BASE}/api/stats`);
  if (!res.ok) throw new Error(await parseError(res, `Failed to fetch stats: ${res.statusText}`));
  return res.json();
}

export async function fetchDocuments(): Promise<DocumentsListResponse> {
  const res = await fetch(`${API_BASE}/api/documents`);
  if (!res.ok) throw new Error(await parseError(res, `Failed to fetch documents: ${res.statusText}`));
  return res.json();
}

export async function uploadDocuments(files: File[]): Promise<UploadResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const res = await fetch(`${API_BASE}/api/documents/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(await parseError(res, `Upload failed: ${res.statusText}`));
  return res.json();
}

export async function deleteDocument(id: string): Promise<{ deleted: boolean }> {
  const res = await fetch(`${API_BASE}/api/documents/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await parseError(res, `Delete failed: ${res.statusText}`));
  return res.json();
}

export async function fetchChunks(
  docId: string,
  page: number = 1,
  perPage: number = 20
): Promise<ChunksListResponse> {
  const res = await fetch(
    `${API_BASE}/api/documents/${docId}/chunks?page=${page}&per_page=${perPage}`
  );
  if (!res.ok) throw new Error(await parseError(res, `Failed to fetch chunks: ${res.statusText}`));
  return res.json();
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export async function chatStream(
  question: string,
  topK: number = 5,
  useReranking: boolean = true,
  conversationHistory: ConversationMessage[] = []
): Promise<Response> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      top_k: topK,
      use_reranking: useReranking,
      conversation_history: conversationHistory,
    }),
  });
  if (!res.ok) throw new Error(await parseError(res, `Chat failed: ${res.statusText}`));
  return res;
}

// ── Evaluation API ─────────────────────────────────────

export interface EvalScores {
  faithfulness: number;
  answer_relevancy: number;
  context_precision: number;
  context_recall: number;
  answer_correctness: number;
  hallucination_rate: number;
}

export interface EvalResultRow {
  dataset: string;
  config: string;
  faithfulness: number;
  answer_relevancy: number;
  context_precision: number;
  context_recall: number;
  answer_correctness: number;
  hallucination_rate: number;
  num_questions: number;
  avg_retrieval_time_ms: number;
  avg_answer_time_ms: number;
}

export interface EvalResults {
  run_id: string;
  completed_at: string;
  duration_seconds: number;
  total_questions: number;
  overall: EvalScores;
  by_dataset: Record<string, EvalScores>;
  by_config: Record<string, EvalScores>;
  matrix: EvalResultRow[];
}

export interface EvalRun {
  id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  total_questions?: number;
  progress?: string;
  error_message?: string;
}

export interface EvalStatus {
  status: string;
  run_id?: string;
  progress?: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  error_message?: string;
}

export async function startEvalRun(): Promise<{ run_id: string; status: string }> {
  const res = await fetch(`${API_BASE}/api/eval/run`, { method: "POST" });
  if (!res.ok) throw new Error(await parseError(res, "Failed to start eval"));
  return res.json();
}

export async function fetchEvalStatus(): Promise<EvalStatus> {
  const res = await fetch(`${API_BASE}/api/eval/status`);
  if (!res.ok) throw new Error(await parseError(res, "Failed to fetch eval status"));
  return res.json();
}

export async function fetchEvalResults(): Promise<EvalResults> {
  const res = await fetch(`${API_BASE}/api/eval/results`);
  if (!res.ok) throw new Error(await parseError(res, "Failed to fetch eval results"));
  return res.json();
}

export async function fetchEvalHistory(): Promise<{ runs: EvalRun[] }> {
  const res = await fetch(`${API_BASE}/api/eval/history`);
  if (!res.ok) throw new Error(await parseError(res, "Failed to fetch eval history"));
  return res.json();
}
