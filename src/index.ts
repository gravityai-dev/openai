/**
 * @gravity/openai
 * OpenAI integration for Gravity platform
 */

// Export platform dependency management
export { setPlatformDependencies } from "./platform";

// Export all nodes for registration
import { OpenAINode } from "./OpenAI/node";
import { OpenAIServiceNode } from "./OpenAIService/node";
import { OpenAIStreamNode } from "./OpenAIStream/node";
import { OpenAIEmbeddingServiceNode } from "./OpenAIEmbeddingService/node";

export const nodes = {
  OpenAI: OpenAINode,
  OpenAIService: OpenAIServiceNode,
  OpenAIStream: OpenAIStreamNode,
  OpenAIEmbeddingService: OpenAIEmbeddingServiceNode,
};

// Export services for direct use
export { createEmbedding as OpenAIEmbeddings } from "./OpenAIEmbeddingService/service/embeddings";
export { queryChatGPT } from "./OpenAI/service/queryChatGPT";
export { streamCompletion } from "./OpenAIStream/service/streaming";

// Export credential definition
export { OpenAICredential, CREDENTIAL_TYPE_NAME } from "./credentials";
