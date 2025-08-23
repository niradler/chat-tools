# Package Version Checker Chat

A simple terminal chat application that demonstrates MCP (Model Context Protocol) integration with AI SDK v5 and TUI components.

## Features

- 🤖 AI-powered chat using Ollama with qwen3:30b model
- 📦 Package version checking via MCP dependency-checker server
- 🖥️ Beautiful terminal UI using Ink React components
- 🔧 Tool calling with automatic MCP tool discovery

## Prerequisites

1. **Ollama** running locally with qwen3:30b model:

   ```bash
   ollama pull qwen3:30b
   ollama serve
   ```

2. **Internet connection** for MCP dependency-checker server

## Usage

```bash
# Install dependencies
pnpm install

# Build the application
pnpm build

# Start the chat
pnpm start
```

## Example Interactions

- "What's the latest version of react?"
- "Check the version of typescript"
- "Is there a newer version of @types/node available?"

## Architecture

- **AI Agent** (`src/ai-agent.ts`): Ollama integration with AI SDK v5
- **MCP Client** (`src/mcp-client.ts`): Connection to dependency-checker server
- **Chat UI** (`src/ChatApp.tsx`): Terminal interface using TUI components
- **Entry Point** (`src/index.ts`): Application startup

## Development Notes

This is a self-contained development environment for testing chat functionality before extracting code back to the main packages. All dependencies are included locally for easier iteration.
