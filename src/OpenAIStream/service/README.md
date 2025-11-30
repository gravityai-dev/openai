# OpenAI Stream Service Architecture

## Overview

The OpenAI Stream service has been refactored into modular, maintainable components following clean architecture principles. Each module has a single responsibility and can be tested independently.

## Directory Structure

```
service/
├── README.md                          # This file
├── streaming.ts                       # Main export (re-exports from streamingRefactored.ts)
├── streamingRefactored.ts            # Orchestrates all modules
├── index.ts                          # Public API exports
│
├── mcp/                              # MCP Tool Integration
│   ├── toolDiscovery.ts             # Discovers and converts MCP services to OpenAI tools
│   └── toolExecution.ts             # Executes tools in parallel
│
├── client/                           # OpenAI Client Management
│   └── openaiClient.ts              # Client initialization and message building
│
├── conversation/                     # Conversation Management
│   └── conversationLoop.ts          # Multi-turn conversation with tool calling
│
└── streaming/                        # Stream Processing
    ├── streamProcessor.ts           # Processes streaming chunks
    └── textEmitter.ts               # Handles real-time text emission
```

## Module Responsibilities

### 1. MCP Tool Integration (`mcp/`)

#### `toolDiscovery.ts`
**Purpose**: Discovers MCP services and converts them to OpenAI tool format

**Key Functions**:
- `discoverMCPTools()` - Discovers MCP services via platform dependencies
- Converts MCP schema to OpenAI function calling format
- Creates proxy functions for tool execution

**Example**:
```typescript
const mcpConfig = await discoverMCPTools(executionContext, logger);
// Returns: { tools: [...], mcpService: {...} }
```

#### `toolExecution.ts`
**Purpose**: Executes tool calls in parallel

**Key Functions**:
- `executeToolCallsInParallel()` - Executes all tools using Promise.all()
- `executeToolCall()` - Executes a single tool with error handling

**Example**:
```typescript
const results = await executeToolCallsInParallel(toolCalls, mcpService, logger);
// Returns: Array of tool results
```

### 2. OpenAI Client Management (`client/`)

#### `openaiClient.ts`
**Purpose**: Manages OpenAI client initialization and configuration

**Key Functions**:
- `initializeOpenAIClient()` - Creates OpenAI client with credentials
- `buildMessages()` - Builds message array from config
- `buildStreamParams()` - Creates streaming parameters

**Example**:
```typescript
const openai = await initializeOpenAIClient(context, logger);
const messages = buildMessages(config);
const streamParams = buildStreamParams(config, messages, tools);
```

### 3. Conversation Management (`conversation/`)

#### `conversationLoop.ts`
**Purpose**: Manages multi-turn conversations with tool calling

**Key Functions**:
- `runConversationLoop()` - Main conversation loop
- Handles tool call detection and execution
- Manages conversation state across iterations

**Flow**:
1. Stream response from OpenAI
2. Process chunks and accumulate tool calls
3. If tools called → execute in parallel → add results → continue
4. If no tools → conversation complete

**Example**:
```typescript
const result = await runConversationLoop({
  openai,
  streamParams,
  messages,
  mcpService,
  textEmitter,
  logger,
  maxIterations: 10,
});
```

### 4. Stream Processing (`streaming/`)

#### `streamProcessor.ts`
**Purpose**: Processes individual stream chunks

**Key Functions**:
- `processStreamChunk()` - Processes a single chunk
- `initializeStreamState()` - Creates initial state
- Accumulates text and tool calls from deltas

**Example**:
```typescript
let state = initializeStreamState();
for await (const chunk of stream) {
  state = processStreamChunk(chunk, state);
}
```

#### `textEmitter.ts`
**Purpose**: Handles real-time text emission

**Key Features**:
- Emits text at intervals (every ~150 chars)
- Prevents excessive emit calls
- Handles final emission

**Example**:
```typescript
const textEmitter = new TextEmitter(emit, logger);
textEmitter.emitIfNeeded(fullText, newCharsCount);
textEmitter.emitFinal(fullText);
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ streamCompletionCallback (streamingRefactored.ts)           │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ MCP Tool     │   │ OpenAI       │   │ Text         │
│ Discovery    │   │ Client       │   │ Emitter      │
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ↓
                ┌──────────────────────┐
                │ Conversation Loop    │
                └──────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Stream       │   │ Tool         │   │ Text         │
│ Processor    │   │ Execution    │   │ Emitter      │
└──────────────┘   └──────────────┘   └──────────────┘
```

## Execution Flow

### 1. Initialization Phase
```typescript
// Step 1: Discover MCP tools
const mcpConfig = await discoverMCPTools(executionContext, logger);

// Step 2: Initialize OpenAI client
const openai = await initializeOpenAIClient(context, logger);

// Step 3: Build messages and parameters
const messages = buildMessages(config);
const streamParams = buildStreamParams(config, messages, mcpConfig?.tools);

// Step 4: Create text emitter
const textEmitter = new TextEmitter(emit, logger);
```

