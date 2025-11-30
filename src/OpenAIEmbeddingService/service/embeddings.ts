/**
 * OpenAI Embeddings Service
 * Provides embedding generation using OpenAI API
 */

import OpenAI from "openai";
import { getNodeCredentials, saveTokenUsage, embeddingLogger } from "../../shared/platform";
import { OpenAIEmbeddingOptions, OpenAIEmbeddingResponse } from "../util/types";

// Get logger instance
const logger = embeddingLogger();

type CredentialContext = any;

/**
 * Normalize a vector to unit length
 */
function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return magnitude > 0 ? vector.map((val) => val / magnitude) : vector;
}

/**
 * Create a single embedding using OpenAI's API
 */
export async function createEmbedding(
  text: string,
  options: OpenAIEmbeddingOptions,
  credentialContext: CredentialContext,
  executionContext?: { workflowId: string; executionId: string; nodeId: string }
): Promise<OpenAIEmbeddingResponse> {
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
        usage: response.usage,  // Pass entire usage object
        timestamp: new Date(),
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

/**
 * Create batch embeddings using OpenAI's API
 */
export async function createBatchEmbeddings(
  texts: string[],
  options: OpenAIEmbeddingOptions,
  credentialContext: CredentialContext,
  executionContext?: { workflowId: string; executionId: string; nodeId: string }
): Promise<{ embeddings: OpenAIEmbeddingResponse[]; totalUsage: { prompt_tokens: number; total_tokens: number } }> {
  try {
    // Get OpenAI credentials
    const credentials = await getNodeCredentials(credentialContext, "openaiCredential");

    if (!credentials?.apiKey) {
      throw new Error("OpenAI API key not found in credentials");
    }

    // Process texts in batches to avoid rate limits
    const batchSize = 100;
    const results: OpenAIEmbeddingResponse[] = [];
    let totalUsage = { prompt_tokens: 0, total_tokens: 0 };

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      // Create embeddings for batch
      const batchPromises = batch.map(text => 
        createEmbedding(text, options, credentialContext, executionContext)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Accumulate usage
      batchResults.forEach(result => {
        totalUsage.prompt_tokens += result.usage?.prompt_tokens || 0;
        totalUsage.total_tokens += result.usage?.total_tokens || 0;
      });
    }

    return {
      embeddings: results,
      totalUsage
    };
  } catch (error) {
    logger.error("Failed to create batch embeddings", {
      error: error instanceof Error ? error.message : String(error),
      model: options.model,
      textCount: texts.length
    });
    throw error;
  }
}
