import type { Extension } from '@chat-tools/extensions';
import type { Chat } from '@chat-tools/core';
import { ApprovalManager, type ApprovalStrategy } from './approval-manager';
import type { Storage } from '@chat-tools/storage';

export interface ApprovalExtensionConfig {
    strategy: ApprovalStrategy;
}

export default class ApprovalExtension implements Extension<Chat> {
    name = 'approval-extension';
    version = '1.0.0';
    description = 'Adds approval mechanism for tool calls';
    private approvalManager!: ApprovalManager;
    private chat!: Chat;

    constructor(private config: ApprovalExtensionConfig) { }

    async init(chatInstance: Chat) {
        this.chat = chatInstance;
        const storage = this.chat.getStorage() as Storage;

        this.approvalManager = new ApprovalManager({
            storage,
            strategy: this.config.strategy
        });

        await this.approvalManager.initialize();
    }

    async transformParams({ type, params, model }: any) {
        // The approval system will be handled at the tool execution level
        // through the AI SDK's tool calling mechanism
        return params;
    }

    wrapTools(tools: Record<string, any>): Record<string, any> {
        const wrappedTools: Record<string, any> = {};

        for (const [toolName, tool] of Object.entries(tools)) {
            wrappedTools[toolName] = {
                ...tool,
                execute: async (parameters: any, options?: any) => {
                    // Extract sessionId from options if available
                    const sessionId = options?.sessionId;

                    const approved = await this.approvalManager.shouldApprove(
                        toolName,
                        parameters,
                        sessionId,
                        { type: 'tool-execution' }
                    );

                    if (!approved) {
                        throw new Error(`Tool execution denied: ${toolName}`);
                    }

                    // Call original tool with proper signature
                    if (tool.execute) {
                        return tool.execute(parameters, options || {
                            toolCallId: 'approval-wrapped',
                            messages: []
                        });
                    }

                    throw new Error(`Tool ${toolName} has no execute function`);
                }
            };
        }

        return wrappedTools;
    }

    async getAutoApprovedTools(sessionId?: string, scope?: 'global' | 'session'): Promise<any[]> {
        return this.approvalManager.getAutoApprovedTools(sessionId, scope);
    }

    async removeAutoApprovedTool(toolName: string, sessionId?: string, scope?: 'global' | 'session'): Promise<void> {
        return this.approvalManager.removeAutoApprovedTool(toolName, sessionId, scope);
    }
}
