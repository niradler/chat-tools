import React, { useState, useEffect } from "react";
import { Box, Text } from "ink";

interface TextBufferProps {
  lines: string[];
  maxLines?: number;
  showLineNumbers?: boolean;
  highlightPattern?: RegExp;
  highlightColor?: string;
  autoScroll?: boolean;
  wrap?: boolean;
}

export const TextBuffer: React.FC<TextBufferProps> = ({
  lines,
  maxLines = 20,
  showLineNumbers = false,
  highlightPattern,
  highlightColor = "yellow",
  autoScroll = true,
  wrap = true,
}) => {
  const [scrollOffset, setScrollOffset] = useState(0);

  // Auto-scroll to bottom when new lines are added
  useEffect(() => {
    if (autoScroll && lines.length > maxLines) {
      setScrollOffset(lines.length - maxLines);
    }
  }, [lines.length, maxLines, autoScroll]);

  const visibleLines = lines.slice(scrollOffset, scrollOffset + maxLines);

  const renderLine = (line: string, index: number) => {
    const actualLineNumber = scrollOffset + index + 1;

    // Apply highlighting if pattern is provided
    let content = line;
    let highlightedContent = null;

    if (highlightPattern && highlightPattern.test(line)) {
      const parts = line.split(highlightPattern);
      const matches = line.match(highlightPattern) || [];

      highlightedContent = (
        <Text>
          {parts.map((part, i) => (
            <React.Fragment key={i}>
              <Text>{part}</Text>
              {matches[i] && (
                <Text color={highlightColor} bold>
                  {matches[i]}
                </Text>
              )}
            </React.Fragment>
          ))}
        </Text>
      );
    }

    return (
      <Box key={index} flexDirection="row">
        {showLineNumbers && (
          <Box marginRight={1} width={4}>
            <Text color="gray" dimColor>
              {actualLineNumber.toString().padStart(3, " ")}:
            </Text>
          </Box>
        )}
        <Box flexGrow={1}>
          {highlightedContent || (
            <Text wrap={wrap ? "wrap" : "truncate"}>{content}</Text>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      {visibleLines.map(renderLine)}

      {/* Scroll indicator */}
      {lines.length > maxLines && (
        <Box justifyContent="center" marginTop={1}>
          <Text color="gray" dimColor>
            Showing {scrollOffset + 1}-{scrollOffset + visibleLines.length} of{" "}
            {lines.length} lines
            {!autoScroll && " | ↑↓ to scroll"}
          </Text>
        </Box>
      )}
    </Box>
  );
};

// Utility class for managing text buffer state
export class TextBufferManager {
  private lines: string[] = [];
  private maxCapacity: number;

  constructor(maxCapacity = 1000) {
    this.maxCapacity = maxCapacity;
  }

  addLine(line: string): void {
    this.lines.push(line);
    if (this.lines.length > this.maxCapacity) {
      this.lines = this.lines.slice(-this.maxCapacity);
    }
  }

  addLines(newLines: string[]): void {
    this.lines.push(...newLines);
    if (this.lines.length > this.maxCapacity) {
      this.lines = this.lines.slice(-this.maxCapacity);
    }
  }

  clear(): void {
    this.lines = [];
  }

  getLines(): string[] {
    return [...this.lines];
  }

  getLastLines(count: number): string[] {
    return this.lines.slice(-count);
  }

  search(pattern: string | RegExp): number[] {
    const regex =
      typeof pattern === "string" ? new RegExp(pattern, "gi") : pattern;
    const matches: number[] = [];

    this.lines.forEach((line, index) => {
      if (regex.test(line)) {
        matches.push(index);
      }
    });

    return matches;
  }
}
