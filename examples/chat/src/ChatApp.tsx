import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";
import { ChatView, MessageInput, StatusBar, Layout } from "@chat-tools/tui";
import { createAgent } from "./chat.js";
import { Agent } from "./agent.js";

interface Message {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export const ChatApp: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<
    "connected" | "connecting" | "disconnected" | "error"
  >("connecting");
  const [agent, setAgent] = useState<Agent | null>(null);

  useEffect(() => {
    const initializeAgent = async () => {
      try {
        setStatus("connecting");
        const newAgent = await createAgent();
        setAgent(newAgent);
        setStatus("connected");

        // Add welcome message
        setMessages([
          {
            id: "1",
            role: "system",
            content:
              'Welcome! I can help you check package versions. Try asking "What\'s the latest version of react?" or "Check the version of typescript".',
            timestamp: new Date(),
          },
        ]);
      } catch (error) {
        console.error("Failed to initialize Agent:", error);
        setStatus("error");
        setMessages([
          {
            id: "1",
            role: "system",
            content:
              "Failed to connect to dependency checker. Make sure you have internet connection.",
            timestamp: new Date(),
          },
        ]);
      }
    };

    initializeAgent();
  }, []);

  const handleSubmit = async (message: string) => {
    if (!message.trim() || loading || !agent) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await agent.generateTextResponse(
        message,
        conversationHistory
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.text,
        timestamp: new Date(),
        metadata:
          response.steps && response.steps.length > 0
            ? {
                toolCalls: response.steps.flatMap(
                  (step: any) => step.toolCalls || []
                ).length,
                tools: response.steps
                  .flatMap((step: any) => step.toolCalls || [])
                  .map((tc: any) => tc.toolName),
              }
            : undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error generating response:", error);
      const errorMessage: Message = {
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
    }
  };

  return (
    <Layout>
      <Box flexDirection="column" height="100%">
        <Box paddingX={1} paddingY={1}>
          <Text bold color="cyan">
            📦 Package Version Checker Chat
          </Text>
        </Box>

        <Box flexGrow={1}>
          <ChatView messages={messages} loading={loading} />
        </Box>

        <Box>
          <StatusBar
            status={status}
            connectionInfo={
              status === "connected" ? "MCP Dependency Checker" : undefined
            }
            messageCount={messages.length}
          />
        </Box>

        <Box>
          <MessageInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            placeholder="Ask about package versions..."
            disabled={loading || status !== "connected" || !agent}
          />
        </Box>
      </Box>
    </Layout>
  );
};
