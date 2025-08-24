import { Agent, type AgentOptions } from '@chat-tools/agent';
import { LanguageModelV2Middleware, type LanguageModelV2 } from '@ai-sdk/provider';
import { ollama } from 'ollama-ai-provider-v2';
import { Storage, type StorageProvider, type Message, type Session } from '@chat-tools/storage';
import type { StreamTextResult, ToolSet } from 'ai';
import { ExtensionManager, type Extension } from '@chat-tools/extensions';
import { MCPManager, type MCPServerConfig } from './mcp-manager';

const systemPrompt = `
You are a helpful assistant that can check package versions, and provide information about npm packages. 
When asked about package versions, use the available tools to get the latest information.

You can:
- Check npm package versions and information
- Help with development tasks  
- Answer questions about packages and dependencies
- Execute commands with approval

Always be helpful and provide accurate, up-to-date information.
`;

export function getDefaultModel(): LanguageModelV2 {
    return ollama('qwen3:30b');
}

export async function getTools(): Promise<Record<string, any>> {
    const mcpManager = new MCPManager([
        {
            type: 'stdio',
            command: 'npx',
            args: ['@modelcontextprotocol/server-filesystem', '/tmp'],
            name: 'filesystem'
        }
    ]);

    await mcpManager.initialize();
    return mcpManager.getTools();
}

export async function createAgent() {
    const model = getDefaultModel();
    const tools = await getTools();
    return new Agent({
        systemPrompt,
        model,
        tools,
        generateTextOptions: {
        },
        streamTextOptions: {
        }
    });
}

export interface ChatOptions {
    name?: string;
    systemPrompt?: string;
    model?: LanguageModelV2;
    tools?: ToolSet;
    middlewares?: LanguageModelV2Middleware[];
    storage?: StorageProvider;
    dbPath?: string;
    agentOptions?: Partial<AgentOptions>;
    extensions?: Extension<Chat>[];
    mcpServers?: MCPServerConfig[];
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    toolCallId?: string;
    toolName?: string;
}

export class Chat {
    private agent?: Agent;
    private storage: StorageProvider;
    private tools: ToolSet = {};
    private model: LanguageModelV2;
    private systemPrompt: string;
    private agentOptions: Partial<AgentOptions>;
    private extensionManager: ExtensionManager<Chat>;
    private mcpManager: MCPManager;

    constructor(options: ChatOptions = {}) {
        this.systemPrompt = options.systemPrompt || systemPrompt;
        this.model = options.model || getDefaultModel();
        this.tools = options.tools || {};
        this.agentOptions = options.agentOptions || {};
        this.extensionManager = new ExtensionManager<Chat>();
        this.mcpManager = new MCPManager(options.mcpServers || []);

        this.storage = options.storage || (new Storage(options.dbPath || `./${options.name}.db`) as StorageProvider);

        if (options.extensions) {
            for (const extension of options.extensions) {
                this.extensionManager.register(extension);
            }
        }

    }

    private async initializeAgent(): Promise<void> {
        const extensionOptions = this.extensionManager.toAISDKOptions();

        this.agent = new Agent({
            systemPrompt: this.systemPrompt,
            model: this.model,
            tools: this.tools,
            ...this.agentOptions,
            middlewares: [...(this.agentOptions.middlewares || []), ...extensionOptions.middlewares],
            generateTextOptions: {
                ...this.agentOptions.generateTextOptions,
                ...extensionOptions.generateTextOptions
            },
            streamTextOptions: {
                ...this.agentOptions.streamTextOptions,
                ...extensionOptions.streamTextOptions
            }
        });
    }

    async initialize(): Promise<void> {
        await this.storage.initialize();

        // Initialize MCP servers and get tools
        await this.mcpManager.initialize();
        const mcpTools = this.mcpManager.getTools();

        // Merge provided tools with MCP tools
        this.tools = { ...this.tools, ...mcpTools };

        // Initialize extensions
        await this.extensionManager.init(this);

        // Create agent with final tools
        await this.initializeAgent();
    }

    async createSession(name: string, config?: Record<string, any>): Promise<string> {
        const sessionId = await this.storage.createSession(name, 'chat', config);
        return sessionId;
    }

    async loadSession(sessionId: string): Promise<Session | null> {
        const session = await this.storage.getSession(sessionId);
        return session;
    }

    async listSessions(): Promise<Session[]> {
        return this.storage.listSessions() as Promise<Session[]>;
    }

