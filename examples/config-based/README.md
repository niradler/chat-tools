# Chat Tools Configuration Examples

This directory contains example configurations showing different ways to set up chat-tools for various use cases.

## Configuration Files

### `dev-assistant.json`
A comprehensive development assistant with:
- **AI Provider**: OpenAI GPT-4 
- **MCP Servers**: Filesystem, Git, Web Search
- **Smart Approval**: Different rules for different command types
- **Extensions**: Git tools and code analysis
- **Custom Tools**: Deployment automation
- **Use Case**: Full-featured development environment

### `shell-helper.json`  
A focused shell scripting assistant with:
- **AI Provider**: Anthropic Claude
- **MCP Servers**: Basic filesystem only
- **Approval Rules**: Safety-focused for shell operations
- **Custom Tools**: Script generation
- **Use Case**: Command-line automation and scripting

## Using Configurations

### Method 1: Direct CLI Usage
```bash
# Install chat-tools CLI
npm install -g chat-tools

# Use a configuration file
chat-tools start --config ./dev-assistant.json

# Or specify configuration inline
chat-tools start --ai-provider openai --model gpt-4 --mcp-server filesystem
```

### Method 2: Programmatic Usage
```typescript
import { ChatTools } from 'chat-tools';
import configFile from './dev-assistant.json';

const chat = new ChatTools(configFile);
await chat.start();
```

### Method 3: NPM Package Integration
```javascript
// package.json
{
  "dependencies": {
    "chat-tools": "^1.0.0"
  },
  "scripts": {
    "assistant": "chat-tools start --config ./dev-assistant.json",
    "shell-help": "chat-tools start --config ./shell-helper.json"
  }
}
```

## Environment Variables

The configurations use environment variable substitution:

```bash
# Required for OpenAI
export OPENAI_API_KEY="sk-..."

# Required for Anthropic  
export ANTHROPIC_API_KEY="..."

# Optional for web search
export BRAVE_SEARCH_API_KEY="..."
```

## Customization

### Adding MCP Servers
```json
{
  "mcp": {
    "servers": [
      {
        "name": "my-custom-server",
        "type": "stdio", 
        "command": "node",
        "args": ["./my-server.js"],
        "description": "Custom functionality"
      }
    ]
  }
}
```

### Custom Approval Rules
```json
{
  "approval": {
    "rules": [
      {
        "toolName": "my_tool",
        "condition": "params.dangerous === true",
        "action": "prompt",
        "message": "This operation is potentially dangerous",
        "priority": 100
      }
    ]
  }
}
```

### Custom Tools
```json
{
  "tools": {
    "custom": [
      {
        "name": "my_tool",
        "description": "Does something useful",
        "schema": {
          "type": "object",
          "properties": {
            "input": {"type": "string"}
          }
        },
        "handler": "./tools/my-tool.js",
        "requiresApproval": true
      }
    ]
  }
}
```

## Agent Templates

Choose from built-in templates or create custom ones:

```bash
# Use built-in template
chat-tools create --template development-helper

# List available templates  
chat-tools templates list

# Create from custom config
chat-tools start --config ./my-config.json
```

This approach allows users to:
1. **Install once**: `npm install -g chat-tools`
2. **Configure easily**: JSON config files with templates
3. **Extend simply**: Add MCP servers, custom tools, approval rules
4. **Reuse agents**: Save configurations for different use cases
5. **No coding required**: Pure configuration-based setup
