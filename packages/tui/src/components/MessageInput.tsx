import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { MessageInputProps } from '../types';

export const MessageInput: React.FC<MessageInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder = 'Type a message...',
  disabled = false,
  multiline = false
}) => {
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleInput = (input: string) => {
    if (disabled) return;
    
    if (input === '\r' || input === '\n') {
      if (currentValue.trim()) {
        onSubmit(currentValue.trim());
        setCurrentValue('');
        onChange('');
      }
      return;
    }
    
    if (input === '\x7f' || input === '\b') { // Backspace
      const newValue = currentValue.slice(0, -1);
      setCurrentValue(newValue);
      onChange(newValue);
      return;
    }
    
    if (input.length === 1 && input >= ' ') {
      const newValue = currentValue + input;
      setCurrentValue(newValue);
      onChange(newValue);
    }
  };

  useEffect(() => {
    if (disabled) return;

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    
    stdin.on('data', handleInput);
    
    return () => {
      stdin.off('data', handleInput);
      stdin.setRawMode(false);
      stdin.pause();
    };
  }, [currentValue, disabled]);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Text color="blue">{'> '}</Text>
        <Text>{currentValue}</Text>
        <Text color="gray">{currentValue.length === 0 ? placeholder : ''}</Text>
      </Box>
      {disabled && (
        <Text color="yellow" dimColor>
          Input disabled...
        </Text>
      )}
    </Box>
  );
};
