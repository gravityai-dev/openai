/**
 * Stream Processor (GPT-5 Responses API Only)
 * Processes GPT-5 event-based streaming chunks
 */

import { ToolCall } from "../mcp/toolExecution";
import { processResponsesApiEvent } from "./responsesApiHandler";

export interface StreamState {
  fullText: string;
  iterationText: string;
  reasoning: string;
  toolCalls: ToolCall[];
  outputItems: any[]; // ALL output items from response (reasoning, function_calls, etc)
  responseId: string | null; // Response ID for chaining with previous_response_id
  usage: any;
  finishReason: string | null;
}

/**
 * Process a single stream chunk and update state
 * GPT-5 Responses API only - event-based format
 */
export function processStreamChunk(chunk: any, state: StreamState): StreamState {
  // Process Responses API event
  if (chunk.type) {
    return processResponsesApiEvent(chunk, state);
  }

  // Unknown format - return state unchanged
  return state;
}

/**
 * Initialize stream state for a new iteration
 */
export function initializeStreamState(
  previousFullText: string = "",
  previousReasoning: string = "",
  previousUsage: any = {}
): StreamState {
  return {
    fullText: previousFullText,
    iterationText: "",
    reasoning: previousReasoning,
    toolCalls: [],
    outputItems: [],
    responseId: null,
    usage: previousUsage, // Preserve usage across iterations
    finishReason: null,
  };
}