    async deleteSession(sessionId: string): Promise<void> {
        if (!sessionId) throw new Error('No session ID provided');
        await this.storage.deleteSession(sessionId);
    }

    async sendMessage(sessionId: string, content: string, metadata?: Record<string, any>): Promise<{
        response: string;
        responseId: string;
        usage?: any;
        toolCalls?: any[];
        steps?: any[];
    }> {
        if (!this.agent) {
            await this.initializeAgent();
        }

        // Save user message
        await this.storage.addMessage({
            sessionId,
            role: 'user',
            content,
            metadata: metadata || {},
        });

        // Get conversation history
        const history = await this.getSessionHistory(sessionId);

        try {
            const result = await this.agent!.generateTextResponse(content, history);

            // Save assistant response
            const responseId = await this.storage.addMessage({
                sessionId,
                role: 'assistant',
                content: result.text,
                metadata: {
                    usage: result.usage,
                    toolCalls: result.toolCalls || [],
                    steps: result.steps || [],
                },
            });

            return {
                response: result.text,
                responseId,
                usage: result.usage,
                toolCalls: result.toolCalls,
                steps: result.steps,
            };
        } catch (error) {
            console.error('Error generating response:', error);
            throw error;
        }
    }

    async streamMessage(sessionId: string, content: string, metadata?: Record<string, any>): Promise<{
        stream: StreamTextResult<ToolSet, unknown>;
        messageId: string;
    }> {
        if (!this.agent) {
            await this.initializeAgent();
        }

        // Save user message
        const userMessageId = await this.storage.addMessage({
            sessionId,
            role: 'user',
            content,
            metadata: metadata || {},
        });

        // Get conversation history
        const history = await this.getSessionHistory(sessionId);

        const stream = await this.agent!.streamTextResponse(content, history);

        return { stream, messageId: userMessageId };
    }

    async saveAssistantMessage(sessionId: string, content: string, metadata?: Record<string, any>): Promise<string> {
        return this.storage.addMessage({
            sessionId,
            role: 'assistant',
            content,
            metadata: metadata || {},
        });
    }

    async getSessionHistory(sessionId: string, limit?: number): Promise<Array<{ role: string; content: string }>> {
        const messages = await this.storage.getMessages(sessionId, { limit });
        return messages.map(msg => ({
            role: msg.role as string,
            content: msg.content
        }));
    }

    async getMessages(sessionId: string, options?: { limit?: number; offset?: number; before?: Date; after?: Date }): Promise<Message[]> {
        return this.storage.getMessages(sessionId, options) as Promise<Message[]>;
    }

    async searchMessages(query: string, sessionId?: string): Promise<Message[]> {
        return this.storage.searchMessages(query, sessionId) as Promise<Message[]>;
    }

    async updateTools(tools?: Record<string, any>): Promise<void> {
        if (tools) {
            this.tools = { ...this.tools, ...tools };

            // Reinitialize agent with new tools
            await this.initializeAgent();
        }
    }

    getTools(): Record<string, any> {
        return { ...this.tools };
    }

    setSystemPrompt(prompt: string): void {
        this.systemPrompt = prompt;
    }

    getSystemPrompt(): string {
        return this.systemPrompt;
    }

    setModel(model: LanguageModelV2): void {
        this.model = model;
    }

    getModel(): LanguageModelV2 {
        return this.model;
    }

    addMiddleware(middleware: LanguageModelV2Middleware): void {
        if (!this.agentOptions.middlewares) {
            this.agentOptions.middlewares = [];
        }
        this.agentOptions.middlewares.push(middleware);
    }

    getStorage(): StorageProvider {
        return this.storage;
    }

    getMCPManager(): MCPManager {
        return this.mcpManager;
    }

    getMCPTools(): Record<string, any> {
        return this.mcpManager.getTools();
    }

    async addTool(name: string, tool: any): Promise<void> {
        this.tools[name] = tool;
        // Reinitialize agent with new tools
        await this.initializeAgent();
    }

    async removeTool(name: string): Promise<void> {
        delete this.tools[name];
        // Reinitialize agent with updated tools
        await this.initializeAgent();
    }

    getExtensions(): Extension<Chat>[] {
        return this.extensionManager.getExtensions();
    }

    async close(): Promise<void> {
        await this.mcpManager.close();
        await this.storage.close();
    }
}
