/**
 * OpenAIEmbeddingService service methods
 * These methods are exposed to other nodes via service calls
 */

import { type NodeExecutionContext } from "@gravityai-dev/plugin-base";
import { createEmbedding as generateEmbedding } from "./embeddings";
import { embeddingLogger } from "../../shared/platform";

// Get logger instance
const logger = embeddingLogger();

/**
 * Service method: Create a single embedding
 */
export const createEmbedding = async (params: any, config: any, context: NodeExecutionContext): Promise<any> => {
  const { text } = params;
  const processedText = text?.trim() || "";

  if (!processedText) {
    throw new Error("Text is required for embedding generation");
  }

  logger.info("OpenAIEmbeddingService createEmbedding called", {
    textLength: processedText.length,
    textPreview: processedText.substring(0, 50),
    config,
    configModel: config.model,
    configDimensions: config.dimensions,
    configNormalize: config.normalize,
  });

  // Build config for OpenAI service
  const openaiConfig = {
    model: config.model || "text-embedding-3-large",
    dimensions: config.dimensions ? parseInt(config.dimensions, 10) : 1536,
    normalize: config.normalize !== false,
  };

  // Build credential context
  const credentialContext = buildCredentialContext(context, "OpenAIEmbeddingService");

  logger.info("Calling generateEmbedding with config", {
    model: openaiConfig.model,
    dimensions: openaiConfig.dimensions,
    normalize: openaiConfig.normalize,
    textLength: processedText.length,
  });

  // Generate embedding using shared service with credential context
  const result = await generateEmbedding(processedText, openaiConfig, credentialContext);

  logger.info("Embedding generated successfully", {
    embeddingLength: result.embedding.length,
    firstValues: result.embedding.slice(0, 5),
  });

  return {
    embedding: result.embedding,
    dimensions: result.dimensions,
    model: result.model,
  };
};

/**
 * Build credential context from execution context
 */
function buildCredentialContext(context: NodeExecutionContext, nodeType: string) {
  return {
    workflowId: context.workflowId,
    executionId: context.executionId,
    nodeId: context.nodeId,
    nodeType: nodeType,
    config: context.config,
    credentials: context.credentials || {},
  };
}
