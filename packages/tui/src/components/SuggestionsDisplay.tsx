import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

interface Suggestion {
  id: string;
  text: string;
  description?: string;
  category: "command" | "completion" | "template" | "shortcut";
  icon?: string;
  confidence?: number;
}

interface SuggestionsDisplayProps {
  suggestions: Suggestion[];
  onSelect?: (suggestion: Suggestion) => void;
  onDismiss?: () => void;
  title?: string;
  maxVisible?: number;
  showCategories?: boolean;
  autoSelect?: boolean;
}

export const SuggestionsDisplay: React.FC<SuggestionsDisplayProps> = ({
  suggestions,
  onSelect,
  onDismiss,
  title = "Suggestions",
  maxVisible = 8,
  showCategories = true,
  autoSelect = false,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const filteredSuggestions = suggestions.filter(
    (s) => categoryFilter === "all" || s.category === categoryFilter
  );

  const visibleSuggestions = filteredSuggestions.slice(0, maxVisible);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "command":
        return "⚡";
      case "completion":
        return "💡";
      case "template":
        return "📝";
      case "shortcut":
        return "⚡";
      default:
        return "💭";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "command":
        return "blue";
      case "completion":
        return "green";
      case "template":
        return "yellow";
      case "shortcut":
        return "cyan";
      default:
        return "white";
    }
  };

  const getConfidenceBar = (confidence?: number) => {
    if (!confidence) return "";
    const bars = Math.round(confidence * 5);
    const filled = "█".repeat(bars);
    const empty = "░".repeat(5 - bars);
    return filled + empty;
  };

  useInput((input, key) => {
    if (key.escape) {
      if (onDismiss) onDismiss();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(
        Math.min(visibleSuggestions.length - 1, selectedIndex + 1)
      );
    } else if (key.return || key.tab) {
      if (visibleSuggestions[selectedIndex] && onSelect) {
        onSelect(visibleSuggestions[selectedIndex]);
      }
    }

    // Category filters
    if (input === "1") setCategoryFilter("all");
    if (input === "2") setCategoryFilter("command");
    if (input === "3") setCategoryFilter("completion");
    if (input === "4") setCategoryFilter("template");
    if (input === "5") setCategoryFilter("shortcut");

    // Number selection
    const num = parseInt(input);
    if (num >= 1 && num <= visibleSuggestions.length) {
      if (onSelect) {
        onSelect(visibleSuggestions[num - 1]);
      }
    }
  });

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box
        borderStyle="round"
        borderColor="green"
        padding={1}
        flexDirection="column"
      >
        {/* Header */}
        <Box justifyContent="space-between" marginBottom={1}>
          <Text bold color="green">
            💡 {title}
          </Text>
          <Text color="gray" dimColor>
            {visibleSuggestions.length}/{suggestions.length}
          </Text>
        </Box>

        {/* Category filters */}
        {showCategories && (
          <Box
            justifyContent="space-around"
            marginBottom={1}
            paddingY={0}
            borderStyle="single"
            borderColor="gray"
          >
            <Text color={categoryFilter === "all" ? "green" : "gray"}>
              [1] All
            </Text>
            <Text color={categoryFilter === "command" ? "green" : "gray"}>
              [2] Commands
            </Text>
            <Text color={categoryFilter === "completion" ? "green" : "gray"}>
              [3] Complete
            </Text>
            <Text color={categoryFilter === "template" ? "green" : "gray"}>
              [4] Templates
            </Text>
            <Text color={categoryFilter === "shortcut" ? "green" : "gray"}>
              [5] Shortcuts
            </Text>
          </Box>
        )}

        {/* Suggestions list */}
        <Box flexDirection="column">
          {visibleSuggestions.map((suggestion, index) => (
            <Box
              key={suggestion.id}
              paddingX={1}
              paddingY={0}
              borderStyle={index === selectedIndex ? "double" : "single"}
              borderColor={index === selectedIndex ? "cyan" : "gray"}
            >
              <Box justifyContent="space-between" width="100%">
                <Box flexGrow={1}>
                  <Text color="white" bold>
                    {index + 1}.
                  </Text>
                  <Text color={getCategoryColor(suggestion.category)}>
                    {suggestion.icon || getCategoryIcon(suggestion.category)}{" "}
                    {suggestion.text}
                  </Text>
                </Box>

                {suggestion.confidence && (
                  <Box marginLeft={2}>
                    <Text color="gray" dimColor>
                      {getConfidenceBar(suggestion.confidence)}
                    </Text>
                  </Box>
                )}
              </Box>

              {suggestion.description && (
                <Box paddingLeft={3} paddingTop={0}>
                  <Text color="gray" dimColor wrap="wrap">
                    {suggestion.description}
                  </Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>

        {/* More suggestions indicator */}
        {filteredSuggestions.length > maxVisible && (
          <Box justifyContent="center" marginTop={1}>
            <Text color="gray" dimColor>
              ... {filteredSuggestions.length - maxVisible} more suggestions
            </Text>
          </Box>
        )}

        {/* Controls */}
        <Box marginTop={1} justifyContent="center">
          <Text color="gray" dimColor>
            ↑↓: Navigate | Enter/Tab: Select | 1-9: Quick select | Esc: Close
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
