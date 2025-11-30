/**
 * MCP Tool Discovery
 * Handles discovery and conversion of MCP services to OpenAI tools
 */

import { getPlatformDependencies } from "@gravityai-dev/plugin-base";

export interface MCPToolConfig {
  tools: any[];
  mcpService: Record<string, (input: any) => Promise<any>>;
}

/**
 * Discover MCP services and convert to OpenAI tools format
 * MCPs are discovered generically - LLM decides which to use based on user query
 */
export async function discoverMCPTools(executionContext: any, logger: any): Promise<MCPToolConfig | null> {
  logger.info("\n\n🔍🔍🔍 [MCP DISCOVERY FUNCTION] discoverMCPTools CALLED");
  logger.info("🔍 [MCP Discovery] Starting tool discovery", {
    hasExecutionContext: !!executionContext,
    contextKeys: executionContext ? Object.keys(executionContext) : []
  });
  
  if (!executionContext) {
    logger.warn("❌❌❌ [MCP DISCOVERY FAILED] No executionContext provided");
    logger.warn("⚠️ [MCP Discovery] No executionContext provided - cannot discover MCP tools");
    return null;
  }
  logger.info("✅ [MCP DISCOVERY] executionContext exists");

  const platformDeps = getPlatformDependencies();

  try {
    logger.info("✅ [MCP Discovery] Checking for MCP service connections...", {
      hasCallService: !!platformDeps.callService,
      callServiceType: typeof platformDeps.callService
    });

    if (!platformDeps.callService) {
      logger.warn("❌❌❌ [MCP DISCOVERY FAILED] callService not available");
      return null;
    }
    logger.info("✅ [MCP DISCOVERY] callService is available");

    // Get MCP schema (generic discovery - no user query)
    logger.info("📞📞📞 [CALLING getSchema] About to call platformDeps.callService...");
    const mcpSchema = await platformDeps.callService("getSchema", {}, executionContext);
    logger.info("✅✅✅ [getSchema RETURNED] Schema received:", { hasSchema: !!mcpSchema, hasMethods: !!mcpSchema?.methods, methodCount: mcpSchema?.methods ? Object.keys(mcpSchema.methods).length : 0 });

    if (!mcpSchema?.methods) {
      logger.warn("❌❌❌ [NO METHODS] mcpSchema.methods is empty or undefined");
      return null;
    }
    logger.info(`✅ [METHODS FOUND] ${Object.keys(mcpSchema.methods).length} methods available`);

    logger.info(`MCP tools available: ${Object.keys(mcpSchema.methods).length} methods`);

    // Convert MCP schema to OpenAI Responses API tools format
    // Responses API format: { type, name, description, parameters } at top level
    // NOT nested under "function" key like Chat Completions API
    const tools = Object.entries(mcpSchema.methods).map(([methodName, methodSchema]: [string, any]) => ({
      type: "function",
      name: methodName,
      description: methodSchema.description || `Execute ${methodName} operation`,
      parameters: methodSchema.input || { type: "object", properties: {} },
    }));

    logger.info(" Converted tools:", {
      toolCount: tools.length,
      firstTool: tools[0] ? JSON.stringify(tools[0], null, 2) : "none",
    });

    // Create service proxy functions for each tool
    const mcpService: Record<string, (input: any) => Promise<any>> = {};
    for (const [methodName] of Object.entries(mcpSchema.methods)) {
      mcpService[methodName] = async (input: any) => {
        logger.info(`Calling MCP method: ${methodName}`, { input });
        return platformDeps.callService(methodName, input, executionContext);
      };
    }

    logger.info(`🎉🎉🎉 [MCP DISCOVERY SUCCESS] Returning ${tools.length} tools to OpenAI`);

    return { tools, mcpService };
  } catch (error) {
    // No MCP service connected - continue without tools
    logger.debug("No MCP service connected", { error: (error as Error).message });
    return null;
  }
}
