export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata?: Record<string, any> | null;
  timestamp: Date | null;
}

export interface Conversation {
  id: string;
  name: string;
  extension?: string | null;
  config?: Record<string, any> | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ApprovalRecord {
  id: string;
  toolName: string;
  params: Record<string, any> | null;
  action: 'approved' | 'denied' | 'timeout' | 'whitelisted';
  timestamp: Date | null;
  conversationId?: string | null;
}

export interface WhitelistRule {
  id: string;
  pattern: string;
  type: 'exact' | 'regex' | 'startsWith';
  description: string | null;
  usageCount: number | null;
  createdAt: Date | null;
}

export interface GetMessagesOptions {
  limit?: number;
  offset?: number;
  before?: Date;
  after?: Date;
}

export interface StorageProvider {
  // Initialization
  initialize(): Promise<void>;

  // Conversations
  createConversation(name: string, extension?: string, config?: Record<string, any>): Promise<string>;
  getConversation(id: string): Promise<Conversation | null>;
  listConversations(): Promise<Conversation[]>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<void>;
  deleteConversation(id: string): Promise<void>;

  // Messages
  addMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<string>;
  saveMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<string>;
  getMessage(id: string): Promise<Message | null>;
  getMessages(conversationId: string, options?: GetMessagesOptions): Promise<Message[]>;
  searchMessages(query: string, conversationId?: string): Promise<Message[]>;
  deleteMessage(id: string): Promise<void>;

  // Approval & Whitelist
  saveApproval(approval: Omit<ApprovalRecord, 'id' | 'timestamp'>): Promise<string>;
  getApprovalHistory(limit?: number): Promise<ApprovalRecord[]>;
  addWhitelistRule(rule: Omit<WhitelistRule, 'id' | 'createdAt' | 'usageCount'>): Promise<string>;
  getWhitelistRules(): Promise<WhitelistRule[]>;
  checkWhitelist(command: string): Promise<WhitelistRule | null>;
  updateWhitelistUsage(ruleId: string): Promise<void>;
  deleteWhitelistRule(id: string): Promise<void>;

  // Settings
  getSetting<T = any>(key: string): Promise<T | null>;
  setSetting<T = any>(key: string, value: T): Promise<void>;
  deleteSetting(key: string): Promise<void>;

  // Database management
  close(): Promise<void>;
  backup(path: string): Promise<void>;
  migrate(): Promise<void>;
}
