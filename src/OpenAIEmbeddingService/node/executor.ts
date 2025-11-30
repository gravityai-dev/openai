import { getPlatformDependencies, type NodeExecutionContext } from "@gravityai-dev/plugin-base";
import { OpenAIEmbeddingServiceConfig } from "../util/types";

// Get platform dependencies
const { PromiseNode, createLogger } = getPlatformDependencies();

export default class OpenAIEmbeddingServiceExecutor extends PromiseNode<OpenAIEmbeddingServiceConfig> {
  protected logger = createLogger("OpenAIEmbeddingService");

  constructor() {
    super("OpenAIEmbeddingService");
  }

  protected async executeNode(
    inputs: Record<string, any>,
    config: OpenAIEmbeddingServiceConfig,
    context: NodeExecutionContext
  ): Promise<any> {
    // Service nodes are invoked via the state machine signal system
    // The state machine will call handleServiceCall directly when SERVICE_CALL signals arrive
    throw new Error(
      "OpenAIEmbeddingService is a service node - it should only be invoked via SERVICE_CALL signals through the state machine, not regular workflow execution"
    );
  }

  // This method will be called by the state machine when a SERVICE_CALL signal is received
  async handleServiceCall(
    method: string,
    params: any,
    config: OpenAIEmbeddingServiceConfig,
    context: NodeExecutionContext
  ): Promise<any> {
    this.logger.info(`Handling SERVICE_CALL: ${method}`, {
      method,
      nodeId: context.nodeId,
    });

    try {
      let result;

      switch (method) {
        case "createEmbedding": {
          const { createEmbedding } = await import("../service/createEmbedding");
          const actualConfig = ("config" in config && config.config ? config.config : config) as any;
          
          return await createEmbedding(params, actualConfig, context);
        }
        case "createBatchEmbeddings": {
          const { createBatchEmbeddings } = await import("../service/embeddings");
          const { texts } = params;
          
          // Validate input
          if (!texts || !Array.isArray(texts)) {
            throw new Error("Texts must be an array");
          }
          
          const actualConfig = ("config" in config && config.config ? config.config : config) as any;
          const result = await createBatchEmbeddings(
            texts,
            {
              model: actualConfig.model || "text-embedding-3-small",
              dimensions: actualConfig.dimensions,
              normalize: actualConfig.normalize !== false,
            },
            context.credentials || {},
            context.workflowId ? {
              workflowId: context.workflowId,
              executionId: context.executionId,
              nodeId: context.nodeId,
            } : undefined
          );
          
          return {
            embeddings: result.embeddings.map(e => e.embedding),
            dimensions: result.embeddings[0]?.dimensions,
            model: actualConfig.model || "text-embedding-3-small",
            usage: result.totalUsage,
          };
        }
        default:
          throw new Error(
            `Unknown service method: ${method}. Available methods: createEmbedding, createBatchEmbeddings`
          );
      }

      this.logger.info(`SERVICE_CALL completed: ${method}`, {
        method,
        nodeId: context.nodeId,
      });

      return result;
    } catch (error) {
      this.logger.error(`SERVICE_CALL failed: ${method}`, {
        method,
        nodeId: context.nodeId,
        error: (error as Error).message,
      });
      throw error;
    }
  }
}
