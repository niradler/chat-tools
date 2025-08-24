import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import {
  ChatView,
  CommandInput,
  StatusBar,
  Layout,
  HistoryViewer,
  Dialog,
} from "@chat-tools/tui";
import { Chat, type ChatMessage } from "./chat.js";
import type { Session, Message } from "@chat-tools/storage";
import LoggingExtension from "./logging-extension.js";
import ApprovalExtension from "./approval-extension.js";
import { TUIApprovalStrategy } from "./approval-strategies.js";
import type {
  ApprovalStrategy,
  ApprovalRequest,
  ApprovalResponse,
} from "./approval-manager.js";

interface AppMessage extends ChatMessage {
  id: string;
  timestamp: Date;
}

interface AppState {
  view: "chat" | "sessions" | "history" | "settings";
  currentSessionId?: string;
  currentSessionName?: string;
}

export const ChatApp: React.FC = () => {
  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [status, setStatus] = useState<
    "connected" | "connecting" | "disconnected" | "error"
  >("connecting");
  const [chat, setChat] = useState<Chat | null>(null);
  const [appState, setAppState] = useState<AppState>({ view: "chat" });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [showApproval, setShowApproval] = useState(false);
  const [approvalRequest, setApprovalRequest] =
    useState<ApprovalRequest | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogContent, setDialogContent] = useState({
    title: "",
    message: "",
  });

  // TUI Approval callback functions
  const handleApprovalRequest = (
    request: ApprovalRequest
  ): Promise<ApprovalResponse> => {
    return new Promise((resolve) => {
      setApprovalRequest(request);
      setShowApproval(true);

      // Add approval request message to chat
      const approvalMessage: AppMessage = {
        id: `approval-${Date.now()}`,
        role: "system",
        content: `🔒 APPROVAL REQUIRED\n\nTool: ${
          request.toolName
        }\nParameters: ${JSON.stringify(
          request.params,
          null,
          2
        )}\n\nType "/approve" to allow or "/deny" to reject this tool execution.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, approvalMessage]);

      // Store resolve function for later use
      (globalThis as any).approvalResolve = resolve;
    });
  };

  useEffect(() => {
    const initializeChat = async () => {
      try {
        setStatus("connecting");

        // Create extension instances
        const tuiApprovalStrategy = new TUIApprovalStrategy(
          handleApprovalRequest
        );
        const approvalExtension = new ApprovalExtension({
          strategy: tuiApprovalStrategy,
        });

        // Create chat instance
        const newChat = new Chat({
          name: "Interactive Chat",
          dbPath: "./chat-app.db",
          extensions: [approvalExtension],
          mcpServers: [
            {
              type: "stdio",
              command: "npx",
              args: ["-y", "dependency-mcp"],
              name: "dependency-checker",
            },
          ],
        });

        await newChat.initialize();
        setChat(newChat);
        setStatus("connected");

        // Load existing sessions
        const existingSessions = await newChat.listSessions();
        setSessions(existingSessions);

        // Create or load a default session
        let sessionId: string;
        if (existingSessions.length > 0) {
          sessionId = existingSessions[0].id;
          setAppState((prev) => ({
            ...prev,
            currentSessionId: sessionId,
            currentSessionName: existingSessions[0].name,
          }));
          await loadSessionMessages(newChat, sessionId);
        } else {
          sessionId = await newChat.createSession("Default Session");
          setAppState((prev) => ({
            ...prev,
            currentSessionId: sessionId,
            currentSessionName: "Default Session",
          }));

          // Add welcome message
          setMessages([
            {
              id: "welcome",
              role: "system",
              content:
                'Welcome! I can help you check package versions and execute various tools. Try asking "What\'s the latest version of react?" or "Check the version of typescript".',
              timestamp: new Date(),
            },
          ]);
        }
      } catch (error) {
        console.error("Failed to initialize Chat:", error);
        setStatus("error");
        setMessages([
          {
            id: "error",
            role: "system",
            content:
              "Failed to initialize chat system. Make sure you have internet connection and Ollama is running.",
            timestamp: new Date(),
          },
        ]);
      }
    };

    initializeChat();
  }, []);

  const loadSessionMessages = async (chatInstance: Chat, sessionId: string) => {
    try {
      const sessionMessages = await chatInstance.getMessages(sessionId);
      const appMessages: AppMessage[] = sessionMessages.map((msg) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant" | "system" | "tool",
        content: msg.content,
        timestamp: new Date(msg.timestamp || Date.now()),
        metadata: msg.metadata || undefined,
      }));
      setMessages(appMessages);
    } catch (error) {
      console.error("Failed to load session messages:", error);
    }
  };

  const createNewSession = async (name: string) => {
    if (!chat) return;

    try {
      const sessionId = await chat.createSession(name);
      const updatedSessions = await chat.listSessions();
      setSessions(updatedSessions);

      setAppState((prev) => ({
        ...prev,
        currentSessionId: sessionId,
        currentSessionName: name,
        view: "chat",
      }));

      setMessages([]);
      setDialogContent({
        title: "Success",
        message: `Created new session: ${name}`,
      });
      setShowDialog(true);
    } catch (error) {
      console.error("Failed to create session:", error);
      setDialogContent({
        title: "Error",
        message: "Failed to create new session",
      });
      setShowDialog(true);
    }
  };

  const loadSession = async (sessionId: string) => {
    if (!chat) return;

    try {
      const session = await chat.loadSession(sessionId);
      if (session) {
        setAppState((prev) => ({
          ...prev,
          currentSessionId: sessionId,
          currentSessionName: session.name,
          view: "chat",
        }));
        await loadSessionMessages(chat, sessionId);
      }
    } catch (error) {
      console.error("Failed to load session:", error);
      setDialogContent({ title: "Error", message: "Failed to load session" });
      setShowDialog(true);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!chat) return;

    try {
      await chat.deleteSession(sessionId);
      const updatedSessions = await chat.listSessions();
      setSessions(updatedSessions);

      if (appState.currentSessionId === sessionId) {
        if (updatedSessions.length > 0) {
          await loadSession(updatedSessions[0].id);
        } else {
          const newSessionId = await chat.createSession("Default Session");
          setAppState((prev) => ({
            ...prev,
            currentSessionId: newSessionId,
            currentSessionName: "Default Session",
          }));
          setMessages([]);
        }
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
      setDialogContent({ title: "Error", message: "Failed to delete session" });
      setShowDialog(true);
    }
  };

  // Define commands including approval commands
  const commands = [
    {
      name: "approve",
      description: "Approve pending tool execution",
      handler: () => {
        if (showApproval) {
          handleApprovalResponse(true, "once");
        } else {
          const errorMessage: AppMessage = {
            id: Date.now().toString(),
            role: "system",
            content: "No approval request pending.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      },
    },
    {
      name: "deny",
      description: "Deny pending tool execution",
      handler: () => {
        if (showApproval) {
          handleApprovalResponse(false);
        } else {
          const errorMessage: AppMessage = {
            id: Date.now().toString(),
            role: "system",
            content: "No approval request pending.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      },
      aliases: ["reject"],
    },
    {
      name: "sessions",
      description: "Open session manager",
      handler: () => {
        setAppState((prev) => ({ ...prev, view: "sessions" }));
      },
      aliases: ["s"],
    },
    {
      name: "history",
      description: "Open history viewer",
      handler: () => {
        setAppState((prev) => ({ ...prev, view: "history" }));
      },
      aliases: ["h"],
    },
    {
      name: "help",
      description: "Show available commands",
      handler: () => {
        const helpMessage: AppMessage = {
          id: Date.now().toString(),
          role: "system",
          content: `Available commands:\n${commands
            .map((cmd) => `/${cmd.name} - ${cmd.description}`)
            .join("\n")}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, helpMessage]);
      },
    },
  ];

  const handleSubmit = async (message: string) => {
    if (
      !message.trim() ||
      loading ||
      streaming ||
      !chat ||
      !appState.currentSessionId
    )
      return;

    const userMessage: AppMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      // Check if streaming is preferred (you can add a setting for this)
      const useStreaming = true; // Could be a user preference

      if (useStreaming) {
        await handleStreamingMessage(message);
      } else {
        const result = await chat.sendMessage(
          appState.currentSessionId,
          message
        );

        const assistantMessage: AppMessage = {
          id: result.responseId,
          role: "assistant",
          content: result.response,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Error generating response:", error);
      const errorMessage: AppMessage = {
        id: (Date.now() + 1).toString(),
        role: "system",
        content: `Error: ${
          error instanceof Error ? error.message : "Unknown error occurred"
        }`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setStreaming(false);
      setStreamingContent("");
    }
  };

  const handleStreamingMessage = async (message: string) => {
    if (!chat || !appState.currentSessionId) return;

    setLoading(false);
    setStreaming(true);
    setStreamingContent("");

    try {
      const { stream, messageId } = await chat.streamMessage(
        appState.currentSessionId,
        message
      );

      let fullContent = "";

      for await (const chunk of stream.textStream) {
        fullContent += chunk;
        setStreamingContent(fullContent);
      }

      // Save the final assistant message
      const responseId = await chat.saveAssistantMessage(
        appState.currentSessionId,
        fullContent,
        {
          model: chat.getModel().modelId || "unknown",
          streaming: true,
        }
      );

      const assistantMessage: AppMessage = {
        id: responseId,
        role: "assistant",
        content: fullContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error in streaming:", error);
      throw error;
    }
  };

  const handleApprovalResponse = (
    approved: boolean,
    scope?: "once" | "session" | "global"
  ) => {
    const resolve = (globalThis as any).approvalResolve;
    if (resolve) {
      resolve({
        approved,
        scope: approved ? scope || "once" : undefined,
      });
      delete (globalThis as any).approvalResolve;
    }
    setShowApproval(false);
    setApprovalRequest(null);
  };

  // Global keyboard shortcuts removed - using commands instead (/sessions, /history, etc.)

  const renderCurrentView = () => {
    switch (appState.view) {
      case "sessions":
        return (
          <SessionManager
            sessions={sessions}
            currentSessionId={appState.currentSessionId}
            onLoadSession={loadSession}
            onCreateSession={createNewSession}
            onDeleteSession={deleteSession}
            onClose={() => setAppState((prev) => ({ ...prev, view: "chat" }))}
          />
        );

      case "history":
        return (
          <HistoryViewer
            items={historyItems}
            onSelect={(item) => {
              console.log("Selected history item:", item);
              setAppState((prev) => ({ ...prev, view: "chat" }));
            }}
            onClose={() => setAppState((prev) => ({ ...prev, view: "chat" }))}
          />
        );

      case "chat":
      default:
        return (
          <>
            <Box flexGrow={1}>
              <ChatView
                messages={
                  streaming
                    ? [
                        ...messages,
                        {
                          id: "streaming",
                          role: "assistant" as const,
                          content: streamingContent,
                          timestamp: new Date(),
                        },
                      ]
                    : messages
                }
                loading={loading || streaming}
              />
            </Box>

            <Box>
              <StatusBar
                status={status}
                connectionInfo={
                  status === "connected"
                    ? `Session: ${
                        appState.currentSessionName || "None"
                      } | MCP Tools Active`
                    : undefined
                }
                messageCount={messages.length}
              />
            </Box>

            <Box>
              <CommandInput
                trigger="/"
                commands={commands}
                onSubmit={handleSubmit}
                placeholder={
                  streaming
                    ? "Streaming response..."
                    : showApproval
                    ? "Type /approve or /deny to respond to approval request..."
                    : "Ask about package versions or type /help for commands..."
                }
                showSuggestions={true}
              />
            </Box>
          </>
        );
    }
  };

  // No more overlay approval prompt - using chat-based approval

  return (
    <Layout>
      <Box flexDirection="column" height="100%">
        <Box paddingX={1} paddingY={1}>
          <Text bold color="cyan">
            🤖 Interactive Chat with Tool Approval
          </Text>
          {appState.view !== "chat" && (
            <Text color="gray" dimColor>
              {appState.view === "sessions"
                ? "📋 Session Manager"
                : "📚 History Viewer"}{" "}
              | Type /help for commands
            </Text>
          )}
        </Box>

        {renderCurrentView()}

        {/* General Dialog */}
        {showDialog && (
          <Dialog
            title={dialogContent.title}
            isOpen={showDialog}
            onClose={() => setShowDialog(false)}
          >
            <Text>{dialogContent.message}</Text>
          </Dialog>
        )}
      </Box>
    </Layout>
  );
};

// Session Manager Component
interface SessionManagerProps {
  sessions: Session[];
  currentSessionId?: string;
  onLoadSession: (sessionId: string) => void;
  onCreateSession: (name: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onClose: () => void;
}

const SessionManager: React.FC<SessionManagerProps> = ({
  sessions,
  currentSessionId,
  onLoadSession,
  onCreateSession,
  onDeleteSession,
  onClose,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSessionName, setNewSessionName] = useState("");

  useInput((input: string, key: any) => {
    if (showCreateDialog) {
      if (key.return && newSessionName.trim()) {
        onCreateSession(newSessionName.trim());
        setShowCreateDialog(false);
        setNewSessionName("");
      } else if (key.escape) {
        setShowCreateDialog(false);
        setNewSessionName("");
      }
      return;
    }

    if (key.escape) {
      onClose();
    } else if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(sessions.length - 1, selectedIndex + 1));
    } else if (key.return) {
      if (sessions[selectedIndex]) {
        onLoadSession(sessions[selectedIndex].id);
      }
    } else if (input === "n") {
      setShowCreateDialog(true);
    } else if (input === "d" && sessions[selectedIndex]) {
      onDeleteSession(sessions[selectedIndex].id);
    }
  });

  if (showCreateDialog) {
    return (
      <Box flexDirection="column" padding={2}>
        <Box
          borderStyle="single"
          borderColor="cyan"
          padding={1}
          flexDirection="column"
        >
          <Text bold color="cyan">
            Create New Session
          </Text>
          <Box marginTop={1}>
            <Text>Session Name: </Text>
            <Text color="yellow">{newSessionName}</Text>
          </Box>
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              Type session name and press Enter, or Esc to cancel
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1} flexGrow={1}>
      <Box
        borderStyle="double"
        borderColor="cyan"
        padding={1}
        flexDirection="column"
        flexGrow={1}
      >
        <Box justifyContent="space-between" marginBottom={1}>
          <Text bold color="cyan">
            📋 Session Manager
          </Text>
          <Text color="gray" dimColor>
            {sessions.length} sessions
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="gray" dimColor>
            ↑↓: Navigate | Enter: Load | N: New | D: Delete | Esc: Close
          </Text>
        </Box>

        <Box flexDirection="column" flexGrow={1}>
          {sessions.length === 0 ? (
            <Box justifyContent="center" alignItems="center" padding={2}>
              <Text color="gray" dimColor>
                No sessions found. Press N to create one.
              </Text>
            </Box>
          ) : (
            sessions.map((session, index) => (
              <Box
                key={session.id}
                paddingX={1}
                marginBottom={1}
                borderStyle={index === selectedIndex ? "double" : "single"}
                borderColor={
                  session.id === currentSessionId
                    ? "green"
                    : index === selectedIndex
                    ? "cyan"
                    : "gray"
                }
              >
                <Box flexDirection="column" width="100%">
                  <Box justifyContent="space-between">
                    <Text
                      color={
                        session.id === currentSessionId ? "green" : "white"
                      }
                    >
                      {session.id === currentSessionId ? "● " : "○ "}
                      {session.name}
                    </Text>
                    <Text color="gray" dimColor>
                      {session.createdAt
                        ? new Date(session.createdAt).toLocaleDateString()
                        : "Unknown"}
                    </Text>
                  </Box>
                  {session.config && (
                    <Box paddingLeft={2}>
                      <Text color="gray" dimColor>
                        Config:{" "}
                        {JSON.stringify(session.config).substring(0, 50)}...
                      </Text>
                    </Box>
                  )}
                </Box>
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  );
};
