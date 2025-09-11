/**
 * OpenAI Streaming Service
 */

import { getNodeCredentials, saveTokenUsage, openAIStreamLogger as logger, getConfig } from "../../shared/platform";
import { getMessageChunkPublisher } from "@gravityai-dev/gravity-server";
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

    // Create publisher with required parameters
    const appConfig = getConfig();
    const providerId = "ChatGPT Stream";

    // This will either initialize the singleton or return the existing instance
    const publisher = getMessageChunkPublisher(
      appConfig.REDIS_HOST,
      appConfig.REDIS_PORT,
      appConfig.REDIS_PASSWORD,
      providerId,
      appConfig.REDIS_USERNAME
    );

    // Process the stream with batched chunks for smoother streaming
    let chunkIndex = 0;
    let fullText = "";
    let batchedContent = "";
    const BATCH_SIZE = 10; // Batch 5 tokens into one chunk for smoother streaming
    let tokenCount = 0;
    let usage: any = null;

    for await (const chunk of stream) {
      // Check for usage data in the final chunk
      if (chunk.usage) {
        usage = chunk.usage;
      }

      const content = chunk.choices[0]?.delta?.content || "";

      if (content && content.length > 0) {
        tokenCount++;
        fullText += content;
        batchedContent += content;

        // Publish batched chunks for smoother streaming experience
        if (tokenCount >= BATCH_SIZE || batchedContent.length >= 20) {
          chunkIndex++;

          // Reduced logging for better debugging
          if (chunkIndex % 5 === 1) {
            console.log(`📦 [${executionId}] Publishing batch ${chunkIndex} (${batchedContent.length} chars)...`);
          }

          await publisher.publishMessageChunk(
            batchedContent,
            {
              chatId: metadata.chatId,
              conversationId: metadata.conversationId,
              userId: metadata.userId,
              providerId: providerId,
            },
            chunkIndex,
            { channel: config.redisChannel }
          );

          // Log every 10th batch to reduce noise
          if (chunkIndex % 10 === 0) {
            activeLogger.info(`Published batch ${chunkIndex}`, {
              channel: config.redisChannel,
              workflowId: metadata.workflowId,
              batchSize: batchedContent.length,
            });
          }

          // Reset batch
          batchedContent = "";
          tokenCount = 0;
        }
      }
    }

    // Publish any remaining content in the final batch
    if (batchedContent.length > 0) {
      chunkIndex++;
      await publisher.publishMessageChunk(
        batchedContent,
        {
          chatId: metadata.chatId,
          conversationId: metadata.conversationId,
          userId: metadata.userId,
          providerId: providerId,
        },
        chunkIndex,
        { channel: config.redisChannel }
      );
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
