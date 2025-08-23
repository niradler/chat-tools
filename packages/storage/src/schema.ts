import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  extension: text('extension'),
  config: text('config', { mode: 'json' }), // JSON mode for objects
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant', 'system', 'tool'] }).notNull(),
  content: text('content').notNull(),
  metadata: text('metadata', { mode: 'json' }),
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const approvalHistory = sqliteTable('approval_history', {
  id: text('id').primaryKey(),
  toolName: text('tool_name').notNull(),
  params: text('params', { mode: 'json' }).notNull(),
  action: text('action', { enum: ['approved', 'denied', 'timeout', 'whitelisted'] }).notNull(),
  conversationId: text('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
  timestamp: integer('timestamp', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const whitelistRules = sqliteTable('whitelist_rules', {
  id: text('id').primaryKey(),
  pattern: text('pattern').notNull().unique(),
  type: text('type', { enum: ['exact', 'regex', 'startsWith'] }).notNull(),
  description: text('description'),
  usageCount: integer('usage_count').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
});

// Type exports for better DX
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type ApprovalRecord = typeof approvalHistory.$inferSelect;
export type NewApprovalRecord = typeof approvalHistory.$inferInsert;
export type WhitelistRule = typeof whitelistRules.$inferSelect;
export type NewWhitelistRule = typeof whitelistRules.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
