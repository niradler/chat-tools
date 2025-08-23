import { useState, useCallback } from "react";

export interface AtCommand {
  command: string;
  description: string;
  handler: (args: string[]) => Promise<void> | void;
  aliases?: string[];
  parameters?: Array<{
    name: string;
    description: string;
    required?: boolean;
    type?: "string" | "number" | "boolean";
  }>;
}

export interface AtCommandMatch {
  command: AtCommand;
  args: string[];
  rawInput: string;
}

export interface UseAtCommandProcessorOptions {
  prefix?: string;
  caseSensitive?: boolean;
}

export const useAtCommandProcessor = (
  commands: AtCommand[],
  options: UseAtCommandProcessorOptions = {}
) => {
  const { prefix = "@", caseSensitive = false } = options;
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  // Parse input to extract @ commands
  const parseAtCommands = useCallback(
    (input: string): AtCommandMatch[] => {
      const matches: AtCommandMatch[] = [];
      const regex = new RegExp(
        `\\${prefix}(\\w+)(?:\\s+([^${prefix}]*))?`,
        "g"
      );
      let match;

      while ((match = regex.exec(input)) !== null) {
        const commandName = caseSensitive ? match[1] : match[1].toLowerCase();
        const argsString = match[2]?.trim() || "";
        const args = argsString ? argsString.split(/\s+/) : [];

        // Find matching command
        const command = commands.find((cmd) => {
          const name = caseSensitive ? cmd.command : cmd.command.toLowerCase();
          const aliases = cmd.aliases?.map((alias) =>
            caseSensitive ? alias : alias.toLowerCase()
          );
          return name === commandName || aliases?.includes(commandName);
        });

        if (command) {
          matches.push({
            command,
            args,
            rawInput: match[0],
          });
        }
      }

      return matches;
    },
    [commands, prefix, caseSensitive]
  );

  // Process @ commands in input
  const processInput = useCallback(
    async (input: string): Promise<string> => {
      const matches = parseAtCommands(input);

      if (matches.length === 0) {
        return input;
      }

      setIsProcessing(true);
      let processedInput = input;

      try {
        for (const match of matches) {
          // Validate required parameters
          const requiredParams =
            match.command.parameters?.filter((p) => p.required) || [];
          if (requiredParams.length > match.args.length) {
            const missingParams = requiredParams
              .slice(match.args.length)
              .map((p) => p.name)
              .join(", ");
            setLastResult(`Missing required parameters: ${missingParams}`);
            continue;
          }

          // Execute command
          await match.command.handler(match.args);

          // Remove the @ command from input (replace with empty string)
          processedInput = processedInput.replace(match.rawInput, "").trim();
        }

        setLastResult("Commands executed successfully");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setLastResult(`Command execution failed: ${errorMessage}`);
      } finally {
        setIsProcessing(false);
      }

      return processedInput;
    },
    [parseAtCommands]
  );

  // Get suggestions for partial @ commands
  const getSuggestions = useCallback(
    (input: string): Array<{ command: AtCommand; suggestion: string }> => {
      const lastAtIndex = input.lastIndexOf(prefix);
      if (lastAtIndex === -1) return [];

      const partialCommand = input.slice(lastAtIndex + prefix.length);
      const suggestions: Array<{ command: AtCommand; suggestion: string }> = [];

      commands.forEach((command) => {
        const commandText = caseSensitive
          ? command.command
          : command.command.toLowerCase();
        const searchText = caseSensitive
          ? partialCommand
          : partialCommand.toLowerCase();

        if (commandText.startsWith(searchText)) {
          suggestions.push({
            command,
            suggestion: `${prefix}${command.command}`,
          });
        }

        // Check aliases
        command.aliases?.forEach((alias) => {
          const aliasText = caseSensitive ? alias : alias.toLowerCase();
          if (aliasText.startsWith(searchText)) {
            suggestions.push({
              command,
              suggestion: `${prefix}${alias}`,
            });
          }
        });
      });

      return suggestions.slice(0, 10); // Limit suggestions
    },
    [commands, prefix, caseSensitive]
  );

  // Check if input contains @ commands
  const hasAtCommands = useCallback(
    (input: string): boolean => {
      return parseAtCommands(input).length > 0;
    },
    [parseAtCommands]
  );

  // Get help for all commands
  const getHelp = useCallback((): string => {
    let help = `Available ${prefix} commands:\n\n`;

    commands.forEach((command) => {
      help += `${prefix}${command.command}`;
      if (command.aliases?.length) {
        help += ` (aliases: ${command.aliases
          .map((a) => `${prefix}${a}`)
          .join(", ")})`;
      }
      help += `\n  ${command.description}\n`;

      if (command.parameters?.length) {
        command.parameters.forEach((param) => {
          const required = param.required ? " (required)" : " (optional)";
          help += `  - ${param.name}${required}: ${param.description}\n`;
        });
      }
      help += "\n";
    });

    return help;
  }, [commands, prefix]);

  return {
    parseAtCommands,
    processInput,
    getSuggestions,
    hasAtCommands,
    getHelp,
    isProcessing,
    lastResult,
  };
};
