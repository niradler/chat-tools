# Chat Tools Framework

A TypeScript framework for building intelligent terminal chat applications with MCP integration, tool calling, and human-in-the-loop approval systems.

## Features

- 🎨 **Modern Terminal UI** - Built with Ink (React for terminal)
- 🤖 **AI Agent Integration** - AI SDK v5 with multiple provider support
- 🔧 **MCP Protocol Support** - Connect to any MCP server
- ✋ **Smart Approval System** - Global and session-specific tool auto-approval
- 🗄️ **Session Management** - SQLite-based chat sessions and history
- 📦 **Modular Architecture** - Easy to extend and customize

## Quick Start

```bash
# Install the CLI
pnpm add -g @chat-tools/cli

# Start a basic chat
chat-tools start

# With shell extension
chat-tools start --extension shell
```

## Package Structure

- **@chat-tools/storage** - Database, sessions, auto-approval management
- **@chat-tools/tui** - Reusable terminal UI components
- **@chat-tools/agent** - AI agent, MCP, approval system
- **@chat-tools/cli** - Command-line interface
- **@chat-tools/core** - Shared types and utilities
- **@chat-tools/shell** - Shell command extension example

## Development

```bash
# Clone and setup
git clone <repo>
cd chat-tools
pnpm install

# Start development
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Documentation

- [Getting Started](./docs/getting-started.md)
- [Creating Extensions](./docs/extensions.md)
- [API Reference](./docs/api.md)
- [Examples](./examples/)

## License

MIT
