/**
 * OpenAI Stream node executor
 * Handles streaming chat completions from OpenAI
 * Emits text chunks as they arrive from OpenAI
 */
import { type NodeExecutionContext, type ValidationResult } from "@gravityai-dev/plugin-base";
import { CallbackNode } from "../../shared/platform";
import { streamCompletionCallback } from "../service";
import { OpenAIStreamConfig, OpenAIStreamState } from "../util/types";

export default class OpenAIStreamExecutor extends CallbackNode<OpenAIStreamConfig, OpenAIStreamState> {
  constructor() {
    super("OpenAIStream");
  }

  protected async validateConfig(config: OpenAIStreamConfig): Promise<ValidationResult> {
    // Service will validate specific OpenAI parameters
    return { success: true };
  }

  /**
   * Initialize state for streaming
   */
  initializeState(inputs: any): OpenAIStreamState {
    this.logger.info(`OpenAIStream: initializeState called`);

    return {
      chunk: "",
      text: "",
      usage: {
        estimated: true,
        total_tokens: 0,
        chunk_count: 0,
        full_text: "",
      },
      hasStartedStreaming: false, // Track if we've started streaming
    };
  }

  /**
   * Handle events and update state
   */
  async handleEvent(
    event: { type: string; inputs?: any; config?: any },
    state: OpenAIStreamState,
    emit: (output: any) => void
  ): Promise<any> {
    const { inputs, config } = event;
    const resolvedConfig = config as OpenAIStreamConfig;

    this.logger.info(`🎯 OpenAIStream: Received event ${event.type}`, {
      hasText: !!state.text,
      chunkCount: state.usage.chunk_count,
      hasStartedStreaming: state.hasStartedStreaming,
      hasConfig: !!resolvedConfig,
    });

    // If already completed, return current state
    if (state.hasStartedStreaming) {
      this.logger.info(`OpenAIStream: Already streamed, returning existing state`);
      return state;
    }

    // If we haven't streamed yet AND we have config, stream now
    // The framework ensures this only runs when dependencies are satisfied
    if (!state.hasStartedStreaming && resolvedConfig) {
      this.logger.info(`OpenAIStream: Starting stream`);

      // Mark that we've started streaming
      const updatedState = { ...state, hasStartedStreaming: true };

      // Start streaming - service does all the work
      const executionContext = (this as any).executionContext as NodeExecutionContext;

      // DEBUG: Check if executionContext exists
      this.logger.info("🔍 [DEBUG] executionContext check:", {
        hasExecutionContext: !!executionContext,
        hasWorkflowId: !!executionContext?.workflow?.id,
        hasNodeId: !!executionContext?.nodeId,
        contextKeys: executionContext ? Object.keys(executionContext) : [],
      });

      const credentialContext = this.buildCredentialContext(executionContext);

      // Service streams, emits chunks, returns final output with __outputs
      // Pass executionContext so service can discover MCP tools
      // Service handles all emits (incremental + final)
      const finalOutput = await streamCompletionCallback(
        resolvedConfig,
        credentialContext,
        this.logger,
        executionContext, // Contains context for MCP service discovery
        emit,
        updatedState
      );

      // CRITICAL: Return with isComplete: true to close the callback node
      // Include final outputs in state for UI display
      return {
        ...updatedState,
        ...finalOutput.__outputs,
        isComplete: true,
      };
    }

    // Default: return current state
    this.logger.info(`OpenAIStream: No config yet, waiting`);
    return state;
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

  /**
   * Cleanup when node is stopped
   */
  async cleanup(state: OpenAIStreamState): Promise<void> {
    const chunkCount = state.usage?.chunk_count ?? 0;
    const textLength = state.text?.length ?? 0;
    this.logger.info(`OpenAIStream: Cleanup - streamed ${chunkCount} chunks, ${textLength} chars`);
  }
}
