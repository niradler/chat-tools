import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioButtonSelectProps {
  options: RadioOption[];
  value?: string;
  onChange: (value: string) => void;
  title?: string;
  orientation?: "vertical" | "horizontal";
  showIndicators?: boolean;
}

export const RadioButtonSelect: React.FC<RadioButtonSelectProps> = ({
  options,
  value,
  onChange,
  title,
  orientation = "vertical",
  showIndicators = true,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(
    value ? options.findIndex((opt) => opt.value === value) : 0
  );

  useInput((input, key) => {
    if (orientation === "vertical") {
      if (key.upArrow) {
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      } else if (key.downArrow) {
        setSelectedIndex(Math.min(options.length - 1, selectedIndex + 1));
      }
    } else {
      if (key.leftArrow) {
        setSelectedIndex(Math.max(0, selectedIndex - 1));
      } else if (key.rightArrow) {
        setSelectedIndex(Math.min(options.length - 1, selectedIndex + 1));
      }
    }

    if (key.return || input === " ") {
      const selectedOption = options[selectedIndex];
      if (selectedOption && !selectedOption.disabled) {
        onChange(selectedOption.value);
      }
    }
  });

  const renderOption = (option: RadioOption, index: number) => {
    const isSelected = index === selectedIndex;
    const isChecked = option.value === value;

    return (
      <Box
        key={option.value}
        flexDirection={orientation === "vertical" ? "column" : "row"}
        marginRight={orientation === "horizontal" ? 2 : 0}
        marginBottom={orientation === "vertical" ? 1 : 0}
      >
        <Box alignItems="center">
          {showIndicators && (
            <Text
              color={
                option.disabled
                  ? "gray"
                  : isSelected
                  ? "cyan"
                  : isChecked
                  ? "green"
                  : "white"
              }
            >
              {isChecked ? "●" : "○"}{" "}
            </Text>
          )}
          <Text
            color={
              option.disabled
                ? "gray"
                : isSelected
                ? "cyan"
                : isChecked
                ? "green"
                : "white"
            }
            bold={isSelected}
            dimColor={option.disabled}
          >
            {option.label}
          </Text>
        </Box>

        {option.description && orientation === "vertical" && (
          <Box paddingLeft={3}>
            <Text color="gray" dimColor>
              {option.description}
            </Text>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      {title && (
        <Box marginBottom={1}>
          <Text bold color="blue">
            {title}
          </Text>
        </Box>
      )}

      <Box
        flexDirection={orientation === "vertical" ? "column" : "row"}
        borderStyle="single"
        borderColor="gray"
        padding={1}
      >
        {options.map(renderOption)}
      </Box>

      <Box marginTop={1}>
        <Text color="gray" dimColor>
          {orientation === "vertical" ? "↑↓" : "←→"}: Navigate | Enter/Space:
          Select
        </Text>
      </Box>
    </Box>
  );
};
