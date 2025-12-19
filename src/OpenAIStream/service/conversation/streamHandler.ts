/**
 * Stream Handler
 * Processes OpenAI response stream chunks
 */

import { processStreamChunk, initializeStreamState, StreamState } from "../streaming/streamProcessor";
import { TextEmitter } from "../streaming/textEmitter";
import { ReasoningEmitter } from "../streaming/reasoningEmitter";

export interface StreamHandlerConfig {
  textEmitter: TextEmitter;
  reasoningEmitter: ReasoningEmitter;
  logger: any;
}

/**
 * Process a single stream iteration
 */
export async function processStream(
  stream: AsyncIterable<any>,
  previousState: StreamState,
  config: StreamHandlerConfig
): Promise<StreamState> {
  const { textEmitter, reasoningEmitter, logger } = config;

  // Reset state for this iteration (keep accumulated text/reasoning/usage)
  let streamState = initializeStreamState(previousState.fullText, previousState.reasoning, previousState.usage);

  let chunkCount = 0;

  for await (const chunk of stream) {
    chunkCount++;

    // Log first 5 chunks
    if (chunkCount <= 5) {
      logger.info(`📦 [CHUNK ${chunkCount}] Type: ${chunk.type}`);
    }

    const previousReasoning = streamState.reasoning;
    const previousText = streamState.fullText;

    streamState = processStreamChunk(chunk, streamState);

    // Emit text chunks
    const newChars = streamState.fullText.length - previousText.length;
    if (newChars > 0) {
      textEmitter.emitIfNeeded(streamState.fullText, newChars);
    }

    // Emit reasoning chunks
    const newReasoningChars = streamState.reasoning.length - previousReasoning.length;
    if (newReasoningChars > 0) {
      reasoningEmitter.emitIfNeeded(streamState.reasoning, newReasoningChars);
    }
  }

  logger.info(`✅ Processed ${chunkCount} chunks`);

  return streamState;
}
