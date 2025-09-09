/**
 * Type definitions for OpenAI Stream node
 */

export interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
export interface OpenAIStreamConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  prompt: string;
  redisChannel: string;
  history?: OpenAIMessage[];
}

export interface StreamingMetadata {
  workflowId: string;
  executionId: string;
  chatId?: string;
  conversationId?: string;
  userId?: string;
  providerId?: string;
}

export interface StreamChunkMessage {
  isChunk: boolean;
  chunkIndex: number;
  content: string;
  metadata: StreamingMetadata;
}

export interface StreamCompletionMessage {
  isComplete: boolean;
  totalChunks: number;
  metadata: StreamingMetadata;
}

export interface StreamUsageStats {
  estimated: boolean;
  total_tokens: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  chunk_count: number;
  full_text?: string;
}

export interface OpenAIStreamServiceOutput {
  text: string;
  usage: StreamUsageStats;
  channel: string;
}

export interface OpenAICredentials {
  apiKey: string;
  organizationId?: string;
  baseUrl?: string;
}

export interface OpenAIStreamOutput {
  __outputs: {
    text: string;
    usage: StreamUsageStats;
  };
}