### 2. Conversation Loop
```typescript
while (!conversationComplete && iteration < maxIterations) {
  // Create stream
  const stream = await openai.chat.completions.create(streamParams);
  
  // Process chunks
  for await (const chunk of stream) {
    state = processStreamChunk(chunk, state);
    textEmitter.emitIfNeeded(state.fullText, newCharsCount);
  }
  
  // Handle tool calls
  if (state.toolCalls.length > 0) {
    const results = await executeToolCallsInParallel(state.toolCalls, mcpService, logger);
    messages.push(...results);
    // Continue loop
  } else {
    conversationComplete = true;
  }
}
```

### 3. Finalization
```typescript
// Emit final text
textEmitter.emitFinal(result.fullText);

// Save token usage
await saveTokenUsage({...});

// Return final output
return { __outputs: { text, usage } };
```

## Benefits of Refactored Architecture

### 1. **Separation of Concerns**
- Each module has a single, well-defined responsibility
- Easy to understand what each file does
- Changes are localized to specific modules

### 2. **Testability**
- Each module can be unit tested independently
- Mock dependencies easily
- Test complex scenarios in isolation

### 3. **Maintainability**
- Easy to locate and fix bugs
- Clear boundaries between components
- Self-documenting code structure

### 4. **Reusability**
- Modules can be used independently
- Easy to create variations (e.g., non-streaming version)
- Components can be shared across different nodes

### 5. **Extensibility**
- Easy to add new features (e.g., new tool types)
- Can swap implementations (e.g., different emitters)
- Clear extension points

## Testing Strategy

### Unit Tests
```typescript
// Test tool discovery
describe('toolDiscovery', () => {
  it('should convert MCP schema to OpenAI format', async () => {
    const result = await discoverMCPTools(mockContext, mockLogger);
    expect(result.tools[0].type).toBe('function');
  });
});

// Test tool execution
describe('toolExecution', () => {
  it('should execute tools in parallel', async () => {
    const results = await executeToolCallsInParallel(toolCalls, mcpService, logger);
    expect(results).toHaveLength(3);
  });
});

// Test stream processor
describe('streamProcessor', () => {
  it('should accumulate tool calls from deltas', () => {
    let state = initializeStreamState();
    state = processStreamChunk(mockChunk, state);
    expect(state.toolCalls).toHaveLength(1);
  });
});
```

### Integration Tests
```typescript
describe('streamCompletionCallback', () => {
  it('should handle multi-turn conversation with tools', async () => {
    const result = await streamCompletionCallback(config, context, logger, execContext, emit, state);
    expect(result.__outputs.text).toBeDefined();
  });
});
```

## Migration Notes

### Backward Compatibility
The original `streaming.ts` now re-exports from `streamingRefactored.ts`, ensuring:
- ✅ No breaking changes to existing code
- ✅ Same function signature
- ✅ Same behavior
- ✅ Legacy code preserved as reference

### Gradual Migration
1. **Phase 1** (Current): Refactored code runs, original preserved as reference
2. **Phase 2**: Test thoroughly in production
3. **Phase 3**: Remove legacy code comments from streaming.ts

## Performance Considerations

### Parallel Tool Execution
- Tools execute concurrently via `Promise.all()`
- 3× faster for 3 tools vs sequential
- Network I/O happens in parallel

### Text Emission
- Batched emission (every ~150 chars)
- Reduces emit overhead
- Maintains real-time feel

### Memory Management
- Stream state reset each iteration
- No accumulation of old data
- Proper cleanup after completion

## Future Enhancements

### Potential Improvements
1. **Configurable Emit Interval**: Allow users to set emission frequency
2. **Tool Caching**: Cache frequent tool results
3. **Streaming Tool Results**: Stream tool execution progress
4. **Timeout Handling**: Add configurable timeouts for slow tools
5. **Retry Logic**: Automatic retry for failed tool calls
6. **Metrics Collection**: Detailed performance metrics

### Extension Points
- Custom text emitters (e.g., markdown formatting)
- Custom tool executors (e.g., rate limiting)
- Custom stream processors (e.g., content filtering)

## Troubleshooting

### Common Issues

**Issue**: Tools not discovered
- Check MCP service connection
- Verify `callService` is available
- Check logs for discovery errors

**Issue**: Tools not executing
- Verify tool names match schema
- Check tool arguments are valid JSON
- Review tool execution logs

**Issue**: Text not emitting
- Check emit function is provided
- Verify emit interval settings
- Review emitter logs

## Related Documentation

- [MCP Integration Guide](../MCP_INTEGRATION.md)
- [Parallel Function Calling](../PARALLEL_FUNCTION_CALLING.md)
- [OpenAI API Documentation](https://platform.openai.com/docs)

## Summary

This refactored architecture provides:
- ✅ **Clean separation** of concerns
- ✅ **Easy testing** and maintenance
- ✅ **Clear data flow** and responsibilities
- ✅ **Extensible design** for future features
- ✅ **Backward compatible** with existing code
- ✅ **Production ready** with comprehensive error handling

The modular design makes it easy to understand, test, and extend the OpenAI streaming functionality while maintaining the same external API.
