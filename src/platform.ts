/**
 * Platform dependencies that need to be injected when using this package
 */

export interface PlatformDependencies {
  // Base classes
  PromiseNode: any;  // Base class for promise-based nodes
  CallbackNode: any; // Base class for callback/streaming nodes
  
  // Node types from node.ts
  NodeInputType: any; // Node input type enum
  NodeInput: any; // Node input interface
  NodeOutput: any; // Node output interface
  NodeDefinition: any; // Basic node definition
  NodeExecutor: any; // Node executor type
  NodeExecutionContext: any; // Execution context type
  NodeLifecycle: any; // Node lifecycle hooks
  WorkflowNode: any; // Enhanced node with lifecycle
  EnhancedNodeDefinition: any; // Enhanced node definition
  NodeCredential: any; // Node credential definition
  NodeConcurrency: any; // Node concurrency enum
  
  // Validation types
  ValidationResult: any; // Validation result type
  
  // Credential management
  getNodeCredentials: (context: any, credentialName: string) => Promise<any>;

  // Configuration
  getConfig: () => PlatformConfig;

  // Logging
  createLogger: (name: string) => Logger;

  // Token tracking
  saveTokenUsage: (usage: TokenUsage) => Promise<void>;
}


export interface PlatformConfig {
  openai?: {
    maxTokens?: number;
  };
  REDIS_HOST?: string;
  REDIS_PORT?: number;
  REDIS_PASSWORD?: string;
  REDIS_USERNAME?: string;
}

export interface Logger {
  info: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  warn?: (...args: any[]) => void;
}

export interface TokenUsage {
  workflowId: string;
  executionId: string;
  nodeId: string;
  nodeType?: string;
  model: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens: number;
  inputTokens?: number;
  outputTokens?: number;
  timestamp?: Date;
}

// Type exports for compile-time usage
export type NodeInputType = any;
export type NodeInput = any;
export type NodeOutput = any;
export type NodeDefinition = any;
export type NodeExecutor = any;
export type NodeExecutionContext = any;
export type NodeLifecycle = any;
export type WorkflowNode = any;
export type EnhancedNodeDefinition = any;
export type NodeCredential = any;
export type NodeConcurrency = any;
export type ValidationResult = any;

// Global platform instance
let platformDeps: PlatformDependencies | null = null;

export function setPlatformDependencies(deps: PlatformDependencies) {
  platformDeps = deps;
}

export function getPlatformDependencies(): PlatformDependencies {
  if (!platformDeps) {
    throw new Error('Platform dependencies not initialized. Call setPlatformDependencies() first.');
  }
  return platformDeps;
}
