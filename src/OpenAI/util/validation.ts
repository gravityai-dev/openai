/**
 * Validation utilities for OpenAI node
 */

import { ValidationResult } from "./types";

/**
 * Validates OpenAI configuration
 */
export function validateOpenAIConfig(config: any): ValidationResult {
  if (!config) {
    return { success: false, error: "Configuration is required" };
  }

  if (!config.prompt) {
    return { success: false, error: "Prompt is required" };
  }

  if (!config.model) {
    return { success: false, error: "Model selection is required" };
  }

  const validModels = ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo-preview", "gpt-4o"];
  if (!validModels.includes(config.model)) {
    return { success: false, error: `Invalid model. Must be one of: ${validModels.join(", ")}` };
  }

  if (config.temperature !== undefined) {
    if (typeof config.temperature !== "number" || config.temperature < 0 || config.temperature > 2) {
      return { success: false, error: "Temperature must be a number between 0 and 2" };
    }
  }

  if (config.maxTokens !== undefined) {
    if (typeof config.maxTokens !== "number" || config.maxTokens < 1 || config.maxTokens > 4096) {
      return { success: false, error: "Max tokens must be a number between 1 and 4096" };
    }
  }

  return { success: true };
}

/**
 * Validates OpenAI API response
 */
export function validateOpenAIResponse(response: any): ValidationResult {
  if (!response) {
    return { success: false, error: "No response received from OpenAI" };
  }

  if (!response.choices || !Array.isArray(response.choices) || response.choices.length === 0) {
    return { success: false, error: "Invalid response format from OpenAI" };
  }

  const firstChoice = response.choices[0];
  if (!firstChoice.message || typeof firstChoice.message.content !== "string") {
    return { success: false, error: "Response missing message content" };
  }

  return {
    success: true,
    data: {
      text: firstChoice.message.content,
      usage: response.usage,
    },
  };
}
