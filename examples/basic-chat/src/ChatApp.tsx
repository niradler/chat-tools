import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { ChatView, MessageInput, StatusBar } from '@chat-tools/tui';
import { Storage, Message } from '@chat-tools/storage';
import { ChatToolsConfig } from '@chat-tools/core';

interface ChatAppProps {
  config: ChatToolsConfig;
}

export const ChatApp: React.FC<ChatAppProps> = ({ config }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('connecting');
  const [storage, setStorage] = useState<Storage | null>(null);
  const [conversationId, setConversationId] = useState<string>('');

  // Initialize storage and conversation
  useEffect(() => {
    const initializeChat = async () => {
      try {
        const storageInstance = new Storage(config.database.path);
        await storageInstance.migrate();
        setStorage(storageInstance);

        // Create a new conversation
        const convId = await storageInstance.createConversation(
          config.name,
          'basic-chat',
          config
        );
        setConversationId(convId);

        // Add welcome message
        const welcomeMessage: Omit<Message, 'id' | 'timestamp'> = {
          conversationId: convId,
          role: 'system',
          content: config.agent.templates.greeting || 'Hello! How can I help you today?',
        };

        await storageInstance.addMessage(welcomeMessage);
        
        // Load messages
        const msgs = await storageInstance.getMessages(convId);
        setMessages(msgs);
        
        setStatus('connected');
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        setStatus('error');
      }
    };

    initializeChat();
  }, [config]);

  const handleSubmit = async (message: string) => {
    if (!storage || !conversationId || loading) return;

    setLoading(true);

    try {
      // Add user message
      const userMessage: Omit<Message, 'id' | 'timestamp'> = {
        conversationId,
        role: 'user',
        content: message,
      };

      await storage.addMessage(userMessage);

      // Simulate AI response (replace with actual AI integration)
      setTimeout(async () => {
        const aiResponse: Omit<Message, 'id' | 'timestamp'> = {
          conversationId,
          role: 'assistant',
          content: `I received your message: "${message}". This is a basic example - in a full implementation, this would be processed by the AI agent with tool calling capabilities.`,
        };

        await storage.addMessage(aiResponse);
        
        // Reload messages
        const msgs = await storage.getMessages(conversationId);
        setMessages(msgs);
        setLoading(false);
      }, 1000);

      // Reload messages to show user message immediately
      const msgs = await storage.getMessages(conversationId);
      setMessages(msgs);
    } catch (error) {
      console.error('Error sending message:', error);
      setLoading(false);
    }
  };

  const getConnectionInfo = () => {
    switch (status) {
      case 'connected': return `${config.ai.provider}/${config.ai.model}`;
      case 'connecting': return 'Initializing...';
      case 'error': return 'Connection failed';
      default: return 'Disconnected';
    }
  };

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box paddingX={1} paddingY={0} borderStyle="single" borderBottom>
        <Text bold color="blue">
          {config.name} - Basic Chat Example
        </Text>
      </Box>

      {/* Chat Area */}
      <Box flexGrow={1}>
        <ChatView messages={messages} loading={loading} />
      </Box>

      {/* Input Area */}
      <Box borderStyle="single" borderTop paddingY={0}>
        <MessageInput
          value={currentInput}
          onChange={setCurrentInput}
          onSubmit={handleSubmit}
          disabled={loading || status !== 'connected'}
          placeholder="Type your message and press Enter..."
        />
      </Box>

      {/* Status Bar */}
      <StatusBar
        status={status}
        connectionInfo={getConnectionInfo()}
        extensionInfo="basic-chat"
        messageCount={messages.length}
      />
    </Box>
  );
};
