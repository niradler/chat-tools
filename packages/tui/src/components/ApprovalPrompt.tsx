import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

interface ApprovalPromptProps {
  message: string;
  command?: string;
  onApprove: () => void;
  onDeny: () => void;
}

export const ApprovalPrompt: React.FC<ApprovalPromptProps> = ({
  message,
  command,
  onApprove,
  onDeny,
}) => {
  const [selection, setSelection] = useState<"approve" | "deny" | null>(null);

  useInput((input: string, key: any) => {
    if (key.return) {
      if (selection === "approve") {
        onApprove();
      } else if (selection === "deny") {
        onDeny();
      }
    } else if (input === "y" || input === "Y") {
      setSelection("approve");
    } else if (input === "n" || input === "N") {
      setSelection("deny");
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="yellow"
      padding={1}
    >
      <Text color="yellow" bold>
        🔒 Approval Required
      </Text>
      <Text>{message}</Text>
      {command && (
        <Box marginTop={1}>
          <Text color="cyan">Command: </Text>
          <Text color="white">{command}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text>
          Press{" "}
          <Text color="green" bold>
            Y
          </Text>{" "}
          to approve,{" "}
          <Text color="red" bold>
            N
          </Text>{" "}
          to deny, then <Text bold>Enter</Text>
        </Text>
      </Box>
      {selection && (
        <Box marginTop={1}>
          <Text color={selection === "approve" ? "green" : "red"}>
            Selected: {selection === "approve" ? "Approve" : "Deny"}
          </Text>
        </Box>
      )}
    </Box>
  );
};
