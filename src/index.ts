/**
 * @gravity/openai
 * OpenAI integration for Gravity platform
 */

import { createPlugin, type GravityPluginAPI } from "@gravityai-dev/plugin-base";
import packageJson from "../package.json";

const plugin = createPlugin({
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,

  async setup(api: GravityPluginAPI) {
    // Set up platform dependencies with ALL required fields
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
      callService: api.callService,
      getRedisClient: api.getRedisClient,
      gravityPublish: api.gravityPublish,
      executeNodeWithRouting: api.executeNodeWithRouting,
      getAudioWebSocketManager: api.getAudioWebSocketManager,
    });

    // Import nodes after dependencies are set
    const { OpenAINode } = await import("./OpenAI/node");
    const { OpenAIServiceNode } = await import("./OpenAIService/node");
    const { OpenAIStreamNode } = await import("./OpenAIStream/node");
    const { OpenAIEmbeddingServiceNode } = await import("./OpenAIEmbeddingService/node");

    // Import credential
    const { OpenAICredential } = await import("./credentials");

    // Register nodes - pass the complete node objects
    api.registerNode(OpenAINode);
    api.registerNode(OpenAIServiceNode);
    api.registerNode(OpenAIStreamNode);
    api.registerNode(OpenAIEmbeddingServiceNode);

    // Register credential
    api.registerCredential(OpenAICredential);

    // Import and register services
    const { createEmbedding } = await import("./OpenAIEmbeddingService/service/embeddings");
    const { queryChatGPT } = await import("./OpenAI/service/queryChatGPT");

    // Register services for platform use
    api.registerService("openai-embeddings", createEmbedding);
    api.registerService("openai-chat", queryChatGPT);
    // Note: OpenAIStream is now a CallbackNode - no service registration needed
  },
});

export default plugin;
