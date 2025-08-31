import React from "react";
import { Box, Text } from "ink";
import { highlight } from "cli-highlight";
import { codeToHtml } from "shiki";

interface CodeBlockProps {
  code: string;
  language?: string;
  theme?: "dark" | "light";
  showLineNumbers?: boolean;
  highlighter?: "cli-highlight" | "shiki";
  maxLines?: number;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = "javascript",
  theme = "dark",
  showLineNumbers = true,
  highlighter = "cli-highlight",
  maxLines,
}) => {
  const lines = code.split("\n");
  const displayLines = maxLines ? lines.slice(0, maxLines) : lines;
  const hasMore = maxLines && lines.length > maxLines;

  const getHighlightedCode = () => {
    if (highlighter === "cli-highlight") {
      try {
        return highlight(code, {
          language,
          theme: theme === "dark" ? "monokai" : "github",
        });
      } catch (error) {
        return code;
      }
    }
    return code;
  };

  const highlightedCode = getHighlightedCode();
  const highlightedLines = highlightedCode.split("\n");

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box
        borderStyle="round"
        borderColor="green"
        padding={1}
        flexDirection="column"
      >
        <Box justifyContent="space-between" marginBottom={1}>
          <Text bold color="green">
            💻 {language.toUpperCase()} Code
          </Text>
          <Text color="gray" dimColor>
            {lines.length} lines
          </Text>
        </Box>

        <Box flexDirection="column">
          {displayLines.map((line, index) => {
            const highlightedLine = highlightedLines[index] || line;
            return (
              <Box key={index}>
                {showLineNumbers && (
                  <Text color="gray" dimColor>
                    {(index + 1).toString().padStart(3, " ")}:
                  </Text>
                )}
                <Text> {highlightedLine}</Text>
              </Box>
            );
          })}
        </Box>

        {hasMore && (
          <Box justifyContent="center" marginTop={1}>
            <Text color="gray" dimColor>
              ... {lines.length - maxLines} more lines
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};

interface InlineCodeProps {
  code: string;
  language?: string;
}

export const InlineCode: React.FC<InlineCodeProps> = ({
  code,
  language = "text",
}) => {
  return (
    <Text backgroundColor="gray" color="white">
      {` ${code} `}
    </Text>
  );
};
