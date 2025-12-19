/**
 * Tool Call Handler
 * Processes tool calls and determines conversation flow
 */

import { executeToolCallsInParallel, MCPTraceContext } from "../mcp/toolExecution";
import { StreamState } from "../streaming/streamProcessor";
import { ResponseInputItem, MCPResult } from "./types";

// Tools that return data for LLM to use (don't end conversation)
const DATA_TOOLS = ["searchKnowledgeBase", "getChunksByQuery", "getActiveMCPs"];

export interface ToolHandlerResult {
  shouldEndConversation: boolean;
  mcpResults: MCPResult[];
  toolOutputs: ResponseInputItem[];
}

/**
 * Check if any tool is a workflow MCP (ends conversation)
 */
export function hasWorkflowMCP(toolCalls: any[]): boolean {
  return toolCalls.some((tc) => !DATA_TOOLS.includes(tc.function.name));
}

/**
 * Parse tool result to JSON
 */
function parseToolResult(content: string): any {
  try {
    return JSON.parse(content || "{}");
  } catch {
    return content;
  }
}

/**
 * Process tool calls and return results
 */
export async function handleToolCalls(
  streamState: StreamState,
  mcpService: Record<string, (input: any) => Promise<any>>,
  logger: any,
  traceContext?: MCPTraceContext
): Promise<ToolHandlerResult> {
  logger.info(`🔧 Model requested ${streamState.toolCalls.length} tool call(s)`);

  // Execute all tool calls in parallel
  const toolResults = await executeToolCallsInParallel(streamState.toolCalls, mcpService, logger, traceContext);

  // Check if workflow MCP was called
  const isWorkflowMCP = hasWorkflowMCP(streamState.toolCalls);

  // Build MCP results for emission
  const mcpResults: MCPResult[] = streamState.toolCalls.map((toolCall, index) => ({
    name: toolCall.function.name,
    arguments: JSON.parse(toolCall.function.arguments),
    result: parseToolResult(toolResults[index]?.content),
  }));

  // Build tool outputs for next iteration (only if not workflow MCP)
  const toolOutputs: ResponseInputItem[] = isWorkflowMCP
    ? []
    : toolResults.map((result, i) => ({
        type: "function_call_output" as const,
        call_id: streamState.toolCalls[i].id,
        output: result.content,
      }));

  return {
    shouldEndConversation: isWorkflowMCP,
    mcpResults,
    toolOutputs,
  };
}
