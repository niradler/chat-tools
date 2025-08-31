import React from "react";
import { Box, Text } from "ink";

interface ClipboardContextProps {
  content: string;
  onDismiss?: () => void;
  maxLines?: number;
}

export const ClipboardContext: React.FC<ClipboardContextProps> = ({
  content,
  onDismiss,
  maxLines = 10,
}) => {
  const lines = content.split("\n");
  const displayLines = lines.slice(0, maxLines);
  const hasMore = lines.length > maxLines;

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box
        borderStyle="round"
        borderColor="blue"
        padding={1}
        flexDirection="column"
      >
        <Box justifyContent="space-between" marginBottom={1}>
          <Text bold color="blue">
            📋 Clipboard Content
          </Text>
          <Text color="gray" dimColor>
            {lines.length} lines
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          {displayLines.map((line, index) => (
            <Box key={index}>
              <Text color="gray" dimColor>
                {(index + 1).toString().padStart(2, " ")}:
              </Text>
              <Text> {line}</Text>
            </Box>
          ))}
        </Box>

        {hasMore && (
          <Box justifyContent="center" marginBottom={1}>
            <Text color="gray" dimColor>
              ... {lines.length - maxLines} more lines
            </Text>
          </Box>
        )}

        <Box justifyContent="center">
          <Text color="gray" dimColor>
            Press Enter to use clipboard content | Esc to dismiss
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
