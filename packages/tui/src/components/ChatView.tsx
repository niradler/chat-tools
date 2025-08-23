import React from 'react';
import { Box, Text } from 'ink';
import { ChatViewProps, Message } from '../types';
import chalk from 'chalk';

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const getMessageColor = () => {
    switch (message.role) {
      case 'user': return 'blue';
      case 'assistant': return 'green';
      case 'system': return 'yellow';
      case 'tool': return 'cyan';
      default: return 'white';
    }
  };

  const getRolePrefix = () => {
    switch (message.role) {
      case 'user': return '👤';
      case 'assistant': return '🤖';
      case 'system': return '⚙️';
      case 'tool': return '🔧';
      default: return '💬';
    }
  };

  return (
    <Box flexDirection="column" marginY={0}>
      <Box>
        <Text color={getMessageColor()} bold>
          {getRolePrefix()} {message.role}
        </Text>
        <Text color="gray" dimColor>
          {' '}{message.timestamp.toLocaleTimeString()}
        </Text>
      </Box>
      <Box paddingLeft={3}>
        <Text wrap="wrap">{message.content}</Text>
      </Box>
      {message.metadata && (
        <Box paddingLeft={3} marginTop={1}>
          <Text color="gray" dimColor>
            {JSON.stringify(message.metadata, null, 2)}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export const ChatView: React.FC<ChatViewProps> = ({ 
  messages, 
  loading = false,
  onScroll 
}) => {
  return (
    <Box flexDirection="column" flexGrow={1} paddingX={1}>
      {messages.length === 0 ? (
        <Box justifyContent="center" alignItems="center" height={10}>
          <Text color="gray" dimColor>
            No messages yet. Start a conversation!
          </Text>
        </Box>
      ) : (
        <Box flexDirection="column">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </Box>
      )}
      
      {loading && (
        <Box paddingLeft={3}>
          <Text color="yellow">
            🤔 Thinking...
          </Text>
        </Box>
      )}
    </Box>
  );
};
