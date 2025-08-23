import React from 'react';
import { Box, Text } from 'ink';

interface ToolMessageProps {
  toolName: string;
  status: 'executing' | 'completed' | 'error' | 'pending';
  result?: string;
  error?: string;
  duration?: number;
  parameters?: Record<string, any>;
}

export const ToolMessage: React.FC<ToolMessageProps> = ({
  toolName,
  status,
  result,
  error,
  duration,
  parameters
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'executing': return 'yellow';
      case 'completed': return 'green';
      case 'error': return 'red';
      case 'pending': return 'gray';
      default: return 'white';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'executing': return '⏳';
      case 'completed': return '✅';
      case 'error': return '❌';
      case 'pending': return '⏸️';
      default: return '🔧';
    }
  };

  return (
    <Box flexDirection="column" paddingX={1} marginY={1}>
      <Box 
        borderStyle="single" 
        borderColor={getStatusColor()}
        padding={1}
        flexDirection="column"
      >
        {/* Header */}
        <Box justifyContent="space-between" marginBottom={1}>
          <Box>
            <Text color={getStatusColor()} bold>
              {getStatusIcon()} {toolName}
            </Text>
          </Box>
          <Box>
            <Text color="gray" dimColor>
              {status.toUpperCase()}
              {duration && ` (${duration}ms)`}
            </Text>
          </Box>
        </Box>

        {/* Parameters */}
        {parameters && Object.keys(parameters).length > 0 && (
          <Box flexDirection="column" marginBottom={1}>
            <Text color="blue" dimColor>Parameters:</Text>
            {Object.entries(parameters).map(([key, value]) => (
              <Box key={key} paddingLeft={2}>
                <Text color="cyan">{key}: </Text>
                <Text>{typeof value === 'string' ? value : JSON.stringify(value)}</Text>
              </Box>
            ))}
          </Box>
        )}

        {/* Result or Error */}
        {status === 'completed' && result && (
          <Box flexDirection="column">
            <Text color="green" dimColor>Result:</Text>
            <Box paddingLeft={2} paddingTop={1}>
              <Text wrap="wrap">{result}</Text>
            </Box>
          </Box>
        )}

        {status === 'error' && error && (
          <Box flexDirection="column">
            <Text color="red" dimColor>Error:</Text>
            <Box paddingLeft={2} paddingTop={1}>
              <Text color="red" wrap="wrap">{error}</Text>
            </Box>
          </Box>
        )}

        {status === 'executing' && (
          <Box paddingLeft={2}>
            <Text color="yellow" dimColor>Executing tool...</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};
