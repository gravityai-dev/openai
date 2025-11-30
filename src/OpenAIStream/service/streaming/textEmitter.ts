/**
 * Text Emitter
 * Handles emitting text chunks during streaming
 */

const EMIT_INTERVAL = 300; // Emit every ~300 new chars

export class TextEmitter {
  private charsSinceLastEmit: number = 0;
  private emit: (output: any) => void;
  private logger: any;

  constructor(emit: (output: any) => void, logger: any) {
    this.emit = emit;
    this.logger = logger;
  }

  /**
   * Emit text if interval threshold is reached
   */
  emitIfNeeded(fullText: string, newCharsCount: number): void {
    this.charsSinceLastEmit += newCharsCount;

    if (this.charsSinceLastEmit >= EMIT_INTERVAL) {
      this.emit({
        __outputs: {
          chunk: fullText, // Send full accumulated text
        },
      });

      this.logger.info(`📦 Emitted accumulated text (${this.charsSinceLastEmit} new chars, ${fullText.length} total)`);

      this.charsSinceLastEmit = 0;
    }
  }

  /**
   * Emit final text if there's any remaining
   */
  emitFinal(fullText: string): void {
    this.logger.info(
      `📦 [emitFinal] Called with charsSinceLastEmit=${this.charsSinceLastEmit}, fullTextLength=${
        fullText?.length || 0
      }`
    );
    if (this.charsSinceLastEmit > 0) {
      this.emit({
        __outputs: {
          chunk: fullText, // Send complete accumulated text
        },
      });
      this.logger.info(
        `📦 Emitted final accumulated text (${this.charsSinceLastEmit} new chars, ${fullText.length} total)`
      );
      this.charsSinceLastEmit = 0;
    }
  }

  /**
   * Reset the counter
   */
  reset(): void {
    this.charsSinceLastEmit = 0;
  }
}
