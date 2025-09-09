/**
 * OpenAI Node Executor
 * Handles text generation using OpenAI's GPT models
 */

import { getPlatformDependencies, type NodeExecutionContext, type ValidationResult } from "@gravityai-dev/plugin-base";
import { queryChatGPT } from "../service/queryChatGPT";
import { validateOpenAIConfig } from "../util/validation";
import { OpenAIConfig, OpenAIOutput } from "../util/types";

// Get platform dependencies
const { PromiseNode } = getPlatformDependencies();

export default class OpenAIExecutor extends PromiseNode<OpenAIConfig> {
  constructor() {
    super("OpenAI");
  }

  protected async validateConfig(config: OpenAIConfig): Promise<ValidationResult> {
    return validateOpenAIConfig(config);
  }

  protected async executeNode(
    inputs: Record<string, any>,
    config: OpenAIConfig,
    context: NodeExecutionContext
  ): Promise<OpenAIOutput> {
    // Build credential context for the service
    const credentialContext = this.buildCredentialContext(context);

    // Call completion service with logger and execution context
    const result = await queryChatGPT(config, credentialContext, this.logger, {
      workflowId: context.workflowId || context.workflow?.id || "",
      executionId: context.executionId,
      nodeId: context.nodeId,
    });

    return {
      __outputs: {
        text: result.text,
        usage: result.usage,
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
