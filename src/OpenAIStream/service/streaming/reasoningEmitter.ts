/**
 * Reasoning Emitter
 * Handles emitting reasoning chunks during streaming
 */

const EMIT_INTERVAL = 150; // Emit every ~150 new chars

export class ReasoningEmitter {
  private charsSinceLastEmit: number = 0;
  private emit: (output: any) => void;
  private logger: any;

  constructor(emit: (output: any) => void, logger: any) {
    this.emit = emit;
    this.logger = logger;
  }

  /**
   * Emit reasoning if interval threshold is reached
   */
  emitIfNeeded(fullReasoning: string, newCharsCount: number): void {
    this.charsSinceLastEmit += newCharsCount;

    if (this.charsSinceLastEmit >= EMIT_INTERVAL) {
      this.emit({
        __outputs: {
          reasoning: fullReasoning, // Send full accumulated reasoning
        },
      });

      this.logger.info(
        `🧠 Emitted accumulated reasoning (${this.charsSinceLastEmit} new chars, ${fullReasoning.length} total)`
      );

      this.charsSinceLastEmit = 0;
    }
  }

  /**
   * Emit final reasoning if there's any remaining
   */
  emitFinal(fullReasoning: string): void {
    if (this.charsSinceLastEmit > 0 && fullReasoning) {
      this.emit({
        __outputs: {
          reasoning: fullReasoning, // Send complete accumulated reasoning
        },
      });
      this.logger.info(
        `🧠 Emitted final accumulated reasoning (${this.charsSinceLastEmit} new chars, ${fullReasoning.length} total)`
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
