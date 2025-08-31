#!/usr/bin/env node

import React, { useState, useEffect } from "react";
import { render, Box, Text, useInput } from "ink";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { highlight } from "cli-highlight";
import {
  ChatView,
  StatusBar,
  Layout,
  ToolMessage,
  ToolConfirmation,
  CommandInput,
  LoadingSpinner,
  ProgressBar,
  Dialog,
  ClipboardContext,
  TodoList,
  CodeBlock,
} from "./components/index.js";
import { Message } from "./types.js";
import { useCompletion } from "./hooks/index.js";

// @ts-ignore
marked.use(markedTerminal());

interface ToolExecution {
  name: string;
  description: string;
  parameters: any;
  riskLevel: "low" | "medium" | "high";
  autoApprove?: boolean;
}

interface ContextFile {
  name: string;
  path: string;
  type: "file" | "directory";
  content?: string;
}

const MODELS = [
  "gpt-4-turbo",
  "gpt-4",
  "claude-3-opus",
  "claude-3-sonnet",
  "claude-3-haiku",
  "gemini-pro",
];

const SAMPLE_TOOLS: Record<string, ToolExecution> = {
  "list-files": {
    name: "list-files",
    description: "List files in the specified directory",
    parameters: { path: ".", recursive: false },
    riskLevel: "low",
    autoApprove: true,
  },
  "read-file": {
    name: "read-file",
    description: "Read contents of a file",
    parameters: { path: "package.json" },
    riskLevel: "low",
  },
  "write-file": {
    name: "write-file",
    description: "Write content to a file",
    parameters: { path: "output.txt", content: "Hello World" },
    riskLevel: "medium",
  },
  "execute-command": {
    name: "execute-command",
    description: "Execute a system command",
    parameters: { command: "ls -la" },
    riskLevel: "high",
  },
  "install-package": {
    name: "install-package",
    description: "Install an npm package",
    parameters: { package: "lodash", dev: false },
    riskLevel: "medium",
  },
};

const SAMPLE_CONTEXTS: ContextFile[] = [
  {
    name: "package.json",
    path: "./package.json",
    type: "file",
    content: JSON.stringify({ name: "chat-demo", version: "1.0.0" }, null, 2),
  },
  {
    name: "src/",
    path: "./src",
    type: "directory",
  },
  {
    name: "README.md",
    path: "./README.md",
    type: "file",
    content:
      "# Chat Demo\n\nA terminal-based chat application with AI assistance.",
  },
  {
    name: "components/",
    path: "./components",
    type: "directory",
  },
];

