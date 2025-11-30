/**
 * OpenAI Stream Service Exports (GPT-5 Responses API Only)
 */

// Export the main streaming function
export { streamCompletionCallback } from "./streamingRefactored";

// Export modular components for advanced usage
export { discoverMCPTools } from "./mcp/toolDiscovery";
export { executeToolCallsInParallel } from "./mcp/toolExecution";
export { initializeOpenAIClient, buildInputItems, buildStreamParams } from "./client/openaiClient";
export { runConversationLoop } from "./conversation/conversationLoop";
export { TextEmitter } from "./streaming/textEmitter";
export { processStreamChunk, initializeStreamState } from "./streaming/streamProcessor";

// Export types
export type { MCPToolConfig } from "./mcp/toolDiscovery";
export type { ToolCall, ToolResult } from "./mcp/toolExecution";
export type { StreamState } from "./streaming/streamProcessor";
export type { ConversationConfig, ConversationResult, ResponseInputItem } from "./conversation/conversationLoop";
