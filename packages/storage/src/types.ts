export interface Message {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata?: Record<string, any> | null;
  timestamp: Date | null;
}

export interface Session {
  id: string;
  name: string;
  extension: string | null;
  config: Record<string, any> | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface AutoApprovedTool {
  id: string;
  toolName: string;
  autoApproved: boolean;
  sessionId?: string | null;
  timestamp: Date | null;
  createdAt: Date | null;
}

export interface GetMessagesOptions {
  limit?: number;
  offset?: number;
  before?: Date;
  after?: Date;
}

export interface StorageProvider {
  initialize(): Promise<void>;

  createSession(name: string, extension?: string, config?: Record<string, any>): Promise<string>;
  getSession(id: string): Promise<Session | null>;
  listSessions(): Promise<Session[]>;
  updateSession(id: string, updates: Partial<Session>): Promise<void>;
  deleteSession(id: string): Promise<void>;

  addMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<string>;
  saveMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<string>;
  getMessage(id: string): Promise<Message | null>;
  getMessages(sessionId: string, options?: GetMessagesOptions): Promise<Message[]>;
  searchMessages(query: string, sessionId?: string): Promise<Message[]>;
  deleteMessage(id: string): Promise<void>;

  addAutoApprovedTool(toolName: string, sessionId?: string): Promise<string>;
  isToolAutoApproved(toolName: string, sessionId?: string): Promise<boolean>;
  getAutoApprovedTools(sessionId?: string): Promise<AutoApprovedTool[]>;
  removeAutoApprovedTool(toolName: string, sessionId?: string): Promise<void>;

  close(): Promise<void>;
}
