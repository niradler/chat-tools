#!/usr/bin/env node

import React, { useState, useEffect, useRef } from "react";
import { render, Box, Text, useInput, useApp } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import chalk from "chalk";
import { highlight } from "cli-highlight";
import figures from "figures";

const options = {
  code: chalk.cyan,
  blockquote: chalk.gray.italic,
  html: chalk.gray,
  heading: chalk.green.bold,
  firstHeading: chalk.magenta.underline.bold,
  hr: chalk.reset,
  listitem: chalk.reset,
  table: chalk.reset,
  paragraph: chalk.reset,
  strong: chalk.bold,
  em: chalk.italic,
  codespan: chalk.bgBlack.white,
};

// @ts-ignore
marked.use(markedTerminal());

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: Date;
  model?: string;
  toolName?: string;
  toolStatus?: "pending" | "approved" | "running" | "completed" | "failed";
  toolParameters?: any;
  isMarkdown?: boolean;
  needsApproval?: boolean;
}

interface ToolExecution {
  name: string;
  description: string;
  parameters: any;
  riskLevel: "low" | "medium" | "high";
  autoApprove?: boolean;
}

interface Command {
  name: string;
  description: string;
  handler: (args: string[]) => void | Promise<void>;
  aliases?: string[];
}

interface ContextFile {
  name: string;
  path: string;
  type: "file" | "directory";
  content?: string;
}

type ViewMode = "chat" | "tools" | "settings" | "help";
type InputMode = "chat" | "command" | "context" | "approval";

const MODELS = [
  "gpt-4-turbo",
  "gpt-4",
  "claude-3-opus",
  "claude-3-sonnet",
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
];

const AUTO_RESPONSES = [
  {
    trigger: /hello|hi|hey/i,
    response: `Hello! 👋 I'm your AI assistant running on **{model}**. 

I can help you with:
- File operations (reading, writing, listing)
- Code execution and analysis  
- Package management
- System commands
- And much more!

Try asking me to list files or help with a coding task.`,
  },
  {
    trigger: /list files|ls|dir/i,
    response: "I'll list the files in the current directory for you.",
    tool: "list-files",
  },
  {
    trigger: /read (.*\.json|.*\.md|.*\.txt)/i,
    response: "I'll read that file for you.",
    tool: "read-file",
    extractPath: true,
  },
  {
    trigger: /install|npm|yarn/i,
    response: "I can help you install packages. Let me check what you need.",
    tool: "install-package",
  },
  {
    trigger: /help|commands/i,
    response: `## Available Commands

### Chat Commands
- \`/clear\` - Clear chat history
- \`/model <name>\` - Switch AI model
- \`/export\` - Export chat history

### Context Commands  
- \`@file.ext\` - Include file in context
- \`@dir/\` - Include directory in context
- \`/context list\` - Show current context

### Tool Commands
- \`/tools list\` - Show available tools
- \`/approve\` - Approve pending tool execution
- \`/deny\` - Deny pending tool execution

### System
- \`/quit\` - Exit the application
- \`Ctrl+C\` - Force exit`,
  },
  {
    trigger: /code|syntax|highlight/i,
    response: `Here's some sample code with syntax highlighting:

\`\`\`javascript
// Example function with syntax highlighting
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Usage
console.log("Fibonacci sequence:");
for (let i = 0; i < 10; i++) {
  console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}
\`\`\`

\`\`\`python
# Python example with proper highlighting
import asyncio
from typing import List, Optional

async def fetch_data(url: str) -> Optional[dict]:
    \"\"\"Fetch data from API endpoint\"\"\"
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                return await response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None
\`\`\``,
  },
];

