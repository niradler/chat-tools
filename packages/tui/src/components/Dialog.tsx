import React from "react";
import { Box, Text } from "ink";

interface DialogProps {
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onClose?: () => void;
  width?: number | string;
  height?: number | string;
  borderColor?: string;
  showCloseButton?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  title,
  children,
  isOpen,
  onClose,
  width = "80%",
  height = "auto",
  borderColor = "cyan",
  showCloseButton = true,
}) => {
  if (!isOpen) return null;

  return (
    <Box
      justifyContent="center"
      alignItems="center"
      borderStyle="double"
      borderColor="gray"
      paddingX={2}
      paddingY={1}
      height="100%"
      width="100%"
    >
      <Box
        width={width}
        height={height}
        borderStyle="round"
        borderColor={borderColor}
        padding={1}
        flexDirection="column"
      >
        {/* Header */}
        <Box
          justifyContent="space-between"
          alignItems="center"
          marginBottom={1}
        >
          <Text bold color={borderColor}>
            {title}
          </Text>
          {showCloseButton && onClose && (
            <Text color="red" bold>
              [✕]
            </Text>
          )}
        </Box>

        {/* Content */}
        <Box flexDirection="column" flexGrow={1}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};

interface ConfirmDialogProps {
  title: string;
  message: string;
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: "info" | "warning" | "danger";
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  isOpen,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "info",
}) => {
  const getVariantColor = () => {
    switch (variant) {
      case "warning":
        return "yellow";
      case "danger":
        return "red";
      default:
        return "blue";
    }
  };

  const getVariantIcon = () => {
    switch (variant) {
      case "warning":
        return "⚠️";
      case "danger":
        return "🚨";
      default:
        return "ℹ️";
    }
  };

  return (
    <Dialog
      title={`${getVariantIcon()} ${title}`}
      isOpen={isOpen}
      onClose={onCancel}
      borderColor={getVariantColor()}
      width={60}
      showCloseButton={false}
    >
      <Box flexDirection="column">
        <Box marginBottom={2}>
          <Text wrap="wrap">{message}</Text>
        </Box>

        <Box justifyContent="space-around">
          <Box borderStyle="single" borderColor="red" paddingX={2} paddingY={0}>
            <Text color="red" bold>
              {cancelText}
            </Text>
          </Box>

          <Box
            borderStyle="single"
            borderColor="green"
            paddingX={2}
            paddingY={0}
          >
            <Text color="green" bold>
              {confirmText}
            </Text>
          </Box>
        </Box>

        <Box justifyContent="center" marginTop={1}>
          <Text color="gray" dimColor>
            Use arrow keys to select, Enter to confirm
          </Text>
        </Box>
      </Box>
    </Dialog>
  );
};
