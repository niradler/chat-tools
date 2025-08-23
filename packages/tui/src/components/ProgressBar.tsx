import React from "react";
import { Box, Text } from "ink";

interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  showNumbers?: boolean;
  width?: number;
  color?: string;
  backgroundColor?: string;
  variant?: "bar" | "circle" | "blocks";
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  label,
  showPercentage = true,
  showNumbers = true,
  width = 30,
  color = "green",
  backgroundColor = "gray",
  variant = "bar",
}) => {
  const percentage = Math.min(100, Math.max(0, (current / total) * 100));
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  const renderBar = () => {
    const filledBar = "█".repeat(filled);
    const emptyBar = "░".repeat(empty);
    return (
      <Box>
        <Text color={color}>{filledBar}</Text>
        <Text color={backgroundColor}>{emptyBar}</Text>
      </Box>
    );
  };

  const renderBlocks = () => {
    const blocks = Array.from({ length: width }, (_, index) => {
      const blockPercentage = ((index + 1) / width) * 100;
      return blockPercentage <= percentage ? "█" : "░";
    });

    return (
      <Box>
        {blocks.map((block, index) => (
          <Text key={index} color={block === "█" ? color : backgroundColor}>
            {block}
          </Text>
        ))}
      </Box>
    );
  };

  const renderCircle = () => {
    if (percentage < 25) return "◔";
    if (percentage < 50) return "◑";
    if (percentage < 75) return "◕";
    return "●";
  };

  return (
    <Box flexDirection="column">
      {label && (
        <Box marginBottom={1}>
          <Text bold>{label}</Text>
        </Box>
      )}

      <Box alignItems="center">
        {variant === "circle" ? (
          <Text color={color} bold>
            {renderCircle()}
          </Text>
        ) : variant === "blocks" ? (
          renderBlocks()
        ) : (
          renderBar()
        )}

        {showPercentage && (
          <Box marginLeft={2}>
            <Text color={color} bold>
              {percentage.toFixed(1)}%
            </Text>
          </Box>
        )}

        {showNumbers && (
          <Box marginLeft={2}>
            <Text color="gray">
              ({current}/{total})
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};
