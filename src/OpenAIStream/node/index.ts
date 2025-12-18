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
        enum: ["gpt-5.2", "gpt-5.2-pro", "gpt-5-mini", "gpt-5-nano"],
        enumNames: [
          "GPT-5.2 (Best general-purpose)",
          "GPT-5.2 Pro (Harder thinking)",
          "GPT-5 Mini (Cost-optimized)",
          "GPT-5 Nano (High-throughput)",
        ],
        default: "gpt-5.2",
      },
      reasoningEffort: {
        type: "string",
        title: "Reasoning Effort",
        description:
          "Control reasoning depth. GPT-5.2: none/low/medium/high/xhigh. Mini/Nano: none→minimal, xhigh→high automatically.",
        enum: ["none", "low", "medium", "high", "xhigh"],
        enumNames: [
          "None (Fastest, GPT-5.2 only)",
          "Low (Light reasoning)",
          "Medium (Balanced)",
          "High (Thorough)",
          "XHigh (Hardest, GPT-5.2 only)",
        ],
        default: "none",
      },
      reasoningSummary: {
        type: "string",
        title: "Reasoning Summary",
        description:
          "Control reasoning summary visibility. Concise is new in GPT-5.2. Note: gpt-5-mini does NOT support reasoning summaries.",
        enum: ["auto", "concise", "detailed"],
        enumNames: ["Auto (Model decides)", "Concise (Brief summary)", "Detailed (Full explanation)"],
        default: "concise",
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
