import { getPlatformDependencies, type EnhancedNodeDefinition } from "@gravityai-dev/plugin-base";
import OpenAIEmbeddingServiceExecutor from "./executor";

/**
 * OpenAIEmbeddingService - Dedicated Service Node
 *
 * This is a PURE SERVICE NODE that provides embedding services to other nodes.
 * It is NOT part of workflow execution - it responds to serviceConnector calls.
 *
 * Key differences from regular workflow nodes:
 * - isService: true (not part of workflow execution)
 * - No inputs/outputs (services don't have workflow I/O)
 * - serviceType and methods define what it provides
 * - Always available for service calls
 */
const definition: EnhancedNodeDefinition = {
  type: "OpenAIEmbeddingService",
  name: "Embedding Service",
  description: "OpenAI embedding service",
  category: "AI",
  color: "#2F6F66",
  logoUrl: "https://res.cloudinary.com/sonik/image/upload/v1749262616/gravity/icons/ChatGPT-Logo.svg.webp",

  // Node template for styling
  template: "service", // Options: "standard", "service", "mini"

  // NO REGULAR INPUTS/OUTPUTS - services use service connectors
  inputs: [],
  outputs: [],

  // SERVICE CONNECTORS - defines what services this node provides
  serviceConnectors: [
    {
      name: "embeddingService",
      description: "Provides embedding generation services",
      serviceType: "embedding",
      methods: ["createEmbedding", "createBatchEmbeddings"],
      isService: true, // This node PROVIDES embedding services to others
    },
  ],

  // Configuration for service
  configSchema: {
    type: "object",
    properties: {
      model: {
        type: "string",
        title: "Embedding Model",
        description: "Select model and dimensions (combined)",
        enum: [
          "text-embedding-3-small",
          "text-embedding-3-small-1536",
          "text-embedding-3-large-1024",
          "text-embedding-3-large",
          "text-embedding-3-large-3072",
          "text-embedding-ada-002"
        ],
        enumNames: [
          "text-embedding-3-small (512D) - Fast",
          "text-embedding-3-small (1536D) - Higher quality",
          "text-embedding-3-large (1024D) - Bedrock compatible ⭐",
          "text-embedding-3-large (1536D) - Best quality",
          "text-embedding-3-large (3072D) - Maximum",
          "text-embedding-ada-002 (1536D) - Legacy"
        ],
        default: "text-embedding-3-large",
        "ui:help": "Recommended: text-embedding-3-large (1536D) for best quality spatial UMAP visualization"
      },
      normalize: {
        type: "boolean",
        title: "Normalize Embeddings",
        description: "Normalize to unit length (recommended for cosine similarity)",
        default: true,
        "ui:widget": "toggle",
      },
    },
    required: ["model"],
  },

  credentials: [
    {
      name: "openaiCredential",
      required: true,
      displayName: "OpenAI Credentials",
      description: "OpenAI API credentials for accessing embedding API",
    },
  ],
};

// Export as enhanced node
export const OpenAIEmbeddingServiceNode = {
  definition,
  executor: OpenAIEmbeddingServiceExecutor,
};

// Export for node registry
export { definition };
