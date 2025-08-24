import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, asc, like, and, lt, gt, sql } from "drizzle-orm";

import {
  sessions,
  messages,
  autoApprovedTools,
  type Session,
  type Message,
  type AutoApprovedTool,
} from "./schema";
import { StorageProvider, GetMessagesOptions } from "./types";

export class DrizzleStorage {
  private db;
  private sqlite;

  constructor(private dbPath: string) {
    this.sqlite = new Database(dbPath);
    this.db = drizzle(this.sqlite);
  }

  async initialize(): Promise<void> {
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        extension TEXT,
        config TEXT,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        role TEXT CHECK(role IN ('user', 'assistant', 'system', 'tool')) NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        timestamp INTEGER DEFAULT (unixepoch())
      );

      CREATE TABLE IF NOT EXISTS auto_approved_tools (
        id TEXT PRIMARY KEY,
        tool_name TEXT NOT NULL,
        auto_approved INTEGER DEFAULT 1,
        session_id TEXT REFERENCES sessions(id) ON DELETE CASCADE,
        timestamp INTEGER DEFAULT (unixepoch()),
        created_at INTEGER DEFAULT (unixepoch())
      );
    `);
  }

  async createSession(
    name: string,
    extension?: string,
    config?: Record<string, any>
  ): Promise<string> {
    const id = `session_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    await this.db.insert(sessions).values({
      id,
      name,
      extension,
      config,
    });

    return id;
  }

  async getSession(id: string): Promise<Session | null> {
    const result = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);

    if (!result[0]) return null;

    return {
      ...result[0],
      extension: result[0].extension || null,
      config: (result[0].config as Record<string, any>) || null,
      createdAt: result[0].createdAt || new Date(),
      updatedAt: result[0].updatedAt || new Date(),
    } as Session;
  }

  async listSessions(): Promise<Session[]> {
    const result = await this.db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.updatedAt));

    return result.map((session) => ({
      ...session,
      extension: session.extension || null,
      config: (session.config as Record<string, any>) || null,
      createdAt: session.createdAt || new Date(),
      updatedAt: session.updatedAt || new Date(),
    })) as Session[];
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<void> {
    await this.db
      .update(sessions)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, id));
  }

  async deleteSession(id: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, id));
  }

  async addMessage(
    message: Omit<Message, "id" | "timestamp">
  ): Promise<string> {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.db.insert(messages).values({
      id,
      ...message,
      metadata: message.metadata || null,
    });

    return id;
  }

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
      metadata: (result[0].metadata as Record<string, any>) || null,
    } as Message;
  }

  async getMessages(
    sessionId: string,
    options: GetMessagesOptions = {}
  ): Promise<Message[]> {
    const conditions = [eq(messages.sessionId, sessionId)];

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
      metadata: (msg.metadata as Record<string, any>) || null,
    })) as Message[];
  }

  async searchMessages(query: string, sessionId?: string): Promise<Message[]> {
    const conditions = [like(messages.content, `%${query}%`)];

    if (sessionId) {
      conditions.push(eq(messages.sessionId, sessionId));
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
      metadata: (msg.metadata as Record<string, any>) || null,
    })) as Message[];
  }

  async deleteMessage(id: string): Promise<void> {
    await this.db.delete(messages).where(eq(messages.id, id));
  }

  async addAutoApprovedTool(
    toolName: string,
    sessionId?: string
  ): Promise<string> {
    const id = sessionId
      ? `session_tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      : `global_tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.db.insert(autoApprovedTools).values({
      id,
      toolName,
      autoApproved: true,
      sessionId: sessionId || null,
    });

    return id;
  }

  async isToolAutoApproved(
    toolName: string,
    sessionId?: string
  ): Promise<boolean> {
    const globalResult = await this.db
      .select()
      .from(autoApprovedTools)
      .where(
        and(
          eq(autoApprovedTools.toolName, toolName),
          sql`${autoApprovedTools.sessionId} IS NULL`
        )
      )
      .limit(1);

    if (globalResult.length > 0) {
      return true;
    }

    if (sessionId) {
      const sessionResult = await this.db
        .select()
        .from(autoApprovedTools)
        .where(
          and(
            eq(autoApprovedTools.toolName, toolName),
            eq(autoApprovedTools.sessionId, sessionId)
          )
        )
        .limit(1);

      return sessionResult.length > 0;
    }

    return false;
  }

  async getAutoApprovedTools(sessionId?: string): Promise<AutoApprovedTool[]> {
    const condition = sessionId
      ? eq(autoApprovedTools.sessionId, sessionId)
      : sql`${autoApprovedTools.sessionId} IS NULL`;

    const result = await this.db
      .select()
      .from(autoApprovedTools)
      .where(condition)
      .orderBy(desc(autoApprovedTools.createdAt));

    return result.map((tool: any) => ({
      ...tool,
      timestamp: tool.timestamp || new Date(),
      createdAt: tool.createdAt || new Date(),
      sessionId: tool.sessionId || undefined,
    }));
  }

  async removeAutoApprovedTool(
    toolName: string,
    sessionId?: string
  ): Promise<void> {
    const conditions = [eq(autoApprovedTools.toolName, toolName)];

    if (sessionId) {
      conditions.push(eq(autoApprovedTools.sessionId, sessionId));
    } else {
      conditions.push(sql`${autoApprovedTools.sessionId} IS NULL`);
    }

    await this.db.delete(autoApprovedTools).where(and(...conditions));
  }

  async close(): Promise<void> {
    this.sqlite.close();
  }

  async saveMessage(
    message: Omit<Message, "id" | "timestamp">
  ): Promise<string> {
    return this.addMessage(message);
  }
}
