/**
 * OpenAI Service Node Executor
 * Handles service calls for LLM operations
 */
import { getPlatformDependencies, type NodeExecutionContext } from "@gravityai-dev/plugin-base";
import { queryChatGPT } from "../../OpenAI/service/queryChatGPT";
import { OpenAIServiceConfig } from "../util/types";

// Get platform dependencies
const { PromiseNode } = getPlatformDependencies();

export default class OpenAIServiceExecutor extends PromiseNode<OpenAIServiceConfig> {
  constructor() {
    super("OpenAIService");
  }

  protected async validateConfig(config: OpenAIServiceConfig): Promise<any> {
    return { success: true };
  }

  protected async executeNode(
    inputs: Record<string, any>,
    config: OpenAIServiceConfig,
    context: NodeExecutionContext
  ): Promise<any> {
    // Service nodes don't execute normally, they respond to service calls
    return {};
  }

  /**
   * Handle service calls from other nodes
   */
  async handleServiceCall(method: string, params: any, config: any, context: NodeExecutionContext): Promise<any> {
    this.logger.info(`OpenAIService handling service call: ${method}`, { method, params });

    try {
      // Get node config from context
      const nodeConfig = (context.config as OpenAIServiceConfig) || {};

      // For now, only support generateText method
      if (method !== "generateText") {
        throw new Error(`Service method ${method} not supported. Only 'generateText' is available.`);
      }

      // Use params directly for OpenAI config
      const openAIConfig = {
        prompt: params.prompt || "",
        model: params.model || config?.defaultModel || "gpt-4o-mini",
        temperature: params.temperature ?? config?.defaultTemperature ?? 0.7,
        systemPrompt: params.systemPrompt || "You are a helpful assistant.",
        messages: params.messages || [{ role: "user", content: params.prompt || "" }],
        maxTokens: params.maxTokens,
        responseFormat: params.responseFormat,
        jsonSchema: params.jsonSchema,
      };

      // Get workflow from either workflow or cachedWorkflow (service calls use cachedWorkflow)
      const workflow = context.workflow || (context as any).cachedWorkflow;

      // Ensure we have required workflow context
      if (!workflow?.id) {
        throw new Error("Workflow ID is required for OpenAI service calls");
      }

      // Build credential context that queryChatGPT expects
      const credentialContext = {
        workflowId: workflow.id,
        executionId: context.executionId,
        nodeId: context.nodeId,
        nodeType: this.nodeType,
        config: context.config,
        credentials: context.credentials,
      };

      // Call OpenAI using the same service as OpenAI node
      const result = await queryChatGPT(openAIConfig, credentialContext, this.logger);

      this.logger.info(`OpenAIService completed ${method}`, {
        method,
        usage: result.usage,
      });

      // Return the result in the expected format for generateText
      return {
        text: result.text,
        usage: result.usage,
      };
    } catch (error) {
      this.logger.error(`OpenAIService error in ${method}`, { error, method });
      throw error;
    }
  }
}
