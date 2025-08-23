import React from "react";
import { Box } from "ink";

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Box flexDirection="column" height="100%">
      {children}
    </Box>
  );
};
