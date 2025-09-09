/**
 * OpenAIEmbeddingService batch service method
 */

import { createEmbedding } from "./embeddings";
import { getPlatformDependencies, type NodeExecutionContext } from "@gravityai-dev/plugin-base";
import { CreateBatchEmbeddingsParams, OpenAIEmbeddingServiceConfig as OpenAIEmbeddingConfig } from "../util/types";

/**
 * Service method: Create batch embeddings
 */
export const createBatchEmbeddings = async (
  params: CreateBatchEmbeddingsParams,
  config: OpenAIEmbeddingConfig,
  context: NodeExecutionContext
): Promise<any> => {
  const { createLogger } = getPlatformDependencies();
  const logger = createLogger("OpenAIEmbeddingService");

  const { texts } = params;

  // Validate input
  if (!texts || !Array.isArray(texts)) {
    throw new Error("Texts must be an array");
  }

  if (texts.length === 0) {
    throw new Error("Texts array cannot be empty");
  }

  if (texts.length > 100) {
    throw new Error("Batch size cannot exceed 100 texts");
  }

  // Validate each text
  for (let i = 0; i < texts.length; i++) {
    if (!texts[i] || typeof texts[i] !== "string") {
      throw new Error(`Text at index ${i} is invalid`);
    }
    if (texts[i].trim().length === 0) {
      throw new Error(`Text at index ${i} is empty`);
    }
  }

  // Build credential context
  const credentialContext = context.credentials || {};

  // Process embeddings in parallel with rate limiting
  const BATCH_SIZE = 10; // Process 10 at a time to avoid rate limits
  const embeddings: number[][] = [];
  let totalUsage = {
    prompt_tokens: 0,
    total_tokens: 0,
  };

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const batchPromises = batch.map((text) =>
      createEmbedding(
        text,
        {
          model: config.model || "text-embedding-3-small",
          dimensions: config.dimensions,
          normalize: config.normalize !== false,
        },
        credentialContext,
        context.workflowId
          ? {
              workflowId: context.workflowId,
              executionId: context.executionId,
              nodeId: context.nodeId,
            }
          : undefined
      )
    );

    const batchResults = await Promise.all(batchPromises);

    for (const result of batchResults) {
      embeddings.push(result.embedding);
      if (result.usage) {
        totalUsage.prompt_tokens += (result.usage as any).prompt_tokens || 0;
        totalUsage.total_tokens += result.usage.total_tokens || 0;
      }
    }

    // Add a small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return {
    embeddings,
    count: embeddings.length,
    dimensions: embeddings[0]?.length || 0,
    model: config.model || "text-embedding-3-small",
    usage: totalUsage,
  };
};
