/**
 * Shared platform dependencies for all OpenAI services
 */
import { getPlatformDependencies } from "@gravityai-dev/plugin-base";

// Get platform dependencies once
const deps = getPlatformDependencies();

export const getNodeCredentials = deps.getNodeCredentials;
export const saveTokenUsage = deps.saveTokenUsage;
export const createLogger = deps.createLogger;
export const getConfig = deps.getConfig;

// Create shared loggers
export const openAILogger = createLogger("OpenAI");
export const openAIStreamLogger = createLogger("OpenAIStream");
export const openAIServiceLogger = createLogger("OpenAIService");
export const embeddingLogger = createLogger("OpenAIEmbedding");
