# 🚀 Chat Tools Framework - TUI Components

A comprehensive **Terminal User Interface (TUI) components library** built with React and Ink for creating sophisticated terminal-based chat applications with AI integration, tool calling, and human-in-the-loop approval systems.

## ✨ Features

- 🎯 **Safety-First Design** - Human-in-the-loop approval for dangerous operations
- 🎮 **Rich Interactions** - Keyboard navigation, suggestions, and shortcuts
- 🧩 **Extensible Architecture** - Building blocks that compose together
- 🔒 **Type-Safe** - Full TypeScript support with strict typing
- 🎨 **Beautiful UI** - Consistent styling with colors, borders, and icons
- ⚡ **Framework Ready** - Built for AI SDK v5, MCP, and tool calling

## 📦 Installation

```bash
pnpm add @chat-tools/tui
# or
npm install @chat-tools/tui
```

## 🎮 Quick Start

```bash
# Run the interactive demo
pnpm demo

# Navigate with 1-8 keys to explore components
# Press 8 for live interactive demo with working commands
```

## 🧩 Core Components

### 💬 Chat & Messaging

#### `ChatView`

Display messages with role-based styling and metadata support.

```tsx
import { ChatView } from "@chat-tools/tui";

const messages = [
  {
    id: "1",
    role: "user",
    content: "Hello!",
    timestamp: new Date(),
  },
  {
    id: "2",
    role: "assistant",
    content: "Hi there! How can I help?",
    timestamp: new Date(),
  },
];

<ChatView messages={messages} loading={false} />;
```

#### `MessageInput`

Interactive message input with placeholder support.

```tsx
import { MessageInput } from "@chat-tools/tui";

<MessageInput
  value={inputValue}
  onChange={setInputValue}
  onSubmit={handleSubmit}
  placeholder="Type a message..."
/>;
```

#### `CommandInput`

Generic command system with configurable triggers and suggestions.

```tsx
import { CommandInput } from "@chat-tools/tui";

const commands = [
  {
    name: "help",
    description: "Show available commands",
    handler: () => console.log("Help!"),
    aliases: ["h"],
  },
  {
    name: "exit",
    description: "Exit the application",
    handler: () => process.exit(0),
    aliases: ["quit", "q"],
  },
];

<CommandInput
  trigger="/"
  commands={commands}
  onSubmit={handleMessage}
  placeholder="Type / for commands..."
/>;
```

### 🔧 Tool Integration

#### `ToolMessage`

Display tool execution results with status indicators.

```tsx
import { ToolMessage } from "@chat-tools/tui";

<ToolMessage
  toolName="file-operations"
  status="completed"
  result="Successfully listed 5 files"
  duration={245}
  parameters={{ path: "/current/dir" }}
/>;
```

#### `ToolConfirmation`

Tool execution approval with risk assessment.

```tsx
import { ToolConfirmation } from "@chat-tools/tui";

<ToolConfirmation
  toolName="dangerous-command"
  description="This will delete files"
  riskLevel="high"
  parameters={{ target: "/tmp/files" }}
  onConfirm={handleConfirm}
  onCancel={handleCancel}
  allowEdit={true}
/>;
```

#### `ApprovalPrompt`

Simple approval prompt for user confirmation.

```tsx
import { ApprovalPrompt } from "@chat-tools/tui";

<ApprovalPrompt
  message="Execute this command?"
  command="rm -rf /important"
  onApprove={handleApprove}
  onDeny={handleDeny}
/>;
```

### 🎯 Interactive Elements

#### `SuggestionsDisplay`

Smart suggestions with categories and confidence scoring.

```tsx
import { SuggestionsDisplay } from "@chat-tools/tui";

const suggestions = [
  {
    id: "1",
    text: "git status",
    description: "Check repository status",
    category: "command",
    confidence: 0.9,
  },
];

<SuggestionsDisplay
  suggestions={suggestions}
  onSelect={handleSelect}
  showCategories={true}
/>;
```

#### `HistoryViewer`

Browse command and message history with filtering.