const ChatDemo: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentModel, setCurrentModel] = useState("claude-3-sonnet");
  const [isTyping, setIsTyping] = useState(false);
  const [contextFiles, setContextFiles] = useState<ContextFile[]>([]);
  const [pendingTool, setPendingTool] = useState<ToolExecution | null>(null);
  const [showToolApproval, setShowToolApproval] = useState(false);
  const [clipboardContent, setClipboardContent] = useState<string>("");
  const [showClipboard, setShowClipboard] = useState(false);
  const [todos, setTodos] = useState<any[]>([]);
  const [showTodos, setShowTodos] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState<{
    title: string;
    content: string;
  }>({ title: "", content: "" });

  // Simulate clipboard access (in real app, use clipboard API)
  const simulateClipboardAccess = () => {
    const sampleClipboard = `import React from 'react';
import { Box, Text } from 'ink';

const MyComponent = () => {
  return (
    <Box>
      <Text color="green">Hello from clipboard!</Text>
    </Box>
  );
};

export default MyComponent;`;

    setClipboardContent(sampleClipboard);
    setShowClipboard(true);

    addMessage({
      role: "system",
      content:
        "📋 **Clipboard content detected!** Use `@clipboard` to add it to context or press Enter to dismiss.",
    });
  };

  const addMessage = (message: Omit<Message, "id" | "timestamp">) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const AUTO_RESPONSES = [
    {
      trigger: /hello|hi|hey|start/i,
      response: `# Hello! 👋

I'm your AI assistant running on **{model}**. 

## I can help you with:
- 📁 File operations (reading, writing, listing)
- 💻 Code execution and analysis  
- 📦 Package management
- ⚡ System commands
- 🎯 Context-aware conversations
- 🔧 Tool integrations

Try asking me to **list files** or help with a **coding task**.

**Pro tip**: Use \`@filename\` to add context or \`/command\` for special actions!`,
    },
    {
      trigger: /list files|ls|dir|show files/i,
      response: "I'll list the files in the current directory for you.",
      tool: "list-files",
    },
    {
      trigger: /read (.*\.json|.*\.md|.*\.txt|.*\.js|.*\.ts|.*\.tsx)/i,
      response: "I'll read that file for you.",
      tool: "read-file",
      extractPath: true,
    },
    {
      trigger: /install|npm install|yarn add/i,
      response: "I can help you install packages. Let me check what you need.",
      tool: "install-package",
    },
    {
      trigger: /help|commands|what can you do/i,
      response: `# 🚀 Available Commands & Features

## Chat Commands
- \`/clear\` - Clear chat history
- \`/model\` - Switch AI model 
- \`/export\` - Export chat history
- \`/status\` - Show current status

## Context Commands  
- \`@file.ext\` - Include file in context
- \`@dir/\` - Include directory in context
- \`@clipboard\` - Add clipboard content to context
- \`/context list\` - Show current context
- \`/context clear\` - Clear context

## Tool Commands
- \`/tools list\` - Show available tools
- \`/approve\` - Approve pending tool execution
- \`/deny\` - Deny pending tool execution

## System Commands
- \`/quit\` - Exit the application
- \`/todos\` - Show/hide todo list
- \`/clipboard\` - Show/hide clipboard viewer
- \`Ctrl+V\` - Access clipboard content
- \`Ctrl+C\` - Force exit

## Pro Tips
- Use **markdown** in your messages for rich formatting
- Context files help me understand your project better
- Tools require approval for security - check the details!
- Press **Escape** to close any open dialogs`,
    },
    {
      trigger: /todos?|task|todo list/i,
      response: "I'll show you the todo list with current tasks.",
      action: () => setShowTodos(true),
    },
    {
      trigger: /clipboard|paste|ctrl\+v/i,
      response: "I'll simulate clipboard access for you.",
      action: () => simulateClipboardAccess(),
    },
    {
      trigger: /dialog|modal|popup/i,
      response: "I'll show you a dialog with code highlighting.",
      action: () => {
        setDialogContent({
          title: "Code Example Dialog",
          content: `const example = {
  name: "Dialog Demo",
  features: ["syntax highlighting", "modal display", "interactive"],
  render: () => <Dialog>Content here</Dialog>
};`,
        });
        setShowDialog(true);
      },
    },
    {
      trigger: /code|syntax|highlight|example/i,
      response: `# 🎨 Code Examples with Syntax Highlighting

Here are some examples showcasing the terminal's code rendering:

## JavaScript Example
\`\`\`javascript
// Modern React component with hooks
import React, { useState, useEffect } from 'react';
import { ChatView } from './components';

const ChatDemo = () => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  
  useEffect(() => {
    console.log('Chat demo initialized! 🚀');
  }, []);

  const handleMessage = async (content) => {
    setMessages(prev => [...prev, { 
      id: Date.now(), 
      content, 
      role: 'user' 
    }]);
    
    setIsTyping(true);
    await simulateAiResponse();
    setIsTyping(false);
  };

  return <ChatView messages={messages} loading={isTyping} />;
};
\`\`\`

## Python Example  
\`\`\`python
# Async Python with type hints
import asyncio
from typing import List, Optional, Dict, Any
import aiohttp

class ChatBot:
    def __init__(self, model: str = "gpt-4"):
        self.model = model
        self.messages: List[Dict[str, Any]] = []
    
    async def send_message(self, content: str) -> Optional[str]:
        """Send message and get AI response"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.openai.com/v1/chat/completions",
                    json={
                        "model": self.model,
                        "messages": self.messages + [{"role": "user", "content": content}]
                    }
                ) as response:
                    data = await response.json()
                    return data["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"Error: {e}")
            return None

# Usage
bot = ChatBot("gpt-4-turbo")
response = await bot.send_message("Hello, world!")
\`\`\`

## Bash/Terminal
\`\`\`bash
#!/bin/bash
# Terminal chat setup script

echo "🚀 Setting up terminal chat demo..."

# Install dependencies
npm install ink react marked-terminal cli-highlight chalk

# Build the project
npm run build

echo "✅ Setup complete! Run: npm start"

# Start the demo
npm start
\`\`\`

**Pretty cool, right?** The terminal supports full syntax highlighting for 50+ languages!`,
    },
    {
      trigger: /model|models|switch|change model/i,
      response: `# 🤖 AI Models Available

## Current Model: **{model}**

## Available Models:
${MODELS.map((model) => `- **${model}**`).join("\n")}

Use \`/model <name>\` to switch models, or just \`/model\` for interactive selection.

Each model has different capabilities:
- **GPT-4 Turbo**: Latest OpenAI model with enhanced capabilities
- **Claude-3 Opus**: Anthropic's most powerful model
- **Claude-3 Sonnet**: Balanced performance and speed
- **Gemini Pro**: Google's advanced multimodal model`,
    },
  ];

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: "welcome",
      role: "system",
      content: `# 🚀 Advanced Terminal Chat Demo

**Model**: ${currentModel}  
**Features**: Tool calling, Markdown rendering, Syntax highlighting, Context management

Type **\`hello\`** to get started or **\`/help\`** for commands!

---`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);

    // Initialize todos
    setTodos([
      {
        id: "1",
        title: "Setup chat environment",
        description: "Initialize the chat demo with all components",
        status: "completed",
        progress: 100,
      },
      {
        id: "2",
        title: "Add clipboard support",
        description: "Enable Ctrl+V for @clipboard context",
        status: "running",
        progress: 75,
      },
      {
        id: "3",
        title: "Implement syntax highlighting",
        description: "Use cli-highlight and shiki for code blocks",
        status: "pending",
        progress: 0,
      },
    ]);
  }, []);

  // Handle keyboard shortcuts
  useInput((input, key) => {
    // Ctrl+V for clipboard
    if (key.ctrl && input === "v") {
      simulateClipboardAccess();
    }

    // Escape to close overlays
    if (key.escape) {
      setShowClipboard(false);
      setShowTodos(false);
      setShowDialog(false);
    }
  });

  const simulateTyping = async (
    duration: number = 1000 + Math.random() * 2000
  ) => {
    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, duration));
    setIsTyping(false);
  };

  const processMarkdown = (content: string): string => {
    try {
      // Handle code blocks with syntax highlighting first
      const processedContent = content.replace(
        /```(\w+)?\n([\s\S]*?)```/g,
        (match, lang, code) => {
          try {
            const highlighted = highlight(code.trim(), {
              language: lang || "javascript",
            });
            return `\n${highlighted}\n`;
          } catch (e) {
            return `\n${code.trim()}\n`;
          }
        }
      );

      // Then process through marked for other markdown
      return marked.parse(content) as string;
    } catch (e) {
      return content;
    }
  };

  const handleToolExecution = async (
    tool: ToolExecution,
    approved: boolean = false
  ) => {
    if (!approved && !tool.autoApprove) {
      setPendingTool(tool);
      setShowToolApproval(true);
      return;
    }

    // Add tool start message
    addMessage({
      role: "system",
      content: `🔧 Executing tool: **${tool.name}**`,
    });

    // Simulate tool execution with progress
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Add completion message with results
    const results = await simulateToolResults(tool);
    addMessage({
      role: "tool",
      content: results,
      metadata: { tool_name: tool.name },
    });
  };

  const simulateToolResults = async (tool: ToolExecution): Promise<string> => {
    switch (tool.name) {
      case "list-files":
        return `# 📁 Directory Contents

\`\`\`
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── components/
│   │   ├── ChatView.tsx
│   │   ├── CommandInput.tsx
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useCompletion.tsx
│   │   └── index.ts  
│   ├── types.ts
│   └── chatDemo.tsx
├── dist/
└── node_modules/
\`\`\`

**Found**: 8 files, 4 directories`;

      case "read-file":
        return `# 📄 File Contents: ${tool.parameters.path}

\`\`\`json
{
  "name": "@chat-tools/tui",
  "version": "1.0.0",
  "description": "Terminal UI components for chat applications",
  "main": "dist/index.js",
  "dependencies": {
    "react": "^18.2.0",
    "ink": "^4.4.1",
    "chalk": "^5.3.0",
    "marked": "^16.2.1",
    "marked-terminal": "^7.3.0",
    "cli-highlight": "^2.1.11"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/chatDemo.tsx",
    "start": "node dist/chatDemo.js"
  }
}
\`\`\``;

      case "execute-command":
        return `# ⚡ Command Execution: \`${tool.parameters.command}\`

\`\`\`bash
$ ${tool.parameters.command}
total 48
drwxr-xr-x  8 user staff   256 Dec 15 10:30 .
drwxr-xr-x 12 user staff   384 Dec 15 09:15 ..
-rw-r--r--  1 user staff  1024 Dec 15 10:30 package.json
drwxr-xr-x  6 user staff   192 Dec 15 10:28 src
drwxr-xr-x  3 user staff    96 Dec 15 10:25 dist
-rw-r--r--  1 user staff   512 Dec 15 09:45 README.md
\`\`\`

**Exit code**: 0 ✅`;

      case "install-package":
        return `# 📦 Package Installation: ${tool.parameters.package}

\`\`\`bash
npm install ${tool.parameters.package}${
          tool.parameters.dev ? " --save-dev" : ""
        }

added 1 package, and audited 324 packages in 2s
found 0 vulnerabilities
\`\`\`

**Status**: ✅ Successfully installed!`;

      default:
        return `# ✅ Tool Execution Complete

**Tool**: ${tool.name}  
**Status**: Success  
**Duration**: 1.2s`;
    }
  };

  const processAutoResponse = async (userMessage: string) => {
    await simulateTyping();

    for (const response of AUTO_RESPONSES) {
      if (response.trigger.test(userMessage)) {
        let content = response.response.replace(/\{model\}/g, currentModel);

        // Execute action if provided
        if ((response as any).action) {
          (response as any).action();
        }

        // Extract file path if needed
        if ((response as any).extractPath && (response as any).tool) {
          const match = userMessage.match(response.trigger);
          if (match && match[1]) {
            const tool = { ...SAMPLE_TOOLS[(response as any).tool] };
            tool.parameters.path = match[1];

            addMessage({
              role: "assistant",
              content: processMarkdown(content),
              metadata: { model: currentModel },
            });

            setTimeout(() => {
              handleToolExecution(tool);
            }, 500);
            return;
          }
        }

        addMessage({
          role: "assistant",
          content: processMarkdown(content),
          metadata: { model: currentModel },
        });

        if ((response as any).tool && SAMPLE_TOOLS[(response as any).tool]) {
          setTimeout(() => {
            handleToolExecution(SAMPLE_TOOLS[(response as any).tool]);
          }, 800);
        }
        return;
      }
    }

    // Default smart responses
    const defaultResponses = [
      `That's interesting! I'm **${currentModel}** and I'm here to help. Could you tell me more about what you need?`,
      `I understand you're asking about that. As **${currentModel}**, I can help you explore this further.`,
      `Great question! Let me think about that using **${currentModel}**'s capabilities...`,
      `I see what you mean. Running with **${currentModel}** - how can I assist you better?`,
    ];

    const randomResponse =
      defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    addMessage({
      role: "assistant",
      content: processMarkdown(randomResponse),
      metadata: { model: currentModel },
    });
  };

  // Define commands for the CommandInput component
  const commands = [
    {
      name: "clear",
      description: "Clear all messages",
      handler: () => {
        setMessages([]);
      },
      aliases: ["cls"],
    },
    {
      name: "model",
      description: "Show/change AI model",
      handler: (args: string[]) => {
        if (args.length === 0) {
          const modelList = MODELS.map(
            (model) =>
              `- **${model}**${model === currentModel ? " *(current)*" : ""}`
          ).join("\n");

          addMessage({
            role: "system",
            content: processMarkdown(
              `# 🤖 Available Models\n\n${modelList}\n\nUse \`/model <name>\` to switch.`
            ),
          });
        } else {
          const newModel = args[0];
          if (MODELS.includes(newModel)) {
            setCurrentModel(newModel);
            addMessage({
              role: "system",
              content: processMarkdown(`✅ Switched to model: **${newModel}**`),
            });
          } else {
            addMessage({
              role: "system",
              content: `❌ Unknown model: ${newModel}. Available: ${MODELS.join(
                ", "
              )}`,
            });
          }
        }
      },
    },
    {
      name: "tools",
      description: "List available tools",
      handler: (args: string[]) => {
        if (args[0] === "list" || args.length === 0) {
          const toolsList = Object.values(SAMPLE_TOOLS)
            .map(
              (tool) =>
                `- **${tool.name}** - ${tool.description} *(${tool.riskLevel} risk)*`
            )
            .join("\n");

          addMessage({
            role: "system",
            content: processMarkdown(`# 🔧 Available Tools\n\n${toolsList}`),
          });
        }
      },
    },
    {
      name: "context",
      description: "Manage context files",
      handler: (args: string[]) => {
        if (args[0] === "list" || args.length === 0) {
          if (contextFiles.length === 0) {
            addMessage({
              role: "system",
              content:
                "📎 No context files loaded. Use `@filename` to add files to context.",
            });
          } else {
            const contextList = contextFiles
              .map((file) => `- **${file.name}** *(${file.type})*`)
              .join("\n");

            addMessage({
              role: "system",
              content: processMarkdown(
                `# 📎 Current Context\n\n${contextList}`
              ),
            });
          }
        } else if (args[0] === "clear") {
          setContextFiles([]);
          addMessage({
            role: "system",
            content: "📎 Context cleared!",
          });
        }
      },
    },
    {
      name: "status",
      description: "Show current status",
      handler: () => {
        addMessage({
          role: "system",
          content: processMarkdown(`# 📊 Status Report

**Model**: ${currentModel}  
**Messages**: ${messages.length}  
**Context Files**: ${contextFiles.length}  
**System**: Ready ✅

---
*Terminal Chat Demo v1.0.0*`),
        });
      },
    },
    {
      name: "export",
      description: "Export chat history",
      handler: () => {
        addMessage({
          role: "system",
          content: `💾 Chat history would be exported to \`chat_export_${Date.now()}.json\``,
        });
      },
    },
    {
      name: "approve",
      description: "Approve pending tool execution",
      handler: () => {
        if (pendingTool) {
          setShowToolApproval(false);
          handleToolExecution(pendingTool, true);
          setPendingTool(null);
          addMessage({
            role: "system",
            content: `✅ Approved tool execution: **${pendingTool.name}**`,
          });
        } else {
          addMessage({
            role: "system",
            content: "❌ No pending tool execution to approve.",
          });
        }
      },
    },
    {
      name: "deny",
      description: "Deny pending tool execution",
      handler: () => {
        if (pendingTool) {
          setShowToolApproval(false);
          addMessage({
            role: "system",
            content: `❌ Denied tool execution: **${pendingTool.name}**`,
          });
          setPendingTool(null);
        } else {
          addMessage({
            role: "system",
            content: "❌ No pending tool execution to deny.",
          });
        }
      },
    },
    {
      name: "quit",
      description: "Exit the application",
      handler: () => {
        process.exit(0);
      },
      aliases: ["exit", "q"],
    },
  ];

  const handleContextFile = (input: string) => {
    const fileName = input.slice(1); // Remove @
    const existingFile = SAMPLE_CONTEXTS.find((f) => f.name === fileName);

    if (existingFile) {
      setContextFiles((prev) => {
        if (prev.find((f) => f.name === fileName)) return prev;
        return [...prev, existingFile];
      });

      addMessage({
        role: "system",
        content: `📎 Added **${fileName}** to context`,
      });
    } else {
      addMessage({
        role: "system",
        content: `❌ File not found: ${fileName}. Available: ${SAMPLE_CONTEXTS.map(
          (f) => f.name
        ).join(", ")}`,
      });
    }
  };

  const handleSubmit = async (input: string) => {
    if (!input.trim()) return;

    // Handle clipboard context
    if (input === "@clipboard" && clipboardContent) {
      addMessage({
        role: "system",
        content: `📋 **Clipboard Content Added to Context**\n\n\`\`\`\n${clipboardContent}\n\`\`\``,
      });
      return;
    }

    if (input.startsWith("@")) {
      handleContextFile(input);
      return;
    }

    // Handle special commands
    if (input === "/todos") {
      setShowTodos(!showTodos);
      return;
    }

    if (input === "/clipboard") {
      setShowClipboard(!showClipboard);
      return;
    }

    // Add user message
    addMessage({
      role: "user",
      content: input,
    });

    // Process response
    await processAutoResponse(input);
  };

  return (
    <Layout>
      <Box flexDirection="column" height="100%">
        {/* Header */}
        <Box paddingX={2} paddingY={1} borderStyle="double" borderColor="cyan">
          <Text bold color="cyan">
            🚀 Advanced Terminal Chat - {currentModel}
          </Text>
        </Box>

        {/* Main content area */}
        <Box flexDirection="column" flexGrow={1}>
          {/* Tool approval dialog */}
          {showToolApproval && pendingTool && (
            <ToolConfirmation
              toolName={pendingTool.name}
              description={pendingTool.description}
              parameters={pendingTool.parameters}
              riskLevel={pendingTool.riskLevel}
              onConfirm={() => {
                setShowToolApproval(false);
                handleToolExecution(pendingTool, true);
                setPendingTool(null);
              }}
              onCancel={() => {
                setShowToolApproval(false);
                setPendingTool(null);
              }}
              allowEdit={true}
            />
          )}

          {/* Chat view */}
          <ChatView
            messages={messages.map((msg) => ({
              ...msg,
              content:
                msg.role === "assistant" || msg.role === "system"
                  ? processMarkdown(msg.content)
                  : msg.content,
            }))}
            loading={isTyping}
          />

          {/* Clipboard Context */}
          {showClipboard && clipboardContent && (
            <ClipboardContext
              content={clipboardContent}
              onDismiss={() => setShowClipboard(false)}
              maxLines={10}
            />
          )}

          {/* Todo List */}
          {showTodos && (
            <TodoList
              todos={todos}
              onUpdate={setTodos}
              showProgress={true}
              interactive={true}
            />
          )}

          {/* Dialog */}
          {showDialog && (
            <Dialog
              title={dialogContent.title}
              isOpen={showDialog}
              onClose={() => setShowDialog(false)}
              borderColor="cyan"
            >
              <CodeBlock
                code={dialogContent.content}
                language="javascript"
                showLineNumbers={true}
                maxLines={15}
              />
            </Dialog>
          )}

          {/* Context indicator */}
          {contextFiles.length > 0 && (
            <Box paddingX={2} marginY={1}>
              <Text color="blue" bold>
                📎 Context: {contextFiles.map((f) => f.name).join(", ")}
              </Text>
            </Box>
          )}
        </Box>

        {/* Input area */}
        <Box paddingX={2} paddingY={1}>
          <CommandInput
            trigger="/"
            commands={commands}
            onSubmit={handleSubmit}
            placeholder="Type a message, /command, @file, or Ctrl+V for clipboard..."
          />
        </Box>

        {/* Status bar */}
        <StatusBar
          status="connected"
          connectionInfo={currentModel}
          extensionInfo="All Components Active"
          messageCount={messages.length}
        />
      </Box>
    </Layout>
  );
};

// Render the app
render(<ChatDemo />);

export { ChatDemo };
