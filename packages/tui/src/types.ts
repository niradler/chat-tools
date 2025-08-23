import React, { ReactNode } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ChatViewProps {
  messages: Message[];
  loading?: boolean;
  onScroll?: (position: number) => void;
}

export interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
}

export interface StatusBarProps {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  connectionInfo?: string;
  extensionInfo?: string;
  messageCount?: number;
}

export interface LayoutProps {
  children: ReactNode;
  statusBar?: ReactNode;
  sidebar?: ReactNode;
  header?: ReactNode;
}

export interface ApprovalPromptProps {
  toolName: string;
  description: string;
  parameters: Record<string, any>;
  onApprove: () => void;
  onDeny: () => void;
  onEdit?: (newParams: Record<string, any>) => void;
  onWhitelist?: () => void;
  timeout?: number;
}

export interface ToolResultProps {
  toolName: string;
  result: any;
  error?: string;
  loading?: boolean;
}

export interface ConversationListProps {
  conversations: Array<{
    id: string;
    name: string;
    lastMessage?: string;
    updatedAt: Date;
  }>;
  selectedId?: string;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
}

export interface ThemeContextType {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    text: string;
    textSecondary: string;
    background: string;
    border: string;
  };
  spacing: {
    small: number;
    medium: number;
    large: number;
  };
}

export type Theme = 'light' | 'dark' | 'auto';
