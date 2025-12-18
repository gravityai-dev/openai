/**
 * OpenAI Client Setup (GPT-5.2 Responses API)
 * Handles client initialization and input item building
 */

import OpenAI from "openai";
import { getNodeCredentials } from "../../../shared/platform";
import { OpenAIStreamConfig, OpenAICredentials } from "../../util/types";
import { ResponseInputItem } from "../conversation/conversationLoop";

/**
 * Initialize OpenAI client with credentials
 */
export async function initializeOpenAIClient(context: any, logger: any): Promise<OpenAI> {
  const credentials = (await getNodeCredentials(context, "openAICredential")) as OpenAICredentials;

  if (!credentials?.apiKey) {
    throw new Error("OpenAI API key not found in credentials");
  }

  logger.info("Initializing OpenAI client");

  return new OpenAI({
    apiKey: credentials.apiKey,
    organization: credentials.organizationId || undefined,
    baseURL: credentials.baseUrl || undefined,
  });
}

/**
 * Build input items array from config (Responses API format)
 */
export function buildInputItems(config: OpenAIStreamConfig): ResponseInputItem[] {
  const inputItems: ResponseInputItem[] = [];
  const hasTools = Array.isArray(config.tools) && config.tools.length > 0;

  // Build system prompt with optional preamble instruction
  let systemPrompt = config.systemPrompt || "";

  // Add preamble instruction if enabled (GPT-5 feature)
  if (hasTools && config.enablePreambles !== false) {
    // Default true, but only when tools exist
    const preambleInstruction = "\n\nBefore you call a tool, explain why you are calling it.";
    systemPrompt = systemPrompt ? systemPrompt + preambleInstruction : preambleInstruction.trim();
  }

  // If no tools are available, explicitly instruct the model to answer directly
  if (!hasTools) {
    const noToolsInstruction =
      "\n\nTools are unavailable in this environment. Do not call tools. Provide the best possible direct answer to the user.";
    systemPrompt = systemPrompt ? systemPrompt + noToolsInstruction : noToolsInstruction.trim();
  }

  // Add Markdown formatting instruction if enabled
  if (config.enableMarkdown) {
    const markdownInstruction =
      "\n\nUse Markdown formatting where semantically correct (e.g., `inline code`, ```code fences```, lists, tables). Use backticks for file, directory, function, and class names.";
    systemPrompt = systemPrompt ? systemPrompt + markdownInstruction : markdownInstruction.trim();
  }

  // Add system message if we have one
  if (systemPrompt) {
    inputItems.push({
      type: "message",
      role: "system",
      content: systemPrompt,
    });
  }

  // Add conversation history if provided (convert to input items)
  if (config.history && Array.isArray(config.history)) {
    for (const msg of config.history) {
      inputItems.push({
        type: "message",
        role: msg.role as "user" | "assistant" | "system",
        content: typeof msg.content === "string" ? msg.content : msg.content,
      });
    }
  }

  // Add the current prompt as the final user message
  inputItems.push({
    type: "message",
    role: "user",
    content: config.prompt,
  });

  return inputItems;
}

/**
 * Build streaming parameters (GPT-5 Responses API only)
 */
export function buildStreamParams(config: OpenAIStreamConfig, inputItems: ResponseInputItem[], tools?: any[]): any {
  // Separate system messages from other input items
  let instructions = "";
  const nonSystemItems: ResponseInputItem[] = [];

  for (const item of inputItems) {
    if (item.type === "message" && item.role === "system") {
      // Extract system message to instructions parameter
      instructions = item.content as string;
    } else {
      // Keep all non-system messages in the input array
      nonSystemItems.push(item);
    }
  }

  const streamParams: any = {
    model: config.model,
    stream: true,
    input: nonSystemItems, // Pass user/assistant messages as array
  };

  // Add instructions (system message) as separate parameter
  if (instructions) {
    streamParams.instructions = instructions;
  }

  // If we have conversation history, we should ideally use:
  // 1. conversation parameter with a conversation ID
  // 2. previous_response_id to continue from last response
  if (config.conversationId) {
    // Use conversation API for proper context management
    streamParams.conversation = config.conversationId;
  } else if (config.previousResponseId) {
    // Use previous response ID to continue conversation
    streamParams.previous_response_id = config.previousResponseId;
  }

  // Add reasoning effort (GPT-5.2)
  // GPT-5.2 supports: "none", "low", "medium", "high", "xhigh"
  // GPT-5-mini/nano only support: "minimal", "low", "medium", "high"
  const isGpt52 = config.model?.startsWith("gpt-5.2");
  let reasoningEffort = config.reasoningEffort || (isGpt52 ? "none" : "minimal");

  // Map GPT-5.2 specific values to compatible values for older models
  if (!isGpt52) {
    if (reasoningEffort === "none") {
      reasoningEffort = "minimal";
    } else if (reasoningEffort === "xhigh") {
      reasoningEffort = "high";
    }
  }

  const reasoningSummary = config.reasoningSummary || "concise";

  streamParams.reasoning = {
    effort: reasoningEffort,
    summary: reasoningSummary,
  };

  // Text format and verbosity for output (GPT-5.2)
  streamParams.text = {
    format: {
      type: "text",
    },
    verbosity: config.verbosity || "medium", // low, medium, or high
  };

  // Add max_output_tokens (GPT-5 uses this)
  // Default to 4096 if not specified to ensure the model can generate output
  streamParams.max_output_tokens = config.maxTokens || 4096;

  // Add tools if available
  if (tools && tools.length > 0) {
    streamParams.tools = tools;

    // tool_choice is set dynamically in conversationLoop:
    // - iteration 1: "required" (force knowledge base search)
    // - iteration 2+: "auto" (allow model to respond with text)
    // Do NOT set it here - let conversationLoop control it

    // Limit to one tool call per turn for predictable behavior
    // This prevents the model from calling multiple tools simultaneously
    streamParams.parallel_tool_calls = false;
  }

  return streamParams;
}
