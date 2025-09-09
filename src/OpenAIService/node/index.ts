/**
 * OpenAIService - Dedicated Service Node
 *
 * This is a PURE SERVICE NODE that provides LLM services to other nodes.
 * It is NOT part of workflow execution - it responds to serviceConnector calls.
 *
 * Key features:
 * - isService: true (not part of workflow execution)
 * - No inputs/outputs (services don't have workflow I/O)
 * - serviceType and methods define what it provides
 * - Always available for service calls
 */

import { type EnhancedNodeDefinition } from "@gravityai-dev/plugin-base";
import OpenAIServiceExecutor from "./executor";

const definition: EnhancedNodeDefinition = {
  type: "OpenAIService",
  name: "OpenAI Service",
  description: "OpenAI service provider",
  category: "AI",
  color: "#2F6F66",
  logoUrl: "https://res.cloudinary.com/sonik/image/upload/v1749262616/gravity/icons/ChatGPT-Logo.svg.webp",

  // SERVICE NODE - responds to SERVICE_CALL signals
  isService: true,

  // NO REGULAR INPUTS/OUTPUTS - services use service connectors
  inputs: [],
  outputs: [],

  // SERVICE CONNECTORS - defines what services this node provides
  serviceConnectors: [
    {
      name: "llmService",
      description: "OpenAI LLM service for text generation",
      serviceType: "llm",
      methods: ["generateText"],
    },
  ],

  configSchema: {
    type: "object",
    properties: {
      defaultModel: {
        type: "string",
        title: "Default Model",
        description: "Default OpenAI model to use if not specified in request",
        enum: ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo-preview", "gpt-4o", "gpt-4o-mini"],
        enumNames: ["GPT-3.5 Turbo", "GPT-4", "GPT-4 Turbo", "GPT-4o", "GPT-4o Mini"],
        default: "gpt-4o-mini",
      },
      defaultTemperature: {
        type: "number",
        title: "Default Temperature",
        description: "Default temperature if not specified (0-2)",
        default: 0.7,
        minimum: 0,
        maximum: 2,
      },
      defaultMaxTokens: {
        type: "number",
        title: "Default Max Tokens",
        description: "Default maximum tokens if not specified",
        default: 1000,
        minimum: 1,
        maximum: 4096,
      },
    },
    required: ["defaultModel"],
  },

  credentials: [
    {
      name: "openAICredential",
      required: true,
      displayName: "OpenAI Credentials",
      description: "OpenAI API key for accessing the LLM service",
    },
  ],
};

// Export node module
export const OpenAIServiceNode = {
  definition,
  executor: OpenAIServiceExecutor,
};

// Export for node registry
export { definition };
