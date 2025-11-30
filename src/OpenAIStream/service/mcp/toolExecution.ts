/**
 * MCP Tool Execution
 * Handles parallel execution of tool calls
 */

export interface ToolCall {
  id: string;  // call_id for function_call_output
  itemId?: string;  // item.id for matching argument deltas
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  tool_call_id: string;
  role: "tool";
  content: string;
}

/**
 * Execute a single tool call
 */
async function executeToolCall(
  toolCall: ToolCall,
  mcpService: Record<string, (input: any) => Promise<any>>,
  logger: any
): Promise<ToolResult> {
  try {
    const toolName = toolCall.function.name;
    const toolArgs = JSON.parse(toolCall.function.arguments);

    logger.info(`⚡ Executing tool: ${toolName}`, { args: toolArgs });

    // Call the MCP service
    if (mcpService && mcpService[toolName]) {
      const toolResult = await mcpService[toolName](toolArgs);
      logger.info(`✅ Tool ${toolName} executed successfully`);
      return {
        tool_call_id: toolCall.id,
        role: "tool",
        content: JSON.stringify(toolResult),
      };
    } else {
      logger.warn(`⚠️ Tool ${toolName} not found in mcpService`);
      return {
        tool_call_id: toolCall.id,
        role: "tool",
        content: JSON.stringify({ error: "Tool not found" }),
      };
    }
  } catch (error: any) {
    logger.error(`❌ Tool execution failed`, { error: error.message });
    return {
      tool_call_id: toolCall.id,
      role: "tool",
      content: JSON.stringify({ error: error.message }),
    };
  }
}

/**
 * Execute all tool calls in parallel (OpenAI's parallel function calling)
 */
export async function executeToolCallsInParallel(
  toolCalls: ToolCall[],
  mcpService: Record<string, (input: any) => Promise<any>>,
  logger: any
): Promise<ToolResult[]> {
  logger.info(`🔧 Model requested ${toolCalls.length} tool call(s) in parallel`);

  // Execute ALL tool calls in parallel
  const toolExecutionPromises = toolCalls.map((toolCall) =>
    executeToolCall(toolCall, mcpService, logger)
  );

  // Wait for ALL executions to complete
  const toolResults = await Promise.all(toolExecutionPromises);

  logger.info(`📤 All ${toolResults.length} tool results completed`);

  return toolResults;
}
