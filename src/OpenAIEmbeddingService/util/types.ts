export interface OpenAIEmbeddingServiceConfig {
  model: string;
  normalize?: boolean;
  dimensions?: number;
}

export interface CreateEmbeddingParams {
  text: string;
}

export interface CreateBatchEmbeddingsParams {
  texts: string[];
}

export interface OpenAIEmbeddingServiceOutput {
  __outputs: {
    embedding?: number[];
    embeddings?: number[][];
    usage?: {
      prompt_tokens: number;
      total_tokens: number;
    };
  };
}

export interface OpenAIEmbeddingOptions {
  model: string;
  dimensions?: number;
  normalize?: boolean;
  user?: string;
}

export interface OpenAIEmbeddingResponse {
  embedding: number[];
  dimensions: number;
  model: string;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}
