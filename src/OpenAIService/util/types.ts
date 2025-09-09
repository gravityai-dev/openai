export interface OpenAIServiceConfig {
  defaultModel?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OpenAICredentials {
  apiKey: string;
  organizationId?: string;
  baseUrl?: string;
}

export interface OpenAIServiceOutput {
  __outputs: {
    text: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
  };
}
