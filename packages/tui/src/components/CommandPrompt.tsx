import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

interface CommandSuggestion {
  command: string;
  description: string;
  category: string;
}

interface CommandPromptProps {
  prompt?: string;
  suggestions?: CommandSuggestion[];
  onSubmit: (command: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  showSuggestions?: boolean;
}

export const CommandPrompt: React.FC<CommandPromptProps> = ({
  prompt = "Enter command:",
  suggestions = [],
  onSubmit,
  onCancel,
  placeholder = "Type a command or select from suggestions...",
  showSuggestions = true,
}) => {
  const [input, setInput] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [mode, setMode] = useState<"input" | "suggestions">("input");

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.command.toLowerCase().includes(input.toLowerCase()) ||
      s.description.toLowerCase().includes(input.toLowerCase())
  );

  useInput((inputChar, key) => {
    if (key.escape) {
      if (onCancel) onCancel();
      return;
    }

    if (key.tab && showSuggestions && filteredSuggestions.length > 0) {
      setMode(mode === "input" ? "suggestions" : "input");
      return;
    }

    if (mode === "suggestions") {
      if (key.upArrow) {
        setSelectedSuggestion(Math.max(0, selectedSuggestion - 1));
      } else if (key.downArrow) {
        setSelectedSuggestion(
          Math.min(filteredSuggestions.length - 1, selectedSuggestion + 1)
        );
      } else if (key.return) {
        if (filteredSuggestions[selectedSuggestion]) {
          onSubmit(filteredSuggestions[selectedSuggestion].command);
        }
      }
      return;
    }

    // Input mode
    if (key.return) {
      if (input.trim()) {
        onSubmit(input.trim());
      }
    } else if (key.backspace || key.delete) {
      setInput(input.slice(0, -1));
    } else if (inputChar && inputChar.length === 1) {
      setInput(input + inputChar);
      setSelectedSuggestion(0); // Reset suggestion selection when typing
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box
        borderStyle="round"
        borderColor="blue"
        padding={1}
        flexDirection="column"
      >
        {/* Header */}
        <Box marginBottom={1}>
          <Text bold color="blue">
            ⚡ {prompt}
          </Text>
        </Box>

        {/* Input field */}
        <Box
          borderStyle="single"
          borderColor={mode === "input" ? "cyan" : "gray"}
          padding={1}
          marginBottom={1}
        >
          <Text color="green">$ </Text>
          <Text>{input}</Text>
          {input.length === 0 && (
            <Text color="gray" dimColor>
              {placeholder}
            </Text>
          )}
          {mode === "input" && <Text color="cyan">▋</Text>}
        </Box>

        {/* Suggestions */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <Box flexDirection="column">
            <Box justifyContent="space-between" marginBottom={1}>
              <Text color="yellow" bold>
                Suggestions:
              </Text>
              <Text color="gray" dimColor>
                {mode === "suggestions"
                  ? "(↑↓ to navigate, Enter to select)"
                  : "(Tab to focus)"}
              </Text>
            </Box>

            <Box
              borderStyle="single"
              borderColor={mode === "suggestions" ? "yellow" : "gray"}
              padding={1}
              flexDirection="column"
            >
              {filteredSuggestions.slice(0, 5).map((suggestion, index) => (
                <Box
                  key={index}
                  paddingX={1}
                  borderStyle={
                    mode === "suggestions" && index === selectedSuggestion
                      ? "single"
                      : undefined
                  }
                  borderColor={
                    mode === "suggestions" && index === selectedSuggestion
                      ? "blue"
                      : undefined
                  }
                >
                  <Text
                    color={
                      mode === "suggestions" && index === selectedSuggestion
                        ? "white"
                        : "cyan"
                    }
                  >
                    {suggestion.command}
                  </Text>
                  <Text color="gray" dimColor>
                    {" "}
                    - {suggestion.description}
                  </Text>
                </Box>
              ))}

              {filteredSuggestions.length > 5 && (
                <Box paddingX={1}>
                  <Text color="gray" dimColor>
                    ... and {filteredSuggestions.length - 5} more
                  </Text>
                </Box>
              )}
            </Box>
          </Box>
        )}

        {/* Help text */}
        <Box marginTop={1}>
          <Text color="gray" dimColor>
            Enter: Execute | Tab: Toggle suggestions | Esc: Cancel
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