```tsx
import { HistoryViewer } from "@chat-tools/tui";

const history = [
  {
    id: "1",
    timestamp: new Date(),
    type: "command",
    content: "git status",
    status: "success",
  },
];

<HistoryViewer items={history} onSelect={handleSelect} filterType="all" />;
```

### 🎨 UI Building Blocks

#### `Dialog` & `ConfirmDialog`

Modal overlays for confirmations and information.

```tsx
import { Dialog, ConfirmDialog } from '@chat-tools/tui';

<Dialog
  title="Settings"
  isOpen={showDialog}
  onClose={closeDialog}
>
  <Text>Dialog content here</Text>
</Dialog>

<ConfirmDialog
  title="Confirm Action"
  message="Are you sure you want to proceed?"
  isOpen={showConfirm}
  onConfirm={handleConfirm}
  onCancel={handleCancel}
  variant="warning"
/>
```

#### `RadioButtonSelect`

Radio button selection with keyboard navigation.

```tsx
import { RadioButtonSelect } from "@chat-tools/tui";

const options = [
  { value: "option1", label: "Option 1", description: "First option" },
  { value: "option2", label: "Option 2", description: "Second option" },
];

<RadioButtonSelect
  options={options}
  value={selectedValue}
  onChange={setSelectedValue}
  title="Choose an option"
/>;
```

#### `ProgressBar` & `LoadingSpinner`

Progress indication and loading states.

```tsx
import { ProgressBar, LoadingSpinner } from '@chat-tools/tui';

<ProgressBar
  current={45}
  total={100}
  label="Processing..."
  variant="bar"
/>

<LoadingSpinner
  text="Loading..."
  variant="dots"
  color="cyan"
/>
```

#### `StatusBar`

Connection status and system information display.

```tsx
import { StatusBar } from "@chat-tools/tui";

<StatusBar
  status="connected"
  connectionInfo="OpenAI GPT-4"
  extensionInfo="Shell Extension"
  messageCount={42}
/>;
```

### 🛠️ Utility Components

#### `TextBuffer`

Text display with highlighting and scrolling.

```tsx
import { TextBuffer, TextBufferManager } from "@chat-tools/tui";

const buffer = new TextBufferManager(1000);
buffer.addLine("Log entry 1");
buffer.addLine("Log entry 2");

<TextBuffer
  lines={buffer.getLines()}
  showLineNumbers={true}
  highlightPattern={/error/gi}
  highlightColor="red"
/>;
```

#### `MaxSizedBox`

Size-constrained container with alignment options.

```tsx
import { MaxSizedBox } from "@chat-tools/tui";

<MaxSizedBox
  maxWidth={80}
  maxHeight={20}
  horizontalAlign="center"
  verticalAlign="center"
>
  <Text>Centered content</Text>
</MaxSizedBox>;
```

## 🎣 Custom Hooks

### `useKeypress`

Enhanced keyboard event handling with shortcuts.

```tsx
import { useKeypress, useKeyboardShortcuts } from "@chat-tools/tui";

useKeypress((event) => {
  if (event.key === "escape") {
    handleEscape();
  }
});

useKeyboardShortcuts({
  help: { key: { key: "h", ctrl: true }, handler: showHelp },
  quit: { key: { key: "q", ctrl: true }, handler: quit },
});
```

### `useCompletion`

Smart autocompletion with debouncing and filtering.

```tsx
import { useCompletion, useCommandCompletion } from "@chat-tools/tui";

const commands = ["git status", "git commit", "git push"];

const completion = useCommandCompletion(query, commands, handleAccept, {
  minQueryLength: 2,
  debounceMs: 300,
});
```

### `useAtCommandProcessor`

@ command parsing and execution system.

```tsx
import { useAtCommandProcessor } from "@chat-tools/tui";

const commands = [
  {
    command: "help",
    description: "Show help",
    handler: async (args) => console.log("Help:", args),
  },
];

const processor = useAtCommandProcessor(commands, { prefix: "@" });
```

## 🎯 Use Cases

### AI Chat Applications

