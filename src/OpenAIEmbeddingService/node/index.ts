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
        title: "Model",
        description: "Select the OpenAI embedding model to use",
        enum: ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"],
        enumNames: [
          "text-embedding-3-small (1536, fixed)",
          "text-embedding-3-large (3072, reducible)",
          "text-embedding-ada-002 (1536, fixed)",
        ],
        default: "text-embedding-3-small",
        "ui:help":
          "text-embedding-3-small supports up to 1536 dimensions, text-embedding-3-large supports up to 3072 dimensions",
      },
      normalize: {
        type: "boolean",
        title: "Normalize Embeddings",
        description: "Whether to normalize the embedding vectors (recommended for similarity search)",
        default: true,
        "ui:widget": "toggle",
      },
      dimensions: {
        type: "number",
        title: "Output Dimensions",
        description: "Number of dimensions for the output embedding (only applies to text-embedding-3-large)",
        enum: [256, 512, 1024, 1536, 3072],
        enumNames: ["256 dimensions", "512 dimensions", "1024 dimensions", "1536 dimensions", "3072 dimensions (full)"],
        "ui:help": "Only text-embedding-3-large supports dimension reduction. Other models will ignore this setting.",
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
