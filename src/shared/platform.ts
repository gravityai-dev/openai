/**
 * Shared platform dependencies for all OpenAI services
 */
import { getPlatformDependencies } from "@gravityai-dev/plugin-base";

// Get platform dependencies once
const deps = getPlatformDependencies();

export const getNodeCredentials = deps.getNodeCredentials;
export const saveTokenUsage = deps.saveTokenUsage;
export const createLogger = deps.createLogger;
export const getConfig = deps.getConfig;
export const getRedisClient = deps.getRedisClient;

// Create shared loggers
export const openAILogger = createLogger("OpenAI");
export const openAIStreamLogger = createLogger("OpenAIStream");
export const openAIServiceLogger = createLogger("OpenAIService");
export const embeddingLogger = createLogger("OpenAIEmbedding");

// Single channel for all events
export const OUTPUT_CHANNEL = "gravity:output";

/**
 * Build a unified GravityEvent structure
 */
export function buildOutputEvent(config: {
  eventType: string;
  chatId: string;
  conversationId: string;
  userId: string;
  providerId?: string;
  data: Record<string, any>;
}): Record<string, any> {
  // Ensure required fields
  if (!config.chatId || !config.conversationId || !config.userId) {
    throw new Error("chatId, conversationId, and userId are required");
  }

  // Build unified message structure
  return {
    id: Math.random().toString(36).substring(2, 15),
    timestamp: new Date().toISOString(),
    providerId: config.providerId || "gravity-services",
    chatId: config.chatId,
    conversationId: config.conversationId,
    userId: config.userId,
    __typename: "GravityEvent",  // Single type for all events
    type: "GRAVITY_EVENT",       // Single type enum
    eventType: config.eventType, // Distinguishes between text, progress, card, etc.
    data: config.data            // Contains the actual event data
  };
}

/**
 * Publish a message chunk event - Optimized version
 */
export async function publishMessageChunk(config: {
  text: string;
  index: number;
  chatId: string;
  conversationId: string;
  userId: string;
  providerId: string;
  workflowId?: string;
  workflowRunId?: string;
  metadata?: Record<string, any>;
}): Promise<{
  channel: string;
  success: boolean;
}> {
  try {
    // Build the event structure - optimized with pre-allocated object
    const event = {
      id: Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toISOString(),
      providerId: config.providerId,
      chatId: config.chatId,
      conversationId: config.conversationId,
      userId: config.userId,
      __typename: "GravityEvent",
      type: "GRAVITY_EVENT",
      eventType: "messageChunk",
      data: {
        text: config.text,
        index: config.index,
        metadata: {
          ...config.metadata,
          workflowId: config.workflowId,
          workflowRunId: config.workflowRunId,
        },
      },
    };

    // Get Redis client from platform - workflow manages connection pooling
    const deps = getPlatformDependencies();
    const redis = deps.getRedisClient();

    // Publish to Redis Streams with minimal overhead
    const REDIS_NAMESPACE = process.env.REDIS_NAMESPACE || process.env.NODE_ENV || 'local';
    const streamKey = `${REDIS_NAMESPACE}:workflow:events:stream`;
    const conversationId = config.conversationId || "";

    await redis.xadd(
      streamKey,
      "*",
      "conversationId",
      conversationId,
      "channel",
      OUTPUT_CHANNEL,
      "message",
      JSON.stringify(event)
    );

    // Remove verbose logging for performance - only log errors
    return {
      channel: OUTPUT_CHANNEL,
      success: true,
    };
  } catch (error: any) {
    const logger = createLogger("MessageChunkPublisher");
    logger.error("Failed to publish message chunk", {
      error: error.message,
      providerId: config.providerId,
    });
    throw error;
  }
}
