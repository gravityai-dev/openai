/**
 * Type definitions for OpenAI Stream node
 */

export interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
export interface OpenAIStreamConfig {
  model: string;
  maxTokens?: number;
  systemPrompt?: string;
  prompt: string;
  redisChannel: string;
  history?: OpenAIMessage[];

  // GPT-5.2 Responses API parameters
  // GPT-5.2: "none", "low", "medium", "high", "xhigh"
  // GPT-5-mini/nano: "minimal", "low", "medium", "high"
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high" | "xhigh";
  reasoningSummary?: "auto" | "concise" | "detailed"; // Control reasoning summary generation
  verbosity?: "low" | "medium" | "high";
  enablePreambles?: boolean; // Auto-inject preamble instruction
  enableMarkdown?: boolean; // Auto-inject Markdown formatting instruction

  // Conversation management (Responses API)
  conversationId?: string; // Use Conversation API for context
  previousResponseId?: string; // Continue from previous response

  // MCP tool configuration (standard JSON format)
  tools?: any[];
  mcpService?: Record<string, (input: any) => Promise<any>>;
  // Note: MCPs are now discovered generically, no query needed
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
  reasoning_tokens?: number;
  chunk_count: number;
  full_text?: string;
  reasoning?: string;
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
    reasoning?: string;
    usage: StreamUsageStats;
  };
}

export interface MCPResult {
  name: string;
  arguments: any;
  result: any;
}

export interface OpenAIStreamState {
  chunk: string; // Streaming text chunks (matches node output)
  text: string; // Complete generated text (matches node output)
  reasoning?: string; // Reasoning/thinking from model (o1, o1-mini)
  usage: StreamUsageStats; // Token usage stats (internal tracking)
  hasStartedStreaming?: boolean; // Track if streaming has been initiated
}

// Final return type from streaming service (wrapped in __outputs)
// chunk is only used during incremental emit() calls, not in final return
export interface OpenAIStreamFinalOutput {
  __outputs: {
    text: string;
    reasoning?: string;
    mcpResult?: MCPResult;
  };
}
