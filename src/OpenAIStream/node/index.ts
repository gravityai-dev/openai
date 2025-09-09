/**
 * OpenAI Stream node definition
 * Provides streaming text generation capabilities
 */

import { getPlatformDependencies, type EnhancedNodeDefinition } from "@gravityai-dev/plugin-base";
import { SYSTEM_CHANNEL, AI_RESULT_CHANNEL, QUERY_MESSAGE_CHANNEL } from "@gravityai-dev/gravity-server";
import OpenAIStreamExecutor from "./executor";

// Get platform dependencies
const { NodeInputType, NodeConcurrency } = getPlatformDependencies();

const definition: EnhancedNodeDefinition = {
  type: "OpenAIStream",
  isService: false,
  name: "OpenAI Stream",
  description: "Generate text using OpenAI's GPT models",
  category: "AI",
  color: "#2F6F66",
  logoUrl: "https://res.cloudinary.com/sonik/image/upload/v1749262616/gravity/icons/ChatGPT-Logo.svg.webp",

  inputs: [
    {
      name: "signal",
      type: NodeInputType.OBJECT,
      description: "Data from previous nodes that can be referenced in templates",
    },
  ],

  outputs: [
    {
      name: "text",
      type: NodeInputType.STRING,
      description: "The complete generated text from the stream",
    },
    {
      name: "usage",
      type: NodeInputType.OBJECT,
      description: "Token burn",
    },
  ],

  configSchema: {
    type: "object",
    properties: {
      model: {
        type: "string",
        title: "Model",
        description: "Select the OpenAI model to use",
        enum: ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo-preview", "gpt-4o"],
        enumNames: ["GPT-3.5 Turbo", "GPT-4", "GPT-4 Turbo", "GPT-4o"],
        default: "gpt-4o",
      },
      systemPrompt: {
        type: "string",
        title: "System Prompt",
        description:
          "System message prompt. Supports template syntax like {{input.fieldName}} to reference input data.",
        default: "",
        "ui:field": "template",
      },
      prompt: {
        type: "string",
        title: "Prompt",
        description: "User message/prompt. Supports template syntax like {{input.fieldName}} to reference input data.",
        default: "",
        "ui:field": "template",
      },
      history: {
        type: "object",
        title: "History",
        description: "Message history [] for context",
        default: "",
        "ui:field": "template",
      },
      maxTokens: {
        type: "number",
        title: "Max Tokens",
        description: "Maximum number of tokens to generate",
        default: 256,
        minimum: 1,
        maximum: 4096,
      },
      temperature: {
        type: "number",
        title: "Temperature",
        description: "Controls randomness (0-2)",
        default: 0.7,
        minimum: 0,
        maximum: 2,
      },
      redisChannel: {
        type: "string",
        title: "Redis Channel",
        description: "Redis channel to publish streaming chunks to",
        enum: [AI_RESULT_CHANNEL, SYSTEM_CHANNEL, QUERY_MESSAGE_CHANNEL],
        enumNames: ["AI Results", "System Messages", "Query Messages"],
        default: AI_RESULT_CHANNEL,
      },
    },
    required: ["model", "prompt", "redisChannel"],
  },

  // This is where we declare credential requirements
  credentials: [
    {
      name: "openAICredential",
      required: true,
      displayName: "OpenAI API",
      description: "OpenAI API credentials for authentication",
    },
  ],

  capabilities: {
    parallelizable: true,
    requiresConnection: true,
    isTrigger: false,
    concurrency: NodeConcurrency.MEDIUM, // User's API key handles rate limiting
  },
};

// Export as enhanced node
export const OpenAIStreamNode = {
  definition,
  executor: OpenAIStreamExecutor,
};

// Export for node registry
export { definition };
