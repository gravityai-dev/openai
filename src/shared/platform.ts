/**
 * Shared platform dependencies for all OpenAI services
 */
import { getPlatformDependencies } from "@gravityai-dev/plugin-base";

// Lazy getters to avoid module-level getPlatformDependencies call
function getDeps() {
  return getPlatformDependencies();
}

export const getNodeCredentials = (context: any, credentialName: string) => 
  getDeps().getNodeCredentials(context, credentialName);
export const saveTokenUsage = (usage: any) => 
  getDeps().saveTokenUsage(usage);
export const createLogger = (name: string) => 
  getDeps().createLogger(name);
export const getConfig = () => 
  getDeps().getConfig();
export const getRedisClient = () => 
  getDeps().getRedisClient();

// Create shared loggers lazily
let _openAILogger: any;
let _openAIStreamLogger: any;
let _openAIServiceLogger: any;
let _embeddingLogger: any;

export const openAILogger = () => _openAILogger || (_openAILogger = createLogger("OpenAI"));
export const openAIStreamLogger = () => _openAIStreamLogger || (_openAIStreamLogger = createLogger("OpenAIStream"));
export const openAIServiceLogger = () => _openAIServiceLogger || (_openAIServiceLogger = createLogger("OpenAIService"));
export const embeddingLogger = () => _embeddingLogger || (_embeddingLogger = createLogger("OpenAIEmbedding"));

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
    __typename: "GravityEvent", // Single type for all events
    type: "GRAVITY_EVENT", // Single type enum
    eventType: config.eventType, // Distinguishes between text, progress, card, etc.
    data: config.data, // Contains the actual event data
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
    // Build the event structure
    const event = buildOutputEvent({
      eventType: "messageChunk",
      chatId: config.chatId,
      conversationId: config.conversationId,
      userId: config.userId,
      providerId: config.providerId,
      data: {
        text: config.text,
        index: config.index,
        metadata: {
          ...config.metadata,
          workflowId: config.workflowId,
          workflowRunId: config.workflowRunId,
        },
      },
    });

    // Use the universal gravityPublish function from platform API
    const deps = getDeps();
    if (!deps.gravityPublish) {
      throw new Error("gravityPublish is not available in platform dependencies");
    }
    await deps.gravityPublish(OUTPUT_CHANNEL, event);

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
