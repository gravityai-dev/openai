/**
 * Conversation Loop Types
 */

import OpenAI from "openai";
import { MCPTraceContext } from "../mcp/toolExecution";
import { TextEmitter } from "../streaming/textEmitter";
import { ReasoningEmitter } from "../streaming/reasoningEmitter";

// Responses API input item types
export type ResponseInputItem =
  | { type: "message"; role: "user" | "assistant" | "system"; content: string | any[] }
  | { type: "function_call"; id: string; function: { name: string; arguments: string } }
  | { type: "function_call_output"; call_id: string; output: string };

export interface ConversationConfig {
  openai: OpenAI;
  streamParams: any;
  inputItems: ResponseInputItem[];
  mcpService?: Record<string, (input: any) => Promise<any>>;
  textEmitter: TextEmitter;
  reasoningEmitter: ReasoningEmitter;
  emit: (output: any) => void;
  emitMcpResult: (result: { name: string; arguments: any; result: any }) => void;
  logger: any;
  maxIterations?: number;
  traceContext?: MCPTraceContext;
}

export interface ConversationResult {
  fullText: string;
  reasoning: string;
  usage: any;
  finishReason: string | null;
  toolCalls?: Array<{ name: string; arguments: any; result?: string }>;
}

export interface MCPResult {
  name: string;
  arguments: any;
  result: any;
}
