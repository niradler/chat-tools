import React from "react";
import { Box } from "ink";

interface MaxSizedBoxProps {
  maxWidth?: number;
  maxHeight?: number;
  children: React.ReactNode;
  overflow?: "hidden" | "visible";
  horizontalAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "center" | "bottom";
}

export const MaxSizedBox: React.FC<MaxSizedBoxProps> = ({
  maxWidth,
  maxHeight,
  children,
  overflow = "hidden",
  horizontalAlign = "left",
  verticalAlign = "top",
}) => {
  const getJustifyContent = () => {
    switch (horizontalAlign) {
      case "center":
        return "center";
      case "right":
        return "flex-end";
      default:
        return "flex-start";
    }
  };

  const getAlignItems = () => {
    switch (verticalAlign) {
      case "center":
        return "center";
      case "bottom":
        return "flex-end";
      default:
        return "flex-start";
    }
  };

  return (
    <Box
      width={maxWidth}
      height={maxHeight}
      justifyContent={getJustifyContent()}
      alignItems={getAlignItems()}
      flexDirection="column"
      overflow={overflow}
    >
      {children}
    </Box>
  );
};
