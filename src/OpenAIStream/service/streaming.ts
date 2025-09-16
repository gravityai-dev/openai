/**
 * OpenAI Streaming Service
 */

import {
  createLogger,
  getConfig,
  getNodeCredentials,
  saveTokenUsage,
  publishMessageChunk,
} from "../../shared/platform";
import OpenAI from "openai";
import { OpenAIStreamConfig, StreamingMetadata, StreamUsageStats, OpenAICredentials } from "../util/types";

type CredentialContext = any;

// Track active streaming sessions to prevent concurrent streams per conversation
const activeStreams = new Map<string, string>();

/**
 * Stream a completion using OpenAI's chat API
 */
export async function streamCompletion(
  config: OpenAIStreamConfig,
  metadata: StreamingMetadata,
  context: CredentialContext,
  logger?: any,
  executionContext?: { workflowId: string; executionId: string; nodeId: string }
): Promise<StreamUsageStats> {
  // Use provided logger or fall back to base logger
  const activeLogger = logger;

  try {
    // DEBUG: Log the metadata to see what conversationId we received
    const executionId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log("🔍 [streamCompletion] Metadata received:", {
      conversationId: metadata.conversationId,
      chatId: metadata.chatId,
      workflowId: metadata.workflowId,
      executionId: executionId,
    });

    // Fetch credentials internally
    const credentials = (await getNodeCredentials(context, "openAICredential")) as OpenAICredentials;

    if (!credentials?.apiKey) {
      throw new Error("OpenAI API key not found in credentials");
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: credentials.apiKey,
      organization: credentials.organizationId || undefined,
      baseURL: credentials.baseUrl || undefined,
    });

    // Build messages array
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (config.systemPrompt) {
      messages.push({
        role: "system",
        content: config.systemPrompt,
      });
    }

    // Add conversation history if provided
    if (config.history && Array.isArray(config.history)) {
      messages.push(...config.history);
    }

    // Add the current prompt as the final user message
    messages.push({
      role: "user",
      content: config.prompt,
    });

    // Create the streaming request with usage tracking
    const stream = await openai.chat.completions.create({
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: true,
      stream_options: {
        include_usage: true,
      },
    });

    // Use the new unified message chunk publisher
    const providerId = "ChatGPT Stream";

    // Process the stream with optimized batching
    let chunkIndex = 0;
    let fullText = "";
    let batchedContent = "";
    const BATCH_SIZE = 55; // Increased batch size for better performance
    const BATCH_TIME_MS = 50; // Time-based batching for smoother streaming
    let lastBatchTime = Date.now();
    let usage: any = null;

    for await (const chunk of stream) {
      // Check for usage data in the final chunk
      if (chunk.usage) {
        usage = chunk.usage;
      }

      const content = chunk.choices[0]?.delta?.content || "";

      if (content && content.length > 0) {
        fullText += content;
        batchedContent += content;

        const now = Date.now();
        const timeSinceLastBatch = now - lastBatchTime;

        // Publish based on content size OR time elapsed for smoother streaming
        if (batchedContent.length >= BATCH_SIZE || timeSinceLastBatch >= BATCH_TIME_MS) {
          chunkIndex++;

          // Remove console.log for performance - only log errors
          await publishMessageChunk({
            text: batchedContent,
            index: chunkIndex,
            chatId: metadata.chatId || "",
            conversationId: metadata.conversationId || "",
            userId: metadata.userId || "",
            providerId: providerId,
            workflowId: metadata.workflowId,
            workflowRunId: metadata.workflowId,
            metadata: metadata,
          });

          // Reset batch
          batchedContent = "";
          lastBatchTime = now;
        }
      }
    }

    // Publish any remaining content in the final batch
    if (batchedContent.length > 0) {
      chunkIndex++;
      await publishMessageChunk({
        text: batchedContent,
        index: chunkIndex,
        chatId: metadata.chatId || "",
        conversationId: metadata.conversationId || "",
        userId: metadata.userId || "",
        providerId: providerId,
        workflowId: metadata.workflowId,
        workflowRunId: metadata.workflowId,
        metadata: metadata,
      });
      console.log(`📦 [${executionId}] Published final batch ${chunkIndex} (${batchedContent.length} chars)`);
    }
    // Save token usage if execution context provided and we have usage data
    if (executionContext && usage) {
      await saveTokenUsage({
        workflowId: executionContext.workflowId,
        executionId: executionContext.executionId,
        nodeId: executionContext.nodeId,
        nodeType: "OpenAIStream",
        model: config.model,
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        timestamp: new Date(),
      });
      activeLogger.info(`Stream token usage saved: ${usage.total_tokens} tokens for model ${config.model}`);
    }

    return {
      estimated: true,
      total_tokens: chunkIndex,
      chunk_count: chunkIndex,
      full_text: fullText, // Return the accumulated text
    };
  } catch (error: any) {
    activeLogger.error("Failed to stream completion", { error });
    throw new Error(`Failed to stream completion: ${error.message}`);
  }
}
