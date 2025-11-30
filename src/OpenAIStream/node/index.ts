/**
 * OpenAI Stream node definition
 * Provides streaming text generation capabilities
 */

import { type EnhancedNodeDefinition, NodeInputType } from "@gravityai-dev/plugin-base";
import OpenAIStreamExecutor from "./executor";

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
      name: "reasoning",
      type: NodeInputType.STRING,
      description: "The reasoning/thinking process",
    },
    {
      name: "chunk",
      type: NodeInputType.OBJECT,
      description: "Streaming text chunks (emitted in real-time)",
    },
    {
      name: "mcpResult",
      type: NodeInputType.OBJECT,
      description: "MCP tool results",
    },
    {
      name: "text",
      type: NodeInputType.STRING,
      description: "The complete generated text (final output)",
    },
  ],

  configSchema: {
    type: "object",
    properties: {
      model: {
        type: "string",
        title: "Model",
        description: "Select the GPT-5 model variant",
        enum: ["gpt-5", "gpt-5-mini", "gpt-5-nano"],
        enumNames: ["GPT-5 (Complex reasoning & coding)", "GPT-5 Mini (Balanced)", "GPT-5 Nano (Fast & efficient)"],
        default: "gpt-5",
      },
      reasoningEffort: {
        type: "string",
        title: "Reasoning Effort",
        description: "Control reasoning depth. Minimal=fastest, High=most thorough",
        enum: ["minimal", "low", "medium", "high"],
        enumNames: ["Minimal (Fastest)", "Low (Fast)", "Medium (Balanced)", "High (Thorough)"],
        default: "medium",
      },
      reasoningSummary: {
        type: "string",
        title: "Reasoning Summary",
        description:
          "Control reasoning summary visibility. Note: gpt-5-mini does NOT support reasoning summaries, only gpt-5 and gpt-5-nano",
        enum: ["auto", "detailed"],
        enumNames: ["Auto (Model decides)", "Detailed (Always show)"],
        default: "auto",
      },
      verbosity: {
        type: "string",
        title: "Verbosity",
        description: "Control output length",
        enum: ["low", "medium", "high"],
        enumNames: ["Low (Concise)", "Medium (Balanced)", "High (Thorough)"],
        default: "medium",
      },
      systemPrompt: {
        type: "string",
        title: "System Prompt",
        description:
          "System message prompt. Supports template syntax like {{input.fieldName}} to reference input data. IMPORTANT: Avoid contradictory instructions - GPT-5 will waste reasoning tokens trying to reconcile them. Be clear and consistent.",
        default: "",
        "ui:field": "template",
      },
      enablePreambles: {
        type: "boolean",
        title: "Enable Preambles",
        description:
          "Let GPT-5 explain its reasoning before calling tools. Improves transparency and tool-calling accuracy.",
        default: true,
      },
      enableMarkdown: {
        type: "boolean",
        title: "Enable Markdown Formatting",
        description: "Format output with Markdown (code blocks, lists, tables). GPT-5 doesn't use Markdown by default.",
        default: false,
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
        title: "Max Output Tokens",
        description: "Maximum number of tokens to generate",
        default: 2048,
        minimum: 1,
        maximum: 16384,
      },
    },
    required: ["model", "prompt"],
    "ui:order": [
      "model",
      "reasoningEffort",
      "reasoningSummary",
      "verbosity",
      "enablePreambles",
      "enableMarkdown",
      "systemPrompt",
      "prompt",
      "history",
      "maxTokens",
    ],
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

  // Service connectors - MCP protocol for dynamic tool discovery
  serviceConnectors: [
    {
      name: "mcpService",
      description: "MCP service connector - automatic schema discovery",
      serviceType: "mcp",
      isService: false, // This node CONSUMES MCP services from others
    },
  ],
};

// Export as enhanced node
export const OpenAIStreamNode = {
  definition,
  executor: OpenAIStreamExecutor,
};

// Export for node registry
export { definition };
