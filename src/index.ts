/**
 * @gravity/openai
 * OpenAI integration for Gravity platform
 */

import type { GravityPluginAPI } from "@gravityai-dev/plugin-base";

// Plugin definition - no imports at module level
const plugin = {
  name: "@gravityai-dev/openai",
  version: "1.0.0", 
  description: "OpenAI integration for Gravity workflow system",

  async setup(api: GravityPluginAPI) {
    // First, set up platform dependencies
    const { setPlatformDependencies } = await import("@gravityai-dev/plugin-base");
    setPlatformDependencies({
      PromiseNode: api.classes.PromiseNode,
      CallbackNode: api.classes.CallbackNode,
      NodeInputType: api.types.NodeInputType,
      NodeConcurrency: api.types.NodeConcurrency,
      getNodeCredentials: api.getNodeCredentials,
      getConfig: api.getConfig,
      createLogger: api.createLogger,
      saveTokenUsage: api.saveTokenUsage,
      NodeInput: null,
      NodeOutput: null,
      NodeDefinition: null,
      NodeExecutor: null,
      NodeExecutionContext: null,
      NodeLifecycle: null,
      WorkflowNode: null,
      EnhancedNodeDefinition: null,
      NodeCredential: null,
      ValidationResult: null,
    } as any);

    // Import nodes after dependencies are set
    const { OpenAINode } = await import("./OpenAI/node");
    const { OpenAIServiceNode } = await import("./OpenAIService/node");
    const { OpenAIStreamNode } = await import("./OpenAIStream/node");
    const { OpenAIEmbeddingServiceNode } = await import("./OpenAIEmbeddingService/node");

    // Import credential
    const { OpenAICredential } = await import("./credentials");

    // Register nodes
    api.registerNode("OpenAI", OpenAINode);
    api.registerNode("OpenAIService", OpenAIServiceNode);
    api.registerNode("OpenAIStream", OpenAIStreamNode);
    api.registerNode("OpenAIEmbeddingService", OpenAIEmbeddingServiceNode);

    // Register credential
    api.registerCredential(OpenAICredential);

    // Import and register services
    const { createEmbedding } = await import("./OpenAIEmbeddingService/service/embeddings");
    const { queryChatGPT } = await import("./OpenAI/service/queryChatGPT");
    const { streamCompletion } = await import("./OpenAIStream/service/streaming");

    // Register services for platform use
    api.registerService("openai-embeddings", createEmbedding);
    api.registerService("openai-chat", queryChatGPT);
    api.registerService("openai-stream", streamCompletion);
  }
};

export default plugin;