const ChatDemo: React.FC = () => {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("chat");
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const [currentModel, setCurrentModel] = useState("claude-3-sonnet");
  const [isTyping, setIsTyping] = useState(false);
  const [contextFiles, setContextFiles] = useState<ContextFile[]>([]);
  const [pendingTool, setPendingTool] = useState<ToolExecution | null>(null);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [showToolApproval, setShowToolApproval] = useState(false);
  const scrollRef = useRef<any>(null);

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: "welcome",
      role: "system",
      content: `🚀 **Terminal Chat Demo Started**

**Model:** ${currentModel}
**Features:** Tool calling, Markdown rendering, Syntax highlighting, Context management

Type \`/help\` for available commands or just start chatting!`,
      timestamp: new Date(),
      isMarkdown: true,
    };
    setMessages([welcomeMessage]);
  }, []);

  const addMessage = (message: Omit<Message, "id" | "timestamp">) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const simulateTyping = async (duration: number = 1500) => {
    setIsTyping(true);
    await new Promise((resolve) => setTimeout(resolve, duration));
    setIsTyping(false);
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

    // Add tool execution message
    addMessage({
      role: "tool",
      content: `**Tool:** ${tool.name}
**Status:** Running
**Parameters:** ${JSON.stringify(tool.parameters, null, 2)}`,
      toolName: tool.name,
      toolStatus: "running",
      toolParameters: tool.parameters,
      isMarkdown: true,
    });

    // Simulate tool execution
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Add completion message with results
    const results = await simulateToolResults(tool);
    addMessage({
      role: "tool",
      content: `**Tool:** ${tool.name}
**Status:** ✅ Completed
**Duration:** 1.2s

**Results:**
${results}`,
      toolName: tool.name,
      toolStatus: "completed",
      isMarkdown: true,
    });
  };

  const simulateToolResults = async (tool: ToolExecution): Promise<string> => {
    switch (tool.name) {
      case "list-files":
        return `\`\`\`
├── package.json
├── tsconfig.json
├── src/
│   ├── components/
│   ├── utils/
│   └── index.tsx
├── dist/
└── README.md
\`\`\``;

      case "read-file":
        return `\`\`\`json
{
  "name": "chat-tools-demo",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "ink": "^4.4.1",
    "marked": "^16.2.1"
  }
}
\`\`\``;

      case "execute-command":
        return `\`\`\`bash
$ ${tool.parameters.command}
total 48
drwxr-xr-x  8 user staff   256 Dec 15 10:30 .
drwxr-xr-x 12 user staff   384 Dec 15 09:15 ..
-rw-r--r--  1 user staff  1024 Dec 15 10:30 package.json
drwxr-xr-x  6 user staff   192 Dec 15 10:28 src
-rw-r--r--  1 user staff   512 Dec 15 09:45 README.md
\`\`\``;

      default:
        return "Tool executed successfully.";
    }
  };

  const processAutoResponse = async (userMessage: string) => {
    await simulateTyping();

    for (const response of AUTO_RESPONSES) {
      if (response.trigger.test(userMessage)) {
        let content = response.response.replace("{model}", currentModel);

        // Extract file path if needed
        if (response.extractPath && response.tool) {
          const match = userMessage.match(response.trigger);
          if (match && match[1]) {
            const tool = { ...SAMPLE_TOOLS[response.tool] };
            tool.parameters.path = match[1];
            await handleToolExecution(tool);
            return;
          }
        }

        addMessage({
          role: "assistant",
          content,
          model: currentModel,
          isMarkdown: true,
        });

        if (response.tool && SAMPLE_TOOLS[response.tool]) {
          setTimeout(() => {
            handleToolExecution(SAMPLE_TOOLS[response.tool]);
          }, 1000);
        }
        return;
      }
    }

    // Default response
    const defaultResponses = [
      `That's interesting! I'm running on **${currentModel}** and ready to help.`,
      `I understand. Let me process that using **${currentModel}**.`,
      `Great question! As **${currentModel}**, I can help you with that.`,
      `I see what you mean. Running analysis with **${currentModel}**...`,
    ];

    const randomResponse =
      defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    addMessage({
      role: "assistant",
      content: randomResponse,
      model: currentModel,
      isMarkdown: true,
    });
  };

  const handleCommand = async (input: string) => {
    const [command, ...args] = input.slice(1).split(" ");

    switch (command.toLowerCase()) {
      case "clear":
        setMessages([]);
        break;

      case "model":
        if (args.length === 0) {
          setShowModelSelect(true);
        } else {
          const model = args[0];
          if (MODELS.includes(model)) {
            setCurrentModel(model);
            addMessage({
              role: "system",
              content: `Switched to model: **${model}**`,
              isMarkdown: true,
            });
          } else {
            addMessage({
              role: "system",
              content: `Unknown model: ${model}. Available models: ${MODELS.join(
                ", "
              )}`,
            });
          }
        }
        break;

      case "tools":
        if (args[0] === "list") {
          const toolsList = Object.values(SAMPLE_TOOLS)
            .map(
              (tool) =>
                `- **${tool.name}** - ${tool.description} (${tool.riskLevel} risk)`
            )
            .join("\n");

          addMessage({
            role: "system",
            content: `## Available Tools\n\n${toolsList}`,
            isMarkdown: true,
          });
        }
        break;

      case "context":
        if (args[0] === "list") {
          if (contextFiles.length === 0) {
            addMessage({
              role: "system",
              content:
                "No context files loaded. Use `@filename` to add files to context.",
            });
          } else {
            const contextList = contextFiles
              .map((file) => `- **${file.name}** (${file.type})`)
              .join("\n");

            addMessage({
              role: "system",
              content: `## Current Context\n\n${contextList}`,
              isMarkdown: true,
            });
          }
        }
        break;

      case "export":
        addMessage({
          role: "system",
          content: "Chat history exported to `chat_export_${Date.now()}.json`",
        });
        break;

      case "approve":
        if (pendingTool) {
          setShowToolApproval(false);
          await handleToolExecution(pendingTool, true);
          setPendingTool(null);
        }
        break;

      case "deny":
        if (pendingTool) {
          setShowToolApproval(false);
          addMessage({
            role: "system",
            content: `Tool execution denied: **${pendingTool.name}**`,
            isMarkdown: true,
          });
          setPendingTool(null);
        }
        break;

      case "quit":
      case "exit":
        exit();
        break;

      default:
        addMessage({
          role: "system",
          content: `Unknown command: /${command}. Type \`/help\` for available commands.`,
        });
    }
  };

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
        content: `Added **${fileName}** to context`,
        isMarkdown: true,
      });
    } else {
      addMessage({
        role: "system",
        content: `File not found: ${fileName}. Available: ${SAMPLE_CONTEXTS.map(
          (f) => f.name
        ).join(", ")}`,
      });
    }
  };

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;

    const trimmedInput = inputValue.trim();
    setInputValue("");

    if (trimmedInput.startsWith("/")) {
      await handleCommand(trimmedInput);
    } else if (trimmedInput.startsWith("@")) {
      handleContextFile(trimmedInput);
    } else {
      addMessage({
        role: "user",
        content: trimmedInput,
      });
      await processAutoResponse(trimmedInput);
    }
  };

  const renderMessage = (message: Message) => {
    const timeStr = message.timestamp.toLocaleTimeString();

    let content = message.content;
    if (message.isMarkdown) {
      try {
        content = marked.parse(content) as string;
      } catch (e) {
        // Fallback to plain text if markdown parsing fails
      }
    }

    // Handle code blocks with syntax highlighting
    content = content.replace(
      /```(\w+)?\n([\s\S]*?)```/g,
      (match, lang, code) => {
        try {
          const highlighted = highlight(code.trim(), {
            language: lang || "javascript",
          });
          return `\n${highlighted}\n`;
        } catch (e) {
          return `\n${chalk.gray(code.trim())}\n`;
        }
      }
    );

    const roleColors = {
      user: "cyan",
      assistant: "green",
      system: "yellow",
      tool: "magenta",
    };

    const roleIcons = {
      user: "👤",
      assistant: "🤖",
      system: "⚙️",
      tool: "🔧",
    };

    return (
      <Box key={message.id} flexDirection="column" marginBottom={1}>
        <Box>
          <Text color={roleColors[message.role]} bold>
            {roleIcons[message.role]} {message.role.toUpperCase()}
          </Text>
          {message.model && (
            <Text color="gray" dimColor>
              {" "}
              [{message.model}]
            </Text>
          )}
          <Text color="gray" dimColor>
            {" "}
            {timeStr}
          </Text>
        </Box>
        <Box paddingLeft={2}>
          <Text>{content}</Text>
        </Box>
      </Box>
    );
  };

  const renderChat = () => (
    <Box flexDirection="column" height="100%">
      {/* Messages */}
      <Box flexDirection="column" flexGrow={1} paddingX={1}>
        {messages.map((message) => renderMessage(message))}
        {isTyping && (
          <Box paddingLeft={2}>
            <Spinner type="dots" />
            <Text color="gray" dimColor>
              {" "}
              AI is typing...
            </Text>
          </Box>
        )}
      </Box>

      {/* Context indicator */}
      {contextFiles.length > 0 && (
        <Box paddingX={1} marginY={1}>
          <Text color="blue" bold>
            📎 Context: {contextFiles.map((f) => f.name).join(", ")}
          </Text>
        </Box>
      )}

      {/* Input */}
      <Box paddingX={1} marginTop={1}>
        <Text color="cyan">{">"} </Text>
        <TextInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          placeholder="Type a message, /command, or @file..."
        />
      </Box>

      {/* Status bar */}
      <Box paddingX={1} marginTop={1} justifyContent="space-between">
        <Text color="gray">
          Model: {currentModel} | Messages: {messages.length}
        </Text>
        <Text color="gray">/help for commands | Ctrl+C to exit</Text>
      </Box>
    </Box>
  );

  const renderModelSelect = () => (
    <Box flexDirection="column" padding={2}>
      <Text bold color="cyan">
        Select AI Model:
      </Text>
      <Box marginBottom={1} />
      <SelectInput
        items={MODELS.map((model) => ({
          label: model === currentModel ? `${model} (current)` : model,
          value: model,
        }))}
        onSelect={(item) => {
          setCurrentModel(item.value);
          setShowModelSelect(false);
          addMessage({
            role: "system",
            content: `Switched to model: **${item.value}**`,
            isMarkdown: true,
          });
        }}
      />
    </Box>
  );

  const renderToolApproval = () => {
    if (!pendingTool) return null;

    const riskColors = {
      low: "green",
      medium: "yellow",
      high: "red",
    };

    return (
      <Box
        flexDirection="column"
        padding={2}
        borderStyle="single"
        borderColor="yellow"
      >
        <Text bold color="yellow">
          🛠️ Tool Approval Required
        </Text>
        <Box marginBottom={1} />

        <Text bold>Tool: {pendingTool.name}</Text>
        <Text>Description: {pendingTool.description}</Text>
        <Text color={riskColors[pendingTool.riskLevel]}>
          Risk Level: {pendingTool.riskLevel.toUpperCase()}
        </Text>

        <Box marginTop={1} marginBottom={1}>
          <Text bold>Parameters:</Text>
        </Box>
        <Box paddingLeft={2}>
          <Text>{JSON.stringify(pendingTool.parameters, null, 2)}</Text>
        </Box>

        <Box marginTop={2} gap={2}>
          <Text color="green" bold>
            [A] Approve
          </Text>
          <Text color="red" bold>
            [D] Deny
          </Text>
        </Box>
      </Box>
    );
  };

  useInput((input, key) => {
    if (key.ctrl && input === "c") {
      exit();
      return;
    }

    if (showModelSelect) {
      return; // Let SelectInput handle it
    }

    if (showToolApproval) {
      if (input.toLowerCase() === "a") {
        setShowToolApproval(false);
        if (pendingTool) {
          handleToolExecution(pendingTool, true);
          setPendingTool(null);
        }
      } else if (input.toLowerCase() === "d") {
        setShowToolApproval(false);
        if (pendingTool) {
          addMessage({
            role: "system",
            content: `Tool execution denied: **${pendingTool.name}**`,
            isMarkdown: true,
          });
          setPendingTool(null);
        }
      }
      return;
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box paddingX={2} paddingY={1} borderStyle="double" borderColor="cyan">
        <Text bold color="cyan">
          🚀 Advanced Terminal Chat Demo - {currentModel}
        </Text>
      </Box>

      {/* Main content */}
      <Box flexGrow={1}>
        {showModelSelect && renderModelSelect()}
        {showToolApproval && renderToolApproval()}
        {!showModelSelect && !showToolApproval && renderChat()}
      </Box>
    </Box>
  );
};

// Run the demo
render(<ChatDemo />);

export { ChatDemo };