```tsx
import { Layout, ChatView, CommandInput, StatusBar } from "@chat-tools/tui";

function AIChatApp() {
  return (
    <Layout>
      <ChatView messages={messages} loading={isLoading} />
      <CommandInput
        trigger="/"
        commands={chatCommands}
        onSubmit={handleMessage}
      />
      <StatusBar
        status="connected"
        connectionInfo="Claude 3.5 Sonnet"
        messageCount={messages.length}
      />
    </Layout>
  );
}
```

### Tool Calling Interface

```tsx
import { ToolConfirmation, ToolMessage } from "@chat-tools/tui";

function ToolInterface() {
  return (
    <>
      {showConfirmation && (
        <ToolConfirmation
          toolName="execute-command"
          description="Run shell command"
          riskLevel="medium"
          parameters={{ command: "npm install" }}
          onConfirm={executeTool}
          onCancel={cancelTool}
        />
      )}

      <ToolMessage
        toolName="file-operations"
        status="completed"
        result="Files processed successfully"
      />
    </>
  );
}
```

## 🏗️ Architecture

### Component Composition

Components are designed to work together seamlessly:

```tsx
import {
  Layout,
  ChatView,
  CommandInput,
  StatusBar,
  Dialog,
} from "@chat-tools/tui";

function ComprehensiveApp() {
  return (
    <Layout>
      <ChatView messages={messages} />

      {showSettings && (
        <Dialog title="Settings" isOpen onClose={closeSettings}>
          <RadioButtonSelect
            options={settingsOptions}
            value={currentSetting}
            onChange={updateSetting}
          />
        </Dialog>
      )}

      <CommandInput trigger="/" commands={appCommands} onSubmit={handleInput} />

      <StatusBar
        status="connected"
        connectionInfo="AI Assistant"
        messageCount={messages.length}
      />
    </Layout>
  );
}
```

### Extension Points

- **Custom Commands**: Add your own command handlers
- **Tool Integration**: Implement custom tool approval workflows
- **Styling**: Customize colors, borders, and layouts
- **Hooks**: Create custom interaction patterns

## 🚀 Advanced Examples

### Multi-Agent Chat

```tsx
function MultiAgentChat() {
  const agents = ["assistant", "coder", "reviewer"];

  return (
    <Layout>
      <ChatView messages={messages} loading={isProcessing} />

      <SuggestionsDisplay
        suggestions={agentSuggestions}
        onSelect={selectAgent}
        title="Available Agents"
      />

      <CommandInput
        trigger="@"
        commands={agentCommands}
        onSubmit={handleAgentCommand}
      />
    </Layout>
  );
}
```

### Development Tool Interface

```tsx
function DevTool() {
  return (
    <Layout>
      <TextBuffer
        lines={logLines}
        showLineNumbers={true}
        highlightPattern={/ERROR|WARN/gi}
        highlightColor="red"
      />

      <ProgressBar
        current={buildProgress}
        total={100}
        label="Building project..."
      />

      <CommandInput
        trigger="/"
        commands={devCommands}
        onSubmit={executeDevCommand}
      />
    </Layout>
  );
}
```

## 📚 API Reference

### Component Props

All components are fully typed with TypeScript. See individual component files for detailed prop interfaces.

### Styling

Components use Ink's styling system with consistent color schemes:

- **Primary**: Blue/Cyan for interactive elements
- **Success**: Green for completed actions
- **Warning**: Yellow for caution states
- **Error**: Red for errors and dangerous actions
- **Info**: Gray for secondary information

### Keyboard Navigation

Standard keyboard shortcuts across components:

- **Arrow Keys**: Navigate lists and menus
- **Enter/Space**: Select/confirm actions
- **Escape**: Cancel/close dialogs
- **Tab**: Move between focusable elements
- **Ctrl+C**: Exit application (where appropriate)

## 🤝 Contributing

This library is part of the Chat Tools Framework. Components should:

1. Follow consistent styling patterns
2. Support keyboard navigation
3. Include TypeScript types
4. Handle edge cases gracefully
5. Compose well with other components

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for the terminal-native future of AI interactions**
