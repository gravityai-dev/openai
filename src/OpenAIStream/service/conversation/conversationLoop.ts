/**
 * Conversation Loop (GPT-5 Responses API Only)
 * Manages multi-turn conversation with tool calling using input items
 */

import OpenAI from "openai";
import { executeToolCallsInParallel, ToolCall } from "../mcp/toolExecution";
import { processStreamChunk, initializeStreamState, StreamState } from "../streaming/streamProcessor";
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
}

export interface ConversationResult {
  fullText: string;
  reasoning: string;
  usage: any;
  finishReason: string | null;
  toolCalls?: Array<{ name: string; arguments: any; result?: string }>;
}

/**
 * Run the main conversation loop with tool calling support (GPT-5 only)
 */
export async function runConversationLoop(config: ConversationConfig): Promise<ConversationResult> {
  const { openai, streamParams, inputItems, mcpService, textEmitter, reasoningEmitter, emit, emitMcpResult, logger } =
    config;
  const maxIterations = config.maxIterations || 10; // Restored: Responses API DOES support multi-turn function calling

  let conversationComplete = false;
  let iteration = 0;
  let streamState = initializeStreamState();
  let previousResponseId: string | null = null;
  const allToolCalls: Array<{ name: string; arguments: any; result?: string }> = [];

  while (!conversationComplete && iteration < maxIterations) {
    iteration++;
    logger.info(`Conversation iteration ${iteration}`);

    // Update input with latest items (including function_call_outputs)
    streamParams.input = inputItems;

    // Use previous_response_id for multi-turn (after first iteration)
    if (previousResponseId && iteration > 1) {
      streamParams.previous_response_id = previousResponseId;
      logger.info(`🔗 Chaining with previous_response_id: ${previousResponseId}, input items: ${inputItems.length}`);
    }

    // Force tool use on first iteration, then let model decide
    // This ensures the model always searches the knowledge base first
    if (streamParams.tools && streamParams.tools.length > 0) {
      streamParams.tool_choice = iteration === 1 ? "required" : "auto";
      logger.info(`🔧 Tool choice for iteration ${iteration}: ${streamParams.tool_choice}`);
    }

    // Create new stream for this iteration (GPT-5 Responses API)
    logger.info(`Creating stream with model: ${streamParams.model}`);
    logger.info(`🔍 Reasoning config:`, {
      model: streamParams.model,
      reasoning: streamParams.reasoning,
      hasReasoningConfig: !!streamParams.reasoning,
      reasoningEffort: streamParams.reasoning?.effort,
      reasoningSummary: streamParams.reasoning?.summary,
    });

    // Use the OpenAI SDK's responses.create method
    // The Responses API is accessed directly, not under beta
    logger.info("🌊🌊🌊 [CREATING STREAM] About to call openai.responses.create with params:", {
      hasTools: !!streamParams.tools,
      toolCount: streamParams.tools?.length || 0,
      tool_choice: streamParams.tool_choice,
      toolNames: streamParams.tools?.map((t: any) => t.name),
    });
    const stream = await (openai as any).responses.create(streamParams);
    logger.info("✅ [STREAM CREATED] Stream object received, starting to process chunks...");

    // Reset state for this iteration (keep fullText, reasoning, and usage)
    streamState = initializeStreamState(streamState.fullText, streamState.reasoning, streamState.usage);

    // Process all chunks in the stream
    let chunkCount = 0;
    try {
      for await (const chunk of stream) {
        chunkCount++;

        // Log EVERY chunk type for first 5 chunks
        if (chunkCount <= 5) {
          logger.info(`📦 [CHUNK ${chunkCount}] Type: ${chunk.type}`);
        }

        // Log reasoning-related events with FULL detail
        if (chunk.type.includes("reasoning")) {
          logger.info(`🧠 REASONING EVENT ${chunkCount}: ${chunk.type}`);
          logger.info(`🧠 FULL REASONING CHUNK:`, JSON.stringify(chunk, null, 2));
        }

        // Log output item added events (reasoning items have id starting with "rs_")
        if (chunk.type === "response.output_item.added" && chunk.item?.id?.startsWith("rs_")) {
          logger.info(`🧠 REASONING ITEM ADDED:`, JSON.stringify(chunk, null, 2));
        }

        const previousReasoning = streamState.reasoning;
        const previousText = streamState.fullText;
        streamState = processStreamChunk(chunk, streamState);

        // Emit text chunks as they arrive (calculate from state change, not chunk structure)
        const newCharsCount = streamState.fullText.length - previousText.length;
        if (newCharsCount > 0) {
          textEmitter.emitIfNeeded(streamState.fullText, newCharsCount);
        }

        // Emit reasoning chunks as they arrive
        const newReasoningChars = streamState.reasoning.length - previousReasoning.length;
        if (newReasoningChars > 0) {
          logger.info(`🧠 EMITTING REASONING: ${newReasoningChars} new chars, total: ${streamState.reasoning.length}`);
          reasoningEmitter.emitIfNeeded(streamState.reasoning, newReasoningChars);
        }
      }
      logger.info(`✅ Processed ${chunkCount} total chunks`);
      logger.info(`📊 Stream state after iteration ${iteration}:`, {
        fullTextLength: streamState.fullText.length,
        reasoningLength: streamState.reasoning.length,
        hasReasoning: streamState.reasoning.length > 0,
        toolCallsCount: streamState.toolCalls.length,
        finishReason: streamState.finishReason,
      });
    } catch (streamError: any) {
      logger.error(`❌ Stream processing error after ${chunkCount} chunks:`, {
        error: streamError.message,
        stack: streamError.stack,
      });
      throw streamError;
    }

    // Check if model wants to call tools
    logger.info(
      `🔍🔍🔍 [TOOL CHECK] After iteration ${iteration}: toolCalls.length = ${streamState.toolCalls.length}, finishReason = ${streamState.finishReason}`
    );
    if (streamState.toolCalls.length > 0) {
      if (mcpService) {
        logger.info(`🔧 Model requested ${streamState.toolCalls.length} tool call(s)`);

        // Add assistant message output item (if there was text before tool calls)
        if (streamState.iterationText) {
          inputItems.push({
            type: "message",
            role: "assistant",
            content: streamState.iterationText,
          });
        }

        // Execute all tool calls in parallel
        const toolResults = await executeToolCallsInParallel(streamState.toolCalls, mcpService, logger);

        // Track tool calls and emit each result
        streamState.toolCalls.forEach((toolCall, index) => {
          // Parse the result back to JSON object for cleaner output
          // (toolResults[].content is stringified for OpenAI API)
          let parsedResult: any;
          try {
            parsedResult = JSON.parse(toolResults[index]?.content || "{}");
          } catch {
            parsedResult = toolResults[index]?.content;
          }

          const mcpResult = {
            name: toolCall.function.name,
            arguments: JSON.parse(toolCall.function.arguments),
            result: parsedResult,
          };

          allToolCalls.push(mcpResult);

          // Emit MCP result through dedicated output connector
          logger.info(`📤 Emitting mcpResult: ${mcpResult.name}`);
          emitMcpResult(mcpResult);
        });

        // Save response ID for next iteration
        previousResponseId = streamState.responseId;

        // When using previous_response_id, the API automatically includes ALL output items
        // from that response (reasoning, function_calls, messages, etc.)
        // We ONLY need to add the function_call_output items
        logger.info(
          `📤 Using previous_response_id: ${previousResponseId} (auto-includes ${streamState.outputItems.length} output items)`
        );

        // Add function call outputs only
        for (let i = 0; i < toolResults.length; i++) {
          inputItems.push({
            type: "function_call_output",
            call_id: streamState.toolCalls[i].id,
            output: toolResults[i].content,
          });
        }

        logger.info(`📤 Added ${toolResults.length} function_call_output items for next iteration`);

        // Continue conversation - loop will iterate again
      } else {
        // Tools were requested but no MCP service is connected.
        // Instruct the model to answer directly without tools and continue the loop.
        logger.warn(
          `🛠️ Tool calls requested (${streamState.toolCalls.length}) but no MCP service connected. Instructing model to answer without tools.`
        );

        // Preserve assistant message (if any) from this iteration
        if (streamState.iterationText) {
          inputItems.push({
            type: "message",
            role: "assistant",
            content: streamState.iterationText,
          });
        }

        // Add a directive to the instructions to avoid tools
        streamParams.instructions =
          (streamParams.instructions || "") +
          "\n\nTools are unavailable in this environment. Do not call tools. Provide the best possible direct answer to the user.";

        // Keep the same input (user's original query)
        logger.info(`🔁 Continuing conversation without tools (added directive).`);
        // Loop will continue without marking completion
      }
    } else {
      // No tool calls - conversation is complete
      logger.info(`✨ Conversation complete (finish_reason: ${streamState.finishReason})`);
      logger.info(`📊 Final usage:`, { usage: JSON.stringify(streamState.usage, null, 2) });
      conversationComplete = true;
    }
  }

  if (iteration >= maxIterations) {
    logger.warn(`⚠️ Max iterations (${maxIterations}) reached, stopping conversation`);
  }

  logger.info(`🔍 [conversationLoop] streamState.usage keys:`, Object.keys(streamState.usage));
  logger.info(`🔍 [conversationLoop] streamState.usage:`, streamState.usage);
  logger.info(`🔍 [conversationLoop] Returning usage:`, JSON.stringify(streamState.usage, null, 2));

  return {
    fullText: streamState.fullText,
    reasoning: streamState.reasoning,
    usage: streamState.usage,
    finishReason: streamState.finishReason,
    toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
  };
}
