#!/usr/bin/env node

import React, { useState } from "react";
import { render, Box, Text, useInput } from "ink";
import {
  ChatView,
  StatusBar,
  Layout,
  ApprovalPrompt,
  ToolMessage,
  ToolConfirmation,
  CommandPrompt,
  CommandInput,
  HistoryViewer,
  SuggestionsDisplay,
  LoadingSpinner,
  ProgressBar,
  Dialog,
  ConfirmDialog,
  RadioButtonSelect,
  MaxSizedBox,
  TextBuffer,
} from "./components/index.js";
import { Message } from "./types.js";

type DemoView =
  | "overview"
  | "chat"
  | "tools"
  | "commands"
  | "history"
  | "suggestions"
  | "progress"
  | "live";

const DemoApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<DemoView>("overview");
  const [demoMessages, setDemoMessages] = useState<Message[]>([]);

  // Demo commands
  const demoCommands = [
    {
      name: "exit",
      description: "Exit the demo application",
      handler: () => {
        process.exit(0);
      },
      aliases: ["quit", "q"],
    },
    {
      name: "clear",
      description: "Clear all messages",
      handler: () => {
        setDemoMessages([]);
      },
      aliases: ["cls"],
    },
    {
      name: "demo",
      description: "Switch to a specific demo view",
      handler: (args: string[]) => {
        const view = args[0] as DemoView;
        if (
          [
            "overview",
            "chat",
            "tools",
            "commands",
            "history",
            "suggestions",
            "progress",
          ].includes(view)
        ) {
          setCurrentView(view);
          addSystemMessage(`Switched to ${view} demo`);
        } else {
          addSystemMessage(
            `Unknown demo: ${args[0]}. Available: overview, chat, tools, commands, history, suggestions, progress`
          );
        }
      },
    },
    {
      name: "help",
      description: "Show available commands",
      handler: () => {
        const helpText = demoCommands
          .map((cmd) => `/${cmd.name} - ${cmd.description}`)
          .join("\n");
        addSystemMessage(`Available commands:\n${helpText}`);
      },
      aliases: ["h"],
    },
    {
      name: "status",
      description: "Show current demo status",
      handler: () => {
        addSystemMessage(
          `Current view: ${currentView}\nMessages: ${demoMessages.length}\nDemo running successfully!`
        );
      },
    },
    {
      name: "echo",
      description: "Echo back the provided text",
      handler: (args: string[]) => {
        const text = args.join(" ");
        addSystemMessage(text ? `Echo: ${text}` : "Echo: (no text provided)");
      },
    },
  ];

  const addSystemMessage = (content: string) => {
    const message: Message = {
      id: String(Date.now()),
      role: "system",
      content,
      timestamp: new Date(),
    };
    setDemoMessages((prev) => [...prev, message]);
  };

  const addUserMessage = (content: string) => {
    const message: Message = {
      id: String(Date.now()),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setDemoMessages((prev) => [...prev, message]);
  };

  // Sample data
  const sampleMessages: Message[] = [
    {
      id: "1",
      role: "system",
      content: "Welcome to Chat Tools Framework! 🚀",
      timestamp: new Date(Date.now() - 120000),
    },
    {
      id: "2",
      role: "user",
      content: "Can you help me list files in the current directory?",
      timestamp: new Date(Date.now() - 90000),
    },
    {
      id: "3",
      role: "assistant",
      content: "I'll help you list the files. Let me execute the ls command.",
      timestamp: new Date(Date.now() - 60000),
    },
    {
      id: "4",
      role: "tool",
      content:
        "packages/\n├── agent/\n├── cli/\n├── core/\n├── tui/\n└── storage/",
      timestamp: new Date(Date.now() - 30000),
      metadata: { tool_name: "file-operations" },
    },
  ];

  const sampleSuggestions = [
    {
      id: "1",
      text: "ls -la",
      description: "List all files with details",
      category: "command" as const,
      confidence: 0.9,
    },
    {
      id: "2",
      text: "git status",
      description: "Check git repository status",
      category: "command" as const,
      confidence: 0.8,
    },
    {
      id: "3",
      text: "npm install",
      description: "Install npm dependencies",
      category: "command" as const,
      confidence: 0.7,
    },
    {
      id: "4",
      text: "Hello, how can I help?",
      description: "Greeting template",
      category: "template" as const,
      confidence: 0.6,
    },
  ];

  const sampleHistory = [
    {
      id: "1",
      timestamp: new Date(),
      type: "command" as const,
      content: "ls -la",
      status: "success" as const,
    },
    {
      id: "2",
      timestamp: new Date(),
      type: "message" as const,
      content: "Hello there!",
    },
    {
      id: "3",
      timestamp: new Date(),
      type: "tool" as const,
      content: "file-operations executed",
      status: "success" as const,
    },
    {
      id: "4",
      timestamp: new Date(),
      type: "system" as const,
      content: "Session started",
    },
  ];

  const sampleCommandSuggestions = [
    {
      command: "ls -la",
      description: "List all files with permissions",
      category: "file",
    },
    {
      command: "git status",
      description: "Show git repository status",
      category: "git",
    },
    {
      command: "npm run build",
      description: "Build the project",
      category: "npm",
    },
  ];

  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === "c")) {
      process.exit();
    }

    // Navigation
    if (input === "1") setCurrentView("overview");
    if (input === "2") setCurrentView("chat");
    if (input === "3") setCurrentView("tools");
    if (input === "4") setCurrentView("commands");
    if (input === "5") setCurrentView("history");
    if (input === "6") setCurrentView("suggestions");
    if (input === "7") setCurrentView("progress");
    if (input === "8") setCurrentView("live");
  });

  const renderNavigation = () => (
    <Box
      justifyContent="space-around"
      borderStyle="single"
      borderColor="cyan"
      paddingY={0}
      marginBottom={1}
    >
      <Text color={currentView === "overview" ? "cyan" : "gray"}>
        [1] Overview
      </Text>
      <Text color={currentView === "chat" ? "cyan" : "gray"}>[2] Chat</Text>
      <Text color={currentView === "tools" ? "cyan" : "gray"}>[3] Tools</Text>
      <Text color={currentView === "commands" ? "cyan" : "gray"}>
        [4] Commands
      </Text>
      <Text color={currentView === "history" ? "cyan" : "gray"}>
        [5] History
      </Text>
      <Text color={currentView === "suggestions" ? "cyan" : "gray"}>
        [6] Suggestions
      </Text>
      <Text color={currentView === "progress" ? "cyan" : "gray"}>
        [7] Progress
      </Text>
      <Text color={currentView === "live" ? "cyan" : "gray"}>
        [8] Live Demo
      </Text>
    </Box>
  );

  const renderOverview = () => (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={2}>
        <Text bold color="cyan">
          🚀 Chat Tools Framework - TUI Components Library
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={2}>
        <Text bold color="green">
          📦 Available Components:
        </Text>
        <Box paddingLeft={2} flexDirection="column">
          <Text>• ChatView - Message display with role-based styling</Text>
          <Text>• StatusBar - Connection and system status</Text>
          <Text>• ApprovalPrompt - User approval for actions</Text>
          <Text>• ToolMessage - Tool execution results</Text>
          <Text>• ToolConfirmation - Tool execution approval</Text>
          <Text>• CommandPrompt - Interactive command input</Text>
          <Text>• HistoryViewer - Command/message history</Text>
          <Text>• SuggestionsDisplay - Smart suggestions</Text>
          <Text>• LoadingSpinner - Various loading animations</Text>
          <Text>• ProgressBar - Progress indication</Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={2}>
        <Text bold color="yellow">
          🎯 Use Cases:
        </Text>
        <Box paddingLeft={2} flexDirection="column">
          <Text>• Terminal-based chat applications</Text>
          <Text>• AI assistant interfaces</Text>
          <Text>• Command execution with approval</Text>
          <Text>• Tool calling and result display</Text>
          <Text>• Interactive terminal applications</Text>
        </Box>
      </Box>

      <StatusBar
        status="connected"
        connectionInfo="Demo Mode"
        extensionInfo="All Components Loaded"
        messageCount={sampleMessages.length}
      />
    </Box>
  );

  const renderChatDemo = () => (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="green">
          💬 ChatView Component
        </Text>
      </Box>
      <ChatView messages={sampleMessages} loading={false} />
      <Box marginTop={1}>
        <StatusBar
          status="connected"
          connectionInfo="ChatGPT-4"
          messageCount={sampleMessages.length}
        />
      </Box>
    </Box>
  );

  const renderToolsDemo = () => (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="yellow">
          🔧 Tool Components
        </Text>
      </Box>

      <Box flexDirection="column" gap={1}>
        <ToolMessage
          toolName="file-operations"
          status="completed"
          result="Successfully listed 5 files in the directory"
          duration={245}
          parameters={{ path: "/current/directory", recursive: false }}
        />

        <ToolMessage
          toolName="git-status"
          status="executing"
          parameters={{ repository: "/current/repo" }}
        />

        <ToolConfirmation
          toolName="dangerous-command"
          description="This command will delete files"
          riskLevel="high"
          parameters={{ target: "/tmp/files", force: true }}
          onConfirm={() => {}}
          onCancel={() => {}}
          allowEdit={true}
        />

        <ApprovalPrompt
          message="Do you want to proceed with this action?"
          command="rm -rf important-files/"
          onApprove={() => {}}
          onDeny={() => {}}
        />
      </Box>
    </Box>
  );

  const renderCommandsDemo = () => (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="blue">
          ⚡ Command Components
        </Text>
      </Box>
      <CommandPrompt
        prompt="Enter a command to execute:"
        suggestions={sampleCommandSuggestions}
        onSubmit={() => {}}
        showSuggestions={true}
      />
    </Box>
  );

  const renderHistoryDemo = () => (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="magenta">
          📋 History Component
        </Text>
      </Box>
      <HistoryViewer
        items={sampleHistory}
        onSelect={() => {}}
        filterType="all"
        maxItems={10}
      />
    </Box>
  );

  const renderSuggestionsDemo = () => (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="green">
          💡 Suggestions Component
        </Text>
      </Box>
      <SuggestionsDisplay
        suggestions={sampleSuggestions}
        onSelect={() => {}}
        title="Smart Suggestions"
        showCategories={true}
        maxVisible={6}
      />
    </Box>
  );

  const renderProgressDemo = () => (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          📊 Progress Components
        </Text>
      </Box>

      <Box flexDirection="column" gap={2}>
        <Box flexDirection="column">
          <Text bold>Loading Spinners:</Text>
          <Box marginTop={1} gap={3}>
            <LoadingSpinner text="Loading..." variant="dots" />
            <LoadingSpinner text="Processing..." variant="spinner" />
            <LoadingSpinner text="Working..." variant="pulse" />
          </Box>
        </Box>

        <Box flexDirection="column">
          <Text bold>Progress Bars:</Text>
          <Box marginTop={1} flexDirection="column" gap={1}>
            <ProgressBar
              current={45}
              total={100}
              label="File Transfer"
              width={40}
            />
            <ProgressBar
              current={78}
              total={100}
              label="Installation"
              width={40}
              color="yellow"
            />
            <ProgressBar
              current={23}
              total={100}
              label="Processing"
              width={40}
              color="blue"
              variant="blocks"
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );

  const renderLiveDemo = () => (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="green">
          🚀 Live Interactive Demo
        </Text>
      </Box>

      <Box flexDirection="column" flexGrow={1}>
        {/* Chat area */}
        <Box flexGrow={1} marginBottom={1}>
          <ChatView messages={demoMessages} loading={false} />
        </Box>

        {/* Command input */}
        <CommandInput
          trigger="/"
          commands={demoCommands}
          onSubmit={addUserMessage}
          placeholder="Type a message or /command..."
          showSuggestions={true}
        />
      </Box>

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Try: /help, /demo overview, /status, /echo hello, /clear, /exit
        </Text>
      </Box>
    </Box>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case "overview":
        return renderOverview();
      case "chat":
        return renderChatDemo();
      case "tools":
        return renderToolsDemo();
      case "commands":
        return renderCommandsDemo();
      case "history":
        return renderHistoryDemo();
      case "suggestions":
        return renderSuggestionsDemo();
      case "progress":
        return renderProgressDemo();
      case "live":
        return renderLiveDemo();
      default:
        return renderOverview();
    }
  };

  return (
    <Layout>
      <Box flexDirection="column" height="100%">
        {/* Header */}
        <Box
          borderStyle="double"
          borderColor="cyan"
          paddingX={1}
          marginBottom={1}
        >
          <Text bold color="cyan">
            🚀 Chat Tools Framework - Component Showcase
          </Text>
        </Box>

        {/* Navigation */}
        {renderNavigation()}

        {/* Content */}
        <Box flexGrow={1}>{renderCurrentView()}</Box>

        {/* Footer */}
        <Box
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
          justifyContent="center"
          marginTop={1}
        >
          <Text color="gray">
            Press 1-8 to navigate | Ctrl+C to exit | Framework ready for
            integration
          </Text>
        </Box>
      </Box>
    </Layout>
  );
};

// Run the demo
render(<DemoApp />);

export { DemoApp };
