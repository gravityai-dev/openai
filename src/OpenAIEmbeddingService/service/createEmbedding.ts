/**
 * OpenAIEmbeddingService service methods
 * These methods are exposed to other nodes via service calls
 */

import { createEmbedding as createOpenAIEmbedding } from "./embeddings";
import { getPlatformDependencies, type NodeExecutionContext } from "../../platform";
import { CreateEmbeddingParams, OpenAIEmbeddingServiceConfig as OpenAIEmbeddingConfig } from "../util/types";

// The config passed from ServiceRegistry contains the full node data
interface NodeDataConfig {
  label?: string;
  config?: OpenAIEmbeddingConfig;
  credentials?: Record<string, string>;
}

/**
 * Service method: Create a single embedding
 */
export const createEmbedding = async (
  params: CreateEmbeddingParams,
  config: OpenAIEmbeddingConfig,
  context: NodeExecutionContext
): Promise<any> => {
  const { createLogger } = getPlatformDependencies();
  const logger = createLogger("OpenAIEmbeddingService");
  const { text } = params;

  // Validate input
  if (!text || typeof text !== "string") {
    throw new Error("Text is required and must be a string");
  }

  if (text.trim().length === 0) {
    throw new Error("Text cannot be empty");
  }

  // Build credential context
  const credentialContext = context.credentials || {};

  // Config is nested - the actual settings are in config.config
  const actualConfig = ("config" in config && config.config ? config.config : config) as Partial<OpenAIEmbeddingConfig>;
  const modelToUse = actualConfig.model || "text-embedding-3-small";

  // Generate embedding using OpenAI service
  const result = await createOpenAIEmbedding(
    text,
    {
      model: modelToUse,
      dimensions: actualConfig.dimensions,
      normalize: actualConfig.normalize !== false,
    },
    credentialContext,
    context.workflowId
      ? {
          workflowId: context.workflowId,
          executionId: context.executionId,
          nodeId: context.nodeId,
        }
      : undefined
  );

  return {
    embedding: result.embedding,
    dimensions: result.embedding.length,
    model: modelToUse,
    usage: result.usage,
  };
};
