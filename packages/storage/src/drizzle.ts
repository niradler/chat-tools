import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { eq, desc, asc, like, and, or, lt, gt, sql } from 'drizzle-orm';
import type { SQLiteSelect } from 'drizzle-orm/sqlite-core';
import {
  conversations,
  messages,
  approvalHistory,
  whitelistRules,
  settings,
  type Conversation,
  type NewConversation,
  type Message,
  type NewMessage,
  type ApprovalRecord,
  type NewApprovalRecord,
  type WhitelistRule,
  type NewWhitelistRule
} from './schema';
import { StorageProvider, GetMessagesOptions } from './types';

// @ts-ignore - Complex type mismatch between Drizzle schema and interface
export class DrizzleStorage implements StorageProvider {
  private db;
  private sqlite;

  constructor(private dbPath: string) {
    this.sqlite = new Database(dbPath);
    this.db = drizzle(this.sqlite);
  }

  async initialize(): Promise<void> {
    // Create tables if they don't exist
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        extension TEXT,
        config TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role TEXT CHECK(role IN ('user', 'assistant', 'system', 'tool')) NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        timestamp INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS approval_history (
        id TEXT PRIMARY KEY,
        conversation_id TEXT REFERENCES conversations(id) ON DELETE SET NULL,
        tool_name TEXT NOT NULL,
        params TEXT NOT NULL,
        decision TEXT CHECK(decision IN ('approved', 'denied')) NOT NULL,
        auto_approved INTEGER DEFAULT 0,
        timestamp INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS whitelist_rules (
        id TEXT PRIMARY KEY,
        pattern TEXT NOT NULL UNIQUE,
        type TEXT CHECK(type IN ('exact', 'regex', 'startsWith')) NOT NULL,
        description TEXT,
        usage_count INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at INTEGER DEFAULT (unixepoch())
      );
    `);
  }

  // Conversations
  async createConversation(name: string, extension?: string, config?: Record<string, any>): Promise<string> {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.db.insert(conversations).values({
      id,
      name,
      extension,
      config,
    });

    return id;
  }

  // @ts-ignore
  async getConversation(id: string): Promise<Conversation | null> {
    const result = await this.db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1);

    if (!result[0]) return null;

    return {
      ...result[0],
      extension: result[0].extension || undefined,
      config: (result[0].config as Record<string, any>) || undefined,
      createdAt: result[0].createdAt || new Date(),
      updatedAt: result[0].updatedAt || new Date()
    } as Conversation;
  }

  // @ts-ignore
  async listConversations(): Promise<Conversation[]> {
    const result = await this.db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.updatedAt));

    return result.map(conv => ({
      ...conv,
      extension: conv.extension || undefined,
      config: (conv.config as Record<string, any>) || undefined,
      createdAt: conv.createdAt || new Date(),
      updatedAt: conv.updatedAt || new Date()
    })) as Conversation[];
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<void> {
    await this.db
      .update(conversations)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(conversations.id, id));
  }

  async deleteConversation(id: string): Promise<void> {
    await this.db
      .delete(conversations)
      .where(eq(conversations.id, id));
  }

  // Messages
  // @ts-ignore
  async addMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<string> {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.db.insert(messages).values({
      id,
      ...message,
      metadata: message.metadata || null
    } as any);

    return id;
  }

  // @ts-ignore
  async getMessage(id: string): Promise<Message | null> {
    const result = await this.db
      .select()
      .from(messages)
      .where(eq(messages.id, id))
      .limit(1);

    if (!result[0]) return null;

    return {
      ...result[0],
      timestamp: result[0].timestamp || new Date(),
      metadata: (result[0].metadata as Record<string, any>) || undefined
    } as Message;
  }

  // @ts-ignore
  async getMessages(conversationId: string, options: GetMessagesOptions = {}): Promise<Message[]> {
    // Add filters
    const conditions = [eq(messages.conversationId, conversationId)];

    if (options.before) {
      conditions.push(lt(messages.timestamp, options.before));
    }
    if (options.after) {
      conditions.push(gt(messages.timestamp, options.after));
    }

    let query: any = this.db
      .select()
      .from(messages)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(asc(messages.timestamp));

    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.offset(options.offset);
    }

    const result = await query;
    return result.map((msg: any) => ({
      ...msg,
      timestamp: msg.timestamp || new Date(),
      metadata: (msg.metadata as Record<string, any>) || undefined
    })) as Message[];
  }

  // @ts-ignore
  async searchMessages(query: string, conversationId?: string): Promise<Message[]> {
    const conditions = [like(messages.content, `%${query}%`)];

    if (conversationId) {
      conditions.push(eq(messages.conversationId, conversationId));
    }

    const dbQuery = this.db
      .select()
      .from(messages)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(messages.timestamp));

    const result = await dbQuery;
    return result.map((msg: any) => ({
      ...msg,
      timestamp: msg.timestamp || new Date(),
      metadata: (msg.metadata as Record<string, any>) || undefined
    })) as Message[];
  }

  async deleteMessage(id: string): Promise<void> {
    await this.db
      .delete(messages)
      .where(eq(messages.id, id));
  }

  // Approval & Whitelist
  // @ts-ignore
  async saveApproval(approval: Omit<ApprovalRecord, 'id' | 'timestamp'>): Promise<string> {
    const id = `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.db.insert(approvalHistory).values({
      id,
      ...approval,
      conversationId: approval.conversationId || null,
      params: approval.params || {}
    } as any);

    return id;
  }

  // @ts-ignore
  async getApprovalHistory(limit = 100): Promise<ApprovalRecord[]> {
    const result = await this.db
      .select()
      .from(approvalHistory)
      .orderBy(desc(approvalHistory.timestamp))
      .limit(limit);

    return result.map((record: any) => ({
      ...record,
      params: (record.params as Record<string, any>) || {},
      timestamp: record.timestamp || new Date(),
      conversationId: record.conversationId || undefined
    })) as ApprovalRecord[];
  }

  async addWhitelistRule(rule: Omit<WhitelistRule, 'id' | 'createdAt' | 'usageCount'>): Promise<string> {
    const id = `whitelist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.db.insert(whitelistRules).values({
      id,
      ...rule,
      description: rule.description || null,
      usageCount: 0
    } as any);

    return id;
  }

  async getWhitelistRules(): Promise<WhitelistRule[]> {
    const result = await this.db
      .select()
      .from(whitelistRules)
      .orderBy(desc(whitelistRules.createdAt));

    return result.map((rule: any) => ({
      ...rule,
      description: rule.description || '',
      usageCount: rule.usageCount || 0,
      createdAt: rule.createdAt || new Date()
    })) as WhitelistRule[];
  }

  async checkWhitelist(command: string): Promise<WhitelistRule | null> {
    const rules = await this.getWhitelistRules();

    for (const rule of rules) {
      let matches = false;

      switch (rule.type) {
        case 'exact':
          matches = command === rule.pattern;
          break;
        case 'startsWith':
          matches = command.startsWith(rule.pattern);
          break;
        case 'regex':
          try {
            const regex = new RegExp(rule.pattern);
            matches = regex.test(command);
          } catch {
            continue;
          }
          break;
      }

      if (matches) {
        await this.updateWhitelistUsage(rule.id);
        return {
          ...rule,
          description: rule.description || '',
          usageCount: rule.usageCount || 0,
          createdAt: rule.createdAt || new Date()
        } as WhitelistRule;
      }
    }

    return null;
  }

  async updateWhitelistUsage(ruleId: string): Promise<void> {
    await this.db
      .update(whitelistRules)
      .set({ usageCount: sql`${whitelistRules.usageCount} + 1` })
      .where(eq(whitelistRules.id, ruleId));
  }

  async deleteWhitelistRule(id: string): Promise<void> {
    await this.db
      .delete(whitelistRules)
      .where(eq(whitelistRules.id, id));
  }

  // Settings
  async getSetting<T = any>(key: string): Promise<T | null> {
    const result = await this.db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    return (result[0]?.value as T) || null;
  }

  async setSetting<T = any>(key: string, value: T): Promise<void> {
    await this.db
      .insert(settings)
      .values({
        key,
        value,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: settings.key,
        set: {
          value,
          updatedAt: new Date(),
        },
      });
  }

  async deleteSetting(key: string): Promise<void> {
    await this.db
      .delete(settings)
      .where(eq(settings.key, key));
  }

  // Database management
  async close(): Promise<void> {
    this.sqlite.close();
  }



  async migrate(): Promise<void> {
    // Migrations are handled by drizzle-kit
    // This method can be used for custom migration logic if needed
  }

  // Alias for addMessage to support existing code
  // @ts-ignore
  async saveMessage(message: Omit<Message, 'id' | 'timestamp'>): Promise<string> {
    return this.addMessage(message);
  }
}
