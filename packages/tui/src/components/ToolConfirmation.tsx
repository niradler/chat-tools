import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface ToolConfirmationProps {
  toolName: string;
  description: string;
  parameters: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high';
  onConfirm: () => void;
  onCancel: () => void;
  onEdit?: (newParams: Record<string, any>) => void;
  allowEdit?: boolean;
}

export const ToolConfirmation: React.FC<ToolConfirmationProps> = ({
  toolName,
  description,
  parameters,
  riskLevel,
  onConfirm,
  onCancel,
  onEdit,
  allowEdit = false
}) => {
  const [selectedAction, setSelectedAction] = useState<'confirm' | 'cancel' | 'edit' | null>(null);
  const [editMode, setEditMode] = useState(false);

  const getRiskColor = () => {
    switch (riskLevel) {
      case 'low': return 'green';
      case 'medium': return 'yellow';
      case 'high': return 'red';
      default: return 'white';
    }
  };

  const getRiskIcon = () => {
    switch (riskLevel) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🔴';
      default: return '⚪';
    }
  };

  useInput((input, key) => {
    if (editMode) return;

    if (key.return) {
      if (selectedAction === 'confirm') {
        onConfirm();
      } else if (selectedAction === 'cancel') {
        onCancel();
      } else if (selectedAction === 'edit' && onEdit) {
        setEditMode(true);
      }
    } else if (input === 'y' || input === 'Y') {
      setSelectedAction('confirm');
    } else if (input === 'n' || input === 'N') {
      setSelectedAction('cancel');
    } else if ((input === 'e' || input === 'E') && allowEdit) {
      setSelectedAction('edit');
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box 
        borderStyle="double" 
        borderColor={getRiskColor()}
        padding={1}
        flexDirection="column"
      >
        {/* Header */}
        <Box justifyContent="space-between" marginBottom={1}>
          <Text bold color={getRiskColor()}>
            🛠️ Tool Execution Request
          </Text>
          <Text color={getRiskColor()}>
            {getRiskIcon()} {riskLevel.toUpperCase()} RISK
          </Text>
        </Box>

        {/* Tool Info */}
        <Box flexDirection="column" marginBottom={1}>
          <Box marginBottom={1}>
            <Text color="cyan" bold>Tool: </Text>
            <Text>{toolName}</Text>
          </Box>
          <Box marginBottom={1}>
            <Text color="blue" bold>Description: </Text>
            <Text wrap="wrap">{description}</Text>
          </Box>
        </Box>

        {/* Parameters */}
        <Box flexDirection="column" marginBottom={1}>
          <Text color="yellow" bold>Parameters:</Text>
          <Box 
            borderStyle="single" 
            borderColor="gray"
            padding={1}
            marginTop={1}
          >
            {Object.entries(parameters).map(([key, value]) => (
              <Box key={key} flexDirection="column">
                <Box>
                  <Text color="magenta">{key}: </Text>
                  <Text>{typeof value === 'string' ? value : JSON.stringify(value, null, 2)}</Text>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Actions */}
        <Box flexDirection="column">
          <Text bold>Choose an action:</Text>
          <Box marginTop={1}>
            <Text color={selectedAction === 'confirm' ? 'green' : 'white'}>
              [Y] Confirm - Execute the tool
            </Text>
          </Box>
          <Box>
            <Text color={selectedAction === 'cancel' ? 'red' : 'white'}>
              [N] Cancel - Don't execute
            </Text>
          </Box>
          {allowEdit && (
            <Box>
              <Text color={selectedAction === 'edit' ? 'blue' : 'white'}>
                [E] Edit - Modify parameters
              </Text>
            </Box>
          )}
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              Press the key and then Enter to confirm
            </Text>
          </Box>
        </Box>

        {/* Selection indicator */}
        {selectedAction && (
          <Box marginTop={1} padding={1} borderStyle="single" borderColor="yellow">
            <Text color="yellow">
              Selected: {selectedAction.toUpperCase()} - Press Enter to proceed
            </Text>
          </Box>
        )}

        {/* Risk warning for high-risk tools */}
        {riskLevel === 'high' && (
          <Box marginTop={1} padding={1} borderStyle="single" borderColor="red">
            <Text color="red" bold>
              ⚠️ WARNING: This tool may make significant changes to your system!
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};
