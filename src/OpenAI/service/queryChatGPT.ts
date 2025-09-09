/**
 * OpenAI completion service
 * Handles all OpenAI API interactions with proper credential management
 */

import {
  OpenAIConfig,
  OpenAIMessage,
  OpenAICompletionRequest,
  OpenAICompletionResponse,
  OpenAICredentials,
} from "../util/types";
// import { saveTokenUsage } from "../simpleTokenTracker";

// Temporary placeholders for platform dependencies
const logger = { info: console.log, error: console.error, debug: console.debug };
type CredentialContext = any;
const getNodeCredentials = (context: any, key: string) => {
  throw new Error("getNodeCredentials not implemented");
};
const saveTokenUsage = async (...args: any[]) => {
  console.log("saveTokenUsage called", args);
};

/**
 * Generate a completion using OpenAI's chat API
 * Handles credential fetching internally following Pattern A
 */
export async function queryChatGPT(
  config: OpenAIConfig,
  context: CredentialContext,
  nodeLogger?: any,
  executionContext?: { workflowId: string; executionId: string; nodeId: string }
): Promise<{ text: string; usage?: any }> {
  // Use provided logger or fall back to base logger
  const log = nodeLogger || logger;

  try {
    // Fetch credentials internally
    const credentials = (await getNodeCredentials(context, "openAICredential")) as OpenAICredentials;

    if (!credentials?.apiKey) {
      throw new Error("OpenAI API key not found in credentials");
    }

    const apiKey = credentials.apiKey;
    const organizationId = credentials.organizationId;
    const baseUrl = credentials.baseUrl || "https://api.openai.com/v1";

    // Build messages array
    const messages: OpenAIMessage[] = [];

    if (config.systemPrompt) {
      messages.push({
        role: "system",
        content: config.systemPrompt,
      });
    }

    // Add conversation history if provided
    if (config.history && Array.isArray(config.history)) {
      messages.push(...config.history);
    }

    // Add the current prompt as the final user message
    messages.push({
      role: "user",
      content: config.prompt,
    });

    // Build request
    const requestBody: OpenAICompletionRequest = {
      model: config.model,
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    };

    log.info("Calling OpenAI API", {
      model: config.model,
      messageCount: messages.length,
      maxTokens: config.maxTokens,
    });

    // Make API call
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(organizationId && { "OpenAI-Organization": organizationId }),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error("OpenAI API error", {
        status: response.status,
        error: errorText,
      });
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as OpenAICompletionResponse;

    const generatedText = data.choices[0]?.message?.content || "";

    log.info("OpenAI completion successful", {
      model: config.model,
      usage: data.usage,
      textLength: generatedText.length,
    });

    // Save token usage if execution context provided
    if (executionContext && data.usage) {
      await saveTokenUsage({
        workflowId: executionContext.workflowId,
        executionId: executionContext.executionId,
        nodeId: executionContext.nodeId,
        nodeType: "OpenAI",
        model: config.model,
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
        timestamp: new Date(),
      });
      log.info(`Token usage saved: ${data.usage.total_tokens} tokens for model ${config.model}`);
    }

    return {
      text: generatedText,
      usage: data.usage,
    };
  } catch (error: any) {
    log.error("Failed to generate completion", { error });
    throw new Error(`Failed to generate completion: ${error.message}`);
  }
}
