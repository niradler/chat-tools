# Agent Middleware Support

This example demonstrates how to use AI SDK v5 middleware with our Agent class to add capabilities like logging, caching, and timing to language model interactions.

## Features Added

### 1. Middleware Support in Agent Class

The `Agent` class now supports:

- **Constructor middleware**: Pass middlewares during agent creation
- **Dynamic middleware**: Add middlewares to existing agents
- **Multiple middlewares**: Chain multiple middlewares together

### 2. Example Middlewares

#### Logging Middleware

Logs detailed information about each AI interaction:

- Number of messages and tools
- Generation/streaming duration
- Response length

#### Caching Middleware

Simple in-memory cache for AI responses:

- Caches responses based on messages and tools
- 5-minute TTL for cached entries
- Reduces API calls for repeated queries

#### Timing Middleware

Measures and logs performance:

- Generation time for `generateText`
- Streaming time for `streamText`
- High-precision timing using `performance.now()`

## Usage Examples

### Basic Usage

```typescript
import { createAgent, loggingMiddleware } from "./agent";

// Create agent with logging middleware
const agent = await createAgent(true);

// Or create with custom middleware array
const customAgent = await createAgentWithMiddleware([loggingMiddleware]);
```

### Multiple Middlewares

```typescript
import {
  createAgentWithMiddleware,
  timingMiddleware,
  cachingMiddleware,
  loggingMiddleware,
} from "./agent";

// Middlewares are applied in order: timing -> caching -> logging
const agent = await createAgentWithMiddleware([
  timingMiddleware,
  cachingMiddleware,
  loggingMiddleware,
]);
```

### Dynamic Middleware Addition

```typescript
const agent = await createAgent(false); // No middleware initially
agent.addMiddleware(loggingMiddleware); // Add middleware later
```

## Implementation Details

### Fixed Issues

1. **Unified Options Handling**: The `getGenerateTextOptions` method now properly handles both `generateText` and `streamText` calls, eliminating code duplication.

2. **Type Safety**: Proper TypeScript types for AI SDK v5 middleware integration with `LanguageModelV2` and `LanguageModelV2Middleware`.

3. **Model Wrapping**: Automatic conversion from `LanguageModel` to `LanguageModelV2` when middlewares are applied.

### Architecture

```
Agent Constructor
├── Base Model (LanguageModel)
├── Convert to LanguageModelV2 if needed
├── Apply Middlewares (if any)
└── Store Wrapped Model

Method Calls
├── getGenerateTextOptions()
│   ├── Build base options
│   ├── Add tools if available
│   └── Return unified options
├── generateTextResponse()
│   └── Uses unified options
└── streamTextResponse()
    └── Uses unified options
```

## Running the Example

```bash
# Build the project
pnpm build

# Run the middleware example
node examples/chat/dist/chat.js
```

## Expected Output

The example will demonstrate:

1. Basic agent without middleware
2. Agent with logging middleware (shows detailed logs)
3. Streaming with middleware
4. Dynamic middleware addition
5. Multiple middlewares working together (timing + caching + logging)

You'll see console output showing:

- 🤖 Generation calls
- 🌊 Streaming calls
- ⏱️ Timing information
- 💾 Cache hits/misses
- 📝 Message and tool counts
- ✅ Completion status
