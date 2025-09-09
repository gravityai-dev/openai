/**
 * OpenAI Stream node executor
 * Handles streaming chat completions from OpenAI
 */
import { getPlatformDependencies, type NodeExecutionContext, type ValidationResult } from "@gravityai-dev/plugin-base";
import { streamCompletion } from "../service/streaming";

import { OpenAIStreamConfig, StreamingMetadata, OpenAIStreamOutput } from "../util/types";

// Get platform dependencies
const { PromiseNode } = getPlatformDependencies();

export default class OpenAIStreamExecutor extends PromiseNode<OpenAIStreamConfig> {
  constructor() {
    super("OpenAIStream");
  }

  protected async validateConfig(config: OpenAIStreamConfig): Promise<ValidationResult> {
    // Base validation in PromiseNode.execute already validates context
    // Service will validate specific OpenAI parameters
    return { success: true };
  }

  protected async executeNode(
    inputs: Record<string, any>,
    config: OpenAIStreamConfig,
    context: NodeExecutionContext
  ): Promise<OpenAIStreamOutput> {
    // Extract workflow variables (always present)
    const { chatId, conversationId, userId, providerId } = context.workflow!.variables!;

    const streamingMetadata: StreamingMetadata = {
      workflowId: context.workflow!.id,
      executionId: context.executionId,
      chatId,
      conversationId,
      userId,
      providerId,
    };

    // Build credential context for service
    const credentialContext = this.buildCredentialContext(context);

    // Call streaming service with execution context
    const result = await streamCompletion(config, streamingMetadata, credentialContext, this.logger, {
      workflowId: context.workflowId || context.workflow?.id || "",
      executionId: context.executionId,
      nodeId: context.nodeId,
    });

    // Return outputs
    return {
      __outputs: {
        text: result.full_text || "",
        usage: result,
      },
    };
  }

  /**
   * Build credential context from execution context
   */
  private buildCredentialContext(context: NodeExecutionContext) {
    const { workflowId, executionId, nodeId } = this.validateAndGetContext(context);

    return {
      workflowId,
      executionId,
      nodeId,
      nodeType: this.nodeType,
      config: context.config,
      credentials: context.credentials || {},
    };
  }
}
