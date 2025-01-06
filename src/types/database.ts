export interface PDF {
  id: string;
  user_id: string;
  name: string;
  file_path: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  pdf_id: string;
  user_id: string;
  content: string;
  is_ai: boolean;
  created_at: string;
}