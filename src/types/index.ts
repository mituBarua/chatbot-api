// API Request/Response types
export interface CreateBotRequest {
  name: string;
  website?: string;
  systemPrompt: string;
  monthlyLimit: number;
}

export interface Bot extends CreateBotRequest {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddKnowledgeRequest {
  title: string;
  content: string;
}

export interface Knowledge extends AddKnowledgeRequest {
  id: string;
  botId: string;
  createdAt: string;
}

export interface ChatRequest {
  botId: string;
  sessionId: string;
  message: string;
}

export interface ChatResponse {
  success: boolean;
  reply?: string;
  usage?: {
    used: number;
    limit: number;
    remaining: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface Conversation {
  id: string;
  botId: string;
  sessionId: string;
  userMessage: string;
  aiReply: string;
  createdAt: string;
}

export interface Usage {
  botId: string;
  yearMonth: string;
  messageCount: number;
  conversationCount: number;
  updatedAt: string;
}

export interface BotStats {
  botId: string;
  month: string;
  messages: number;
  conversations: number;
  remaining: number;
}

// Error response type
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}