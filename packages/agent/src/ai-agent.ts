import { generateText, type ModelMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { ollama } from 'ollama-ai-provider-v2';
import type { ChatToolsConfig } from '@chat-tools/core';
import type { DrizzleStorage } from '@chat-tools/storage';
import { ApprovalManager } from './approval-manager';

export interface AgentMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
    metadata?: Record<string, any>;
}

export interface AgentResponse {
    content: string;
    toolCalls?: Array<{
        toolName: string;
        args: any;
    }>;
    toolResults?: Array<{
        toolName: string;
        toolCallId: string;
        result: any;
    }>;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export class AIAgent {
    private config: ChatToolsConfig;
    private storage: DrizzleStorage;
    private approvalManager: ApprovalManager;
    private conversationHistory: ModelMessage[] = [];

    constructor(config: ChatToolsConfig, storage: DrizzleStorage) {
        this.config = config;
        this.storage = storage;
        this.approvalManager = new ApprovalManager({
            storage
        });
    }

    async initialize(): Promise<void> {
        if (this.config.approval?.enabled) {
            await this.approvalManager.initialize();
        }
    }

    private getModel() {
        const { provider, model, apiKey, baseUrl } = this.config.ai;

        // Set environment variables if provided
        if (apiKey) {
            if (provider === 'openai') {
                process.env.OPENAI_API_KEY = apiKey;
            } else if (provider === 'anthropic') {
                process.env.ANTHROPIC_API_KEY = apiKey;
            }
        }

        if (baseUrl) {
            if (provider === 'openai' || provider === 'local') {
                process.env.OPENAI_BASE_URL = baseUrl;
            } else if (provider === 'ollama') {
                process.env.OLLAMA_HOST = baseUrl;
            }
        }

        switch (provider) {
            case 'openai':
            case 'local':
                return openai(model);
            case 'anthropic':
                return anthropic(model);
            case 'ollama':
                return ollama(model);
            default:
                throw new Error(`Unsupported AI provider: ${provider}`);
        }
    }

    private getTools() {
        // Tools should be provided by extensions, not implemented directly in the agent
        // This keeps the agent core clean and allows for flexible tool composition
        return {};
    }

    async generate(
        message: string,
        options?: {
            systemPrompt?: string;
            maxSteps?: number;
            saveToHistory?: boolean;
        }
    ): Promise<AgentResponse> {
        const userMessage: ModelMessage = {
            role: 'user',
            content: message,
        };

        // Add to conversation history if enabled
        if (options?.saveToHistory !== false) {
            this.conversationHistory.push(userMessage);
        }

        // Build messages array
        const messages: ModelMessage[] = [
            {
                role: 'system',
                content: options?.systemPrompt || this.config.agent?.systemPrompt || 'You are a helpful AI assistant.',
            },
            ...this.conversationHistory,
        ];

        try {
            const result = await generateText({
                model: this.getModel() as any,
                messages,
                temperature: this.config.ai.temperature,
            });

            // Save assistant response to history
            if (options?.saveToHistory !== false) {
                const assistantMessage: ModelMessage = {
                    role: 'assistant',
                    content: result.text,
                };
                this.conversationHistory.push(assistantMessage);
            }

            // Save to storage
            await this.saveMessage({
                role: 'user',
                content: message,
                timestamp: new Date(),
            });

            await this.saveMessage({
                role: 'assistant',
                content: result.text,
                timestamp: new Date(),
                metadata: {
                    usage: result.usage,
                    toolCalls: result.toolCalls || [],
                },
            });

            return {
                content: result.text,
                toolCalls: result.toolCalls?.map((call: any) => ({
                    toolName: call.toolName,
                    args: call.args,
                })) || [],
                toolResults: result.toolResults?.map((toolResult: any) => ({
                    toolName: toolResult.toolName,
                    toolCallId: toolResult.toolCallId,
                    result: toolResult.result,
                })) || [],
                usage: {
                    promptTokens: (result.usage as any)?.promptTokens || 0,
                    completionTokens: (result.usage as any)?.completionTokens || 0,
                    totalTokens: (result.usage as any)?.totalTokens || 0,
                },
            };
        } catch (error) {
            console.error('Error generating response:', error);
            throw error;
        }
    }

    async stream(
        message: string,
        options?: {
            systemPrompt?: string;
            maxSteps?: number;
            onChunk?: (chunk: string) => void;
            onToolCall?: (toolCall: any) => void;
        }
    ) {
        // Implementation would use streamText from AI SDK
        // For now, just delegate to generate
        return this.generate(message, options);
    }

    private async saveMessage(message: Omit<AgentMessage, 'id'>): Promise<void> {
        try {
            await (this.storage as any).saveMessage({
                role: message.role,
                content: message.content,
                timestamp: message.timestamp || new Date(),
                metadata: message.metadata,
            });
        } catch (error) {
            console.error('Error saving message:', error);
        }
    }

    clearHistory(): void {
        this.conversationHistory = [];
    }

    getHistory(): ModelMessage[] {
        return [...this.conversationHistory];
    }

    async cleanup(): Promise<void> {
        try {
            this.clearHistory();
            if (this.approvalManager) {
                await (this.approvalManager as any).cleanup?.();
            }
        } catch (error) {
            console.error('Error during agent cleanup:', error);
        }
    }
}
