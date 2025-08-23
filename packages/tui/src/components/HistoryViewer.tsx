import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

interface HistoryItem {
  id: string;
  timestamp: Date;
  type: "command" | "message" | "tool" | "system";
  content: string;
  metadata?: Record<string, any>;
  status?: "success" | "error" | "pending";
}

interface HistoryViewerProps {
  items: HistoryItem[];
  onSelect?: (item: HistoryItem) => void;
  onClose?: () => void;
  filterType?: "command" | "message" | "tool" | "system" | "all";
  maxItems?: number;
}

export const HistoryViewer: React.FC<HistoryViewerProps> = ({
  items,
  onSelect,
  onClose,
  filterType = "all",
  maxItems = 20,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentFilter, setCurrentFilter] = useState(filterType);

  const filteredItems = items
    .filter((item) => currentFilter === "all" || item.type === currentFilter)
    .slice(0, maxItems)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "command":
        return "⚡";
      case "message":
        return "💬";
      case "tool":
        return "🔧";
      case "system":
        return "⚙️";
      default:
        return "📄";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "command":
        return "blue";
      case "message":
        return "green";
      case "tool":
        return "yellow";
      case "system":
        return "cyan";
      default:
        return "white";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "pending":
        return "⏳";
      default:
        return "";
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      if (onClose) onClose();
      return;
    }

    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(filteredItems.length - 1, selectedIndex + 1));
    } else if (key.return) {
      if (filteredItems[selectedIndex] && onSelect) {
        onSelect(filteredItems[selectedIndex]);
      }
    }

    // Filter shortcuts
    if (input === "1") setCurrentFilter("all");
    if (input === "2") setCurrentFilter("command");
    if (input === "3") setCurrentFilter("message");
    if (input === "4") setCurrentFilter("tool");
    if (input === "5") setCurrentFilter("system");
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box
        borderStyle="double"
        borderColor="magenta"
        padding={1}
        flexDirection="column"
      >
        {/* Header */}
        <Box justifyContent="space-between" marginBottom={1}>
          <Text bold color="magenta">
            📋 History Viewer
          </Text>
          <Text color="gray" dimColor>
            {filteredItems.length} items (filter: {currentFilter})
          </Text>
        </Box>

        {/* Filter options */}
        <Box
          justifyContent="space-around"
          marginBottom={1}
          paddingY={0}
          borderStyle="single"
          borderColor="gray"
        >
          <Text color={currentFilter === "all" ? "magenta" : "gray"}>
            [1] All ({items.length})
          </Text>
          <Text color={currentFilter === "command" ? "magenta" : "gray"}>
            [2] Commands ({items.filter((i) => i.type === "command").length})
          </Text>
          <Text color={currentFilter === "message" ? "magenta" : "gray"}>
            [3] Messages ({items.filter((i) => i.type === "message").length})
          </Text>
          <Text color={currentFilter === "tool" ? "magenta" : "gray"}>
            [4] Tools ({items.filter((i) => i.type === "tool").length})
          </Text>
          <Text color={currentFilter === "system" ? "magenta" : "gray"}>
            [5] System ({items.filter((i) => i.type === "system").length})
          </Text>
        </Box>

        {/* Items list */}
        <Box flexDirection="column" flexGrow={1}>
          {filteredItems.length === 0 ? (
            <Box justifyContent="center" alignItems="center" padding={2}>
              <Text color="gray" dimColor>
                No history items found
              </Text>
            </Box>
          ) : (
            filteredItems.map((item, index) => (
              <Box
                key={item.id}
                paddingX={1}
                marginBottom={index < filteredItems.length - 1 ? 1 : 0}
                borderStyle={index === selectedIndex ? "double" : "single"}
                borderColor={index === selectedIndex ? "cyan" : "gray"}
              >
                <Box flexDirection="column" width="100%">
                  {/* Item header */}
                  <Box justifyContent="space-between">
                    <Box>
                      <Text color={getTypeColor(item.type)}>
                        {getTypeIcon(item.type)} {item.type}
                      </Text>
                      {item.status && (
                        <Text> {getStatusIcon(item.status)}</Text>
                      )}
                    </Box>
                    <Text color="gray" dimColor>
                      {item.timestamp.toLocaleTimeString()}
                    </Text>
                  </Box>

                  {/* Item content */}
                  <Box paddingLeft={2} paddingTop={1}>
                    <Text wrap="wrap">
                      {item.content.length > 80
                        ? `${item.content.substring(0, 80)}...`
                        : item.content}
                    </Text>
                  </Box>

                  {/* Metadata preview */}
                  {item.metadata && Object.keys(item.metadata).length > 0 && (
                    <Box paddingLeft={2} paddingTop={1}>
                      <Text color="gray" dimColor>
                        {Object.keys(item.metadata).slice(0, 3).join(", ")}
                        {Object.keys(item.metadata).length > 3 && "..."}
                      </Text>
                    </Box>
                  )}
                </Box>
              </Box>
            ))
          )}
        </Box>

        {/* Controls */}
        <Box marginTop={1} justifyContent="center">
          <Text color="gray" dimColor>
            ↑↓: Navigate | Enter: Select | 1-5: Filter | Esc: Close
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
