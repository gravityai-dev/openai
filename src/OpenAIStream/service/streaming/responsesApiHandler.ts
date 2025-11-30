/**
 * Responses API Event Handler
 * Handles GPT-5 event-based streaming format
 */

import { StreamState } from "./streamProcessor";

/**
 * Process a Responses API event chunk (GPT-5)
 * Event types: response.output_text.delta, response.reasoning_summary_text.delta,
 * response.function_call_arguments.delta, response.completed, etc.
 */
export function processResponsesApiEvent(chunk: any, state: StreamState): StreamState {
  switch (chunk.type) {
    // ===== TEXT OUTPUT =====
    case "response.output_text.delta":
      // Regular text content delta
      if (chunk.delta) {
        state.iterationText += chunk.delta;
        state.fullText += chunk.delta;
      }
      break;

    case "response.output_text.done":
      // Text output complete (optional - we already have the full text from deltas)
      break;

    // ===== REASONING =====
    case "response.reasoning_summary_text.delta":
      // Reasoning summary delta (user-visible reasoning explanation)
      if (chunk.delta) {
        state.reasoning += chunk.delta;
      }
      break;

    case "response.reasoning_summary_text.done":
      // Reasoning summary complete - already accumulated via deltas, don't replace
      break;

    case "response.reasoning_text.delta":
      // Internal reasoning content delta - ignore, too verbose
      break;

    case "response.reasoning_text.done":
      // Internal reasoning complete
      break;

    // ===== OUTPUT ITEMS =====
    case "response.output_item.added":
      // Detect when a new output item is added (function call, etc.)
      if (chunk.item?.type === "function_call") {
        // Initialize function call tracking
        state.toolCalls.push({
          id: chunk.item.call_id, // Use call_id for matching with function_call_output
          itemId: chunk.item.id, // Store item.id for matching argument deltas
          type: "function",
          function: {
            name: chunk.item.name || "", // Name is at top level
            arguments: "",
          },
        });
      }
      break;

    // ===== FUNCTION CALLING =====
    case "response.function_call_arguments.delta":
      // Function call arguments delta
      if (chunk.delta && chunk.item_id) {
        const existingCall = state.toolCalls.find((tc) => tc.itemId === chunk.item_id);
        if (existingCall) {
          existingCall.function.arguments += chunk.delta;
        }
      }
      break;

    case "response.function_call_arguments.done":
      // Function call complete - finalize with full arguments
      if (chunk.item_id) {
        const existingCall = state.toolCalls.find((tc) => tc.itemId === chunk.item_id);
        if (existingCall) {
          if (chunk.name) {
            existingCall.function.name = chunk.name;
          }
          existingCall.function.arguments = chunk.arguments;
        }
      }
      break;

    // ===== RESPONSE LIFECYCLE =====
    case "response.created":
      // Capture response ID for multi-turn conversations
      if (chunk.response?.id) {
        state.responseId = chunk.response.id;
      }
      break;

    case "response.in_progress":
    case "response.queued":
      // Informational events - no action needed
      break;

    case "response.completed":
      // Response complete
      state.finishReason = "completed";
      if (chunk.response?.usage) {
        // OpenAI Responses API provides cumulative usage across all iterations
        // when using previous_response_id, so we just replace (not accumulate)
        state.usage = chunk.response.usage;
        console.log(`📊 [responsesApiHandler] Usage captured:`, JSON.stringify(state.usage, null, 2));
      } else {
        console.warn(`⚠️ [responsesApiHandler] No usage data in response.completed event`);
        console.log(`📋 [responsesApiHandler] Full chunk:`, JSON.stringify(chunk, null, 2));
      }
      // Ensure we have the response ID
      if (chunk.response?.id && !state.responseId) {
        state.responseId = chunk.response.id;
      }
      break;

    case "response.failed":
      // Response failed
      state.finishReason = "error";
      break;

    case "response.incomplete":
      // Response incomplete (hit max tokens, etc.)
      state.finishReason = chunk.response?.incomplete_details?.reason || "incomplete";
      break;

    case "response.output_item.done":
      // Save ALL output items (reasoning, function_call, message, etc.)
      // These must be passed back to the model in multi-turn conversations
      if (chunk.item) {
        state.outputItems.push(chunk.item);
      }
      break;

    case "response.content_part.added":
    case "response.content_part.done":
    case "response.reasoning_summary_part.added":
    case "response.reasoning_summary_part.done":
      // Structural events - content comes via delta events
      break;

    // ===== REFUSALS =====
    case "response.refusal.delta":
      // Model refused to respond (safety, policy, etc.)
      if (chunk.delta) {
        state.fullText += `[REFUSAL: ${chunk.delta}]`;
      }
      break;

    case "response.refusal.done":
      // Refusal complete
      if (chunk.refusal) {
        state.fullText += `[REFUSAL: ${chunk.refusal}]`;
        state.finishReason = "refused";
      }
      break;

    // ===== MCP TOOL CALLS =====
    case "response.mcp_call_arguments.delta":
    case "response.mcp_call_arguments.done":
    case "response.mcp_call.in_progress":
    case "response.mcp_call.completed":
    case "response.mcp_call.failed":
      // MCP tool calls - similar to function calls but for MCP
      // TODO: Add MCP support if needed
      break;

    // ===== OTHER TOOL TYPES =====
    case "response.file_search_call.in_progress":
    case "response.file_search_call.searching":
    case "response.file_search_call.completed":
    case "response.web_search_call.in_progress":
    case "response.web_search_call.searching":
    case "response.web_search_call.completed":
    case "response.code_interpreter_call.in_progress":
    case "response.code_interpreter_call.interpreting":
    case "response.code_interpreter_call.completed":
    case "response.code_interpreter_call_code.delta":
    case "response.code_interpreter_call_code.done":
    case "response.image_generation_call.in_progress":
    case "response.image_generation_call.generating":
    case "response.image_generation_call.completed":
    case "response.image_generation_call.partial_image":
      // Other tool types - informational for now
      break;

    // ===== ANNOTATIONS =====
    case "response.output_text.annotation.added":
      // Text annotations (citations, etc.) - ignore for now
      break;

    // ===== CUSTOM TOOLS =====
    case "response.custom_tool_call_input.delta":
    case "response.custom_tool_call_input.done":
      // Custom tool calls - ignore for now
      break;

    // ===== ERRORS =====
    case "error":
      // Error event
      state.finishReason = "error";
      break;

    default:
      // Unknown event type - log but don't fail
      // console.warn(`Unknown Responses API event type: ${chunk.type}`);
      break;
  }

  return state;
}
