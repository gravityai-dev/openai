/**
 * Conversation Loop (GPT-5 Responses API Only)
 * Orchestrates multi-turn conversation with tool calling
 */

import OpenAI from "openai";
import { initializeStreamState, StreamState } from "../streaming/streamProcessor";
import { ConversationConfig, ConversationResult, MCPResult } from "./types";
import { processStream } from "./streamHandler";
import { handleToolCalls } from "./toolHandler";

// Re-export types for backwards compatibility
export type { ConversationConfig, ConversationResult, ResponseInputItem } from "./types";

/**
 * Create OpenAI stream for an iteration
 */
async function createStream(openai: OpenAI, streamParams: any, logger: any): Promise<AsyncIterable<any>> {
  logger.info("🌊 Creating stream", {
    model: streamParams.model,
    toolCount: streamParams.tools?.length || 0,
    toolChoice: streamParams.tool_choice,
  });
  return (openai as any).responses.create(streamParams);
}

/**
 * Prepare stream params for iteration
 */
function prepareIteration(
  streamParams: any,
  inputItems: any[],
  iteration: number,
  previousResponseId: string | null
): void {
  streamParams.input = inputItems;

  if (previousResponseId && iteration > 1) {
    streamParams.previous_response_id = previousResponseId;
  }

  if (streamParams.tools?.length > 0) {
    streamParams.tool_choice = "auto"; // Let LLM decide when to use tools
  }
}

/**
 * Run the main conversation loop
 */
export async function runConversationLoop(config: ConversationConfig): Promise<ConversationResult> {
  const {
    openai,
    streamParams,
    inputItems,
    mcpService,
    textEmitter,
    reasoningEmitter,
    emitMcpResult,
    logger,
    traceContext,
  } = config;

  const maxIterations = config.maxIterations || 10;
  const allToolCalls: MCPResult[] = [];

  let streamState: StreamState = initializeStreamState();
  let previousResponseId: string | null = null;
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;
    logger.info(`Conversation iteration ${iteration}`);

    // Prepare params for this iteration
    prepareIteration(streamParams, inputItems, iteration, previousResponseId);

    // Create and process stream
    const stream = await createStream(openai, streamParams, logger);
    streamState = await processStream(stream, streamState, { textEmitter, reasoningEmitter, logger });

    logger.info(`📊 Iteration ${iteration} complete`, {
      textLength: streamState.fullText.length,
      toolCalls: streamState.toolCalls.length,
    });

    // No tool calls = conversation complete
    if (streamState.toolCalls.length === 0) {
      logger.info(`✨ Conversation complete`);
      break;
    }

    // Handle tool calls
    if (!mcpService) {
      logger.warn(`🛠️ Tools requested but no MCP service connected`);
      streamParams.instructions += "\n\nTools unavailable. Answer directly.";
      continue;
    }

    // Add assistant text if any
    if (streamState.iterationText) {
      inputItems.push({ type: "message", role: "assistant", content: streamState.iterationText });
    }

    // Execute tools
    const toolResult = await handleToolCalls(streamState, mcpService, logger, traceContext);

    // Emit results
    toolResult.mcpResults.forEach((r) => {
      allToolCalls.push(r);
      emitMcpResult(r);
    });

    // Workflow MCP ends conversation
    if (toolResult.shouldEndConversation) {
      logger.info(`🎯 Workflow MCP detected - ending conversation`);
      break;
    }

    // Continue with tool outputs
    previousResponseId = streamState.responseId;
    inputItems.push(...toolResult.toolOutputs);
    logger.info(`📤 Added ${toolResult.toolOutputs.length} tool outputs for next iteration`);
  }

  if (iteration >= maxIterations) {
    logger.warn(`⚠️ Max iterations reached`);
  }

  return {
    fullText: streamState.fullText,
    reasoning: streamState.reasoning,
    usage: streamState.usage,
    finishReason: streamState.finishReason,
    toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
  };
}
