import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";

export interface Command {
  name: string;
  description: string;
  handler: (args: string[]) => void | Promise<void>;
  aliases?: string[];
  hidden?: boolean;
}

interface CommandInputProps {
  trigger: string; // e.g., "/" or "@"
  commands: Command[];
  onSubmit: (message: string) => void;
  placeholder?: string;
  showSuggestions?: boolean;
}

export const CommandInput: React.FC<CommandInputProps> = ({
  trigger,
  commands,
  onSubmit,
  placeholder = "Type a message or command...",
  showSuggestions = true,
}) => {
  const [input, setInput] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [showCommandList, setShowCommandList] = useState(false);

  // Check if input starts with trigger
  const isCommand = input.startsWith(trigger);
  const commandText = isCommand ? input.slice(trigger.length) : "";

  // Filter commands based on input
  const filteredCommands = commands
    .filter((cmd) => !cmd.hidden)
    .filter((cmd) => {
      if (!isCommand) return false;
      return (
        cmd.name.toLowerCase().includes(commandText.toLowerCase()) ||
        cmd.aliases?.some((alias) =>
          alias.toLowerCase().includes(commandText.toLowerCase())
        )
      );
    });

  useInput((inputChar, key) => {
    if (key.escape) {
      setShowCommandList(false);
      setInput("");
      return;
    }

    if (showCommandList && filteredCommands.length > 0) {
      if (key.upArrow) {
        setSelectedSuggestion(Math.max(0, selectedSuggestion - 1));
        return;
      }
      if (key.downArrow) {
        setSelectedSuggestion(
          Math.min(filteredCommands.length - 1, selectedSuggestion + 1)
        );
        return;
      }
      if (key.tab || key.return) {
        const selectedCommand = filteredCommands[selectedSuggestion];
        if (selectedCommand) {
          setInput(`${trigger}${selectedCommand.name} `);
          setShowCommandList(false);
          setSelectedSuggestion(0);
        }
        return;
      }
    }

    if (key.return) {
      if (input.trim()) {
        handleSubmit(input.trim());
      }
      return;
    }

    if (key.backspace || key.delete) {
      const newInput = input.slice(0, -1);
      setInput(newInput);
      updateCommandList(newInput);
      return;
    }

    if (inputChar && inputChar.length === 1) {
      const newInput = input + inputChar;
      setInput(newInput);
      updateCommandList(newInput);
    }
  });

  const updateCommandList = (newInput: string) => {
    const isNewCommand = newInput.startsWith(trigger);
    setShowCommandList(isNewCommand && showSuggestions);
    if (isNewCommand) {
      setSelectedSuggestion(0);
    }
  };

  const handleSubmit = async (inputText: string) => {
    if (inputText.startsWith(trigger)) {
      // Handle command
      const parts = inputText.slice(trigger.length).split(" ");
      const commandName = parts[0];
      const args = parts.slice(1);

      const command = commands.find(
        (cmd) =>
          cmd.name.toLowerCase() === commandName.toLowerCase() ||
          cmd.aliases?.some(
            (alias) => alias.toLowerCase() === commandName.toLowerCase()
          )
      );

      if (command) {
        try {
          await command.handler(args);
        } catch (error) {
          console.error("Command execution failed:", error);
        }
      } else {
        console.log(`Unknown command: ${commandName}`);
      }
    } else {
      // Handle regular message
      onSubmit(inputText);
    }

    setInput("");
    setShowCommandList(false);
    setSelectedSuggestion(0);
  };

  return (
    <Box flexDirection="column">
      {/* Input field */}
      <Box
        borderStyle="single"
        borderColor={isCommand ? "yellow" : "blue"}
        padding={1}
      >
        <Text color={isCommand ? "yellow" : "blue"}>
          {isCommand ? "" : "> "}
        </Text>
        {isCommand ? (
          <>
            <Text color="yellow">{trigger}</Text>
            {(() => {
              const parts = commandText.split(" ");
              const commandName = parts[0];
              const args = parts.slice(1).join(" ");
              return (
                <>
                  <Text color="yellow">{commandName}</Text>
                  {args && <Text color="white"> {args}</Text>}
                </>
              );
            })()}
          </>
        ) : (
          <Text color="white">{input}</Text>
        )}
        {input.length === 0 && (
          <Text color="gray" dimColor>
            {placeholder}
          </Text>
        )}
        <Text color="cyan">▋</Text>
      </Box>

      {/* Command suggestions */}
      {showCommandList && filteredCommands.length > 0 && (
        <Box
          borderStyle="single"
          borderColor="yellow"
          padding={1}
          marginTop={1}
          flexDirection="column"
        >
          <Box marginBottom={1}>
            <Text color="yellow" bold>
              Available Commands:
            </Text>
          </Box>

          {filteredCommands.slice(0, 8).map((command, index) => (
            <Box
              key={command.name}
              paddingX={1}
              borderStyle={index === selectedSuggestion ? "single" : undefined}
              borderColor={index === selectedSuggestion ? "cyan" : undefined}
            >
              <Text
                color={index === selectedSuggestion ? "cyan" : "white"}
                bold={index === selectedSuggestion}
              >
                {trigger}
                {command.name}
              </Text>
              {command.aliases && command.aliases.length > 0 && (
                <Text color="gray" dimColor>
                  {" "}
                  ({command.aliases.map((a) => `${trigger}${a}`).join(", ")})
                </Text>
              )}
              <Text color="gray" dimColor>
                {" "}
                - {command.description}
              </Text>
            </Box>
          ))}

          {filteredCommands.length > 8 && (
            <Box paddingX={1}>
              <Text color="gray" dimColor>
                ... and {filteredCommands.length - 8} more commands
              </Text>
            </Box>
          )}

          <Box marginTop={1}>
            <Text color="gray" dimColor>
              ↑↓: Navigate | Tab/Enter: Select | Esc: Cancel
            </Text>
          </Box>
        </Box>
      )}

      {/* Help text */}
      <Box marginTop={1}>
        <Text color="gray" dimColor>
          Type {trigger} for commands | Enter: Send | Esc: Clear
        </Text>
      </Box>
    </Box>
  );
};
