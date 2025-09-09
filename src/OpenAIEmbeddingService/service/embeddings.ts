/**
 * OpenAI Embeddings Service
 * Provides embedding generation using OpenAI API
 */

import OpenAI from "openai";
import { getPlatformDependencies } from "../../platform";
import { OpenAIEmbeddingOptions, OpenAIEmbeddingResponse } from "../util/types";

type CredentialContext = any;

/**
 * Normalize a vector to unit length
 */
function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return magnitude > 0 ? vector.map((val) => val / magnitude) : vector;
}

/**
 * Create an embedding using OpenAI's API
 */
export async function createEmbedding(
  text: string,
  options: OpenAIEmbeddingOptions,
  credentialContext: CredentialContext,
  executionContext?: { workflowId: string; executionId: string; nodeId: string }
): Promise<OpenAIEmbeddingResponse> {
  const { getNodeCredentials, createLogger, saveTokenUsage } = getPlatformDependencies();
  const logger = createLogger("OpenAIEmbeddingsService");

  try {
    // Get OpenAI credentials
    const credentials = await getNodeCredentials(credentialContext, "openaiCredential");

    if (!credentials?.apiKey) {
      throw new Error("OpenAI API key not found in credentials");
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: credentials.apiKey,
      organization: credentials.organizationId || undefined,
      baseURL: credentials.baseUrl || undefined,
    });

    logger.debug("Creating OpenAI embedding", {
      model: options.model,
      textLength: text.length,
      dimensions: options.dimensions,
    });

    // Create embedding using OpenAI SDK
    const response = await openai.embeddings.create({
      input: text,
      model: options.model,
      ...(options.dimensions && { dimensions: Number(options.dimensions) }),
      ...(options.user && { user: options.user }),
    });

    if (!response.data || !response.data[0] || !response.data[0].embedding) {
      throw new Error("Invalid response from OpenAI API");
    }

    let embedding = response.data[0].embedding;

    // Normalize if requested
    if (options.normalize) {
      embedding = normalizeVector(embedding);
    }

    logger.info("Successfully created OpenAI embedding", {
      model: options.model,
      dimensions: embedding.length,
      normalized: options.normalize,
    });

    // Save token usage if execution context provided
    if (executionContext && response.usage) {
      await saveTokenUsage({
        workflowId: executionContext.workflowId,
        executionId: executionContext.executionId,
        nodeId: executionContext.nodeId,
        nodeType: "OpenAIEmbedding",
        model: options.model,
        promptTokens: response.usage.total_tokens, // Embeddings only report total tokens
        completionTokens: 0,
        totalTokens: response.usage.total_tokens,
      });
      logger.info(`Embedding token usage saved: ${response.usage.total_tokens} tokens for model ${options.model}`);
    }

    return {
      embedding,
      dimensions: embedding.length,
      model: options.model,
      usage: {
        prompt_tokens: 0, // Embeddings don't have prompt tokens in the response
        total_tokens: response.usage?.total_tokens || 0,
      },
    };
  } catch (error) {
    logger.error("Failed to create OpenAI embedding", {
      error: error instanceof Error ? error.message : String(error),
      model: options.model,
    });
    throw error;
  }
}
