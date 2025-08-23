import React from 'react';
import { Box, Text } from 'ink';
import { StatusBarProps } from '../types';

export const StatusBar: React.FC<StatusBarProps> = ({
  status,
  connectionInfo,
  extensionInfo,
  messageCount = 0
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'green';
      case 'connecting': return 'yellow';
      case 'disconnected': return 'red';
      case 'error': return 'red';
      default: return 'gray';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected': return '●';
      case 'connecting': return '◐';
      case 'disconnected': return '○';
      case 'error': return '✗';
      default: return '○';
    }
  };

  return (
    <Box 
      flexDirection="row" 
      justifyContent="space-between" 
      paddingX={1} 
      paddingY={0}
      borderStyle="single"
      borderTop
    >
      <Box flexDirection="row" gap={2}>
        <Box>
          <Text color={getStatusColor()}>
            {getStatusIcon()} {status}
          </Text>
        </Box>
        
        {connectionInfo && (
          <Box>
            <Text color="gray" dimColor>
              {connectionInfo}
            </Text>
          </Box>
        )}

        {extensionInfo && (
          <Box>
            <Text color="blue">
              📦 {extensionInfo}
            </Text>
          </Box>
        )}
      </Box>

      <Box flexDirection="row" gap={2}>
        <Text color="gray" dimColor>
          Messages: {messageCount}
        </Text>
        <Text color="gray" dimColor>
          Press Ctrl+C to exit
        </Text>
      </Box>
    </Box>
  );
};
