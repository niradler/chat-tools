import { Agent, type AgentOptions } from './agent';
import { LanguageModelV2Middleware, type LanguageModelV2 } from '@ai-sdk/provider';
import { ollama } from 'ollama-ai-provider-v2';
import { Storage, type StorageProvider, type Message, type Session } from '@chat-tools/storage';
import type { StreamTextResult, ToolSet } from 'ai';
import { ExtensionManager, type Extension } from './extensions';
import { MCPManager, type MCPServerConfig } from './mcp-manager';

const systemPrompt = `
You are a helpful assistant that can check package versions, and provide information about npm packages. 
When asked about package versions, use the available tools to get the latest information.
`;

export function getDefaultModel(): LanguageModelV2 {
    return ollama('qwen3:30b');
}

export async function getTools(): Promise<Record<string, any>> {
    const mcpManager = new MCPManager([
        {
            type: 'stdio',
            command: 'npx',
            args: ['-y', 'dependency-mcp'],
            name: 'dependency-checker'
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
            providerOptions: { ollama: { think: true } }
        },
        streamTextOptions: {
            providerOptions: { ollama: { think: true } }
        }
    });
}

// Example logging middleware
export const loggingMiddleware: LanguageModelV2Middleware = {
    wrapGenerate: async ({ doGenerate, params }: any) => {
        console.log('🤖 Generate called');
        const result = await doGenerate();
        console.log(`✅ Generated ${result.text?.length || 0} characters`);
        return result;
    },
};

export interface ChatOptions {
    name?: string;
    systemPrompt?: string;
    model?: LanguageModelV2;
    tools?: ToolSet;
    middlewares?: LanguageModelV2Middleware[];
    storage?: StorageProvider;
    dbPath?: string;
    agentOptions?: Partial<AgentOptions>;
    extensions?: Extension[];
    mcpServers?: MCPServerConfig[];
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    metadata?: Record<string, any>;
}

export class Chat {
    private agent?: Agent;
    private storage: StorageProvider;
    private tools: ToolSet = {};
    private model: LanguageModelV2;
    private systemPrompt: string;
    private agentOptions: Partial<AgentOptions>;
    private extensionManager: ExtensionManager;
    private mcpManager: MCPManager;

    constructor(options: ChatOptions = {}) {
        this.systemPrompt = options.systemPrompt || systemPrompt;
        this.model = options.model || getDefaultModel();
        this.tools = options.tools || {};
        this.agentOptions = options.agentOptions || {};
        this.extensionManager = new ExtensionManager();
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

        // Initialize extensions first
        await this.extensionManager.init(this);

        // Wrap tools with approval system if approval extension is present
        this.wrapToolsWithApprovalExtension();

        // Initialize the agent with current tools
        await this.initializeAgent();
    }

    async createSession(name: string, config?: Record<string, any>): Promise<string> {
        const sessionId = await this.storage.createSession(name, 'chat', config);
        return sessionId;
    }

    async loadSession(sessionId: string): Promise<Session | null> {
        const session = await this.storage.getSession(sessionId);
        return session as Session | null;
    }

    async listSessions(): Promise<Session[]> {
        return this.storage.listSessions() as Promise<Session[]>;
    }

    async deleteSession(sessionId: string): Promise<void> {
        if (!sessionId) throw new Error('No session ID provided');
        await this.storage.deleteSession(sessionId);
    }

    // Message Management
    async sendMessage(sessionId: string, content: string, metadata?: Record<string, any>): Promise<{
        response: string;
        messageId: string;
        responseId: string;
    }> {
        const messageId = await this.storage.addMessage({
            sessionId,
            role: 'user',
            content,
            metadata
        });

        const history = await this.getSessionHistory(sessionId);

        if (!this.agent) {
            throw new Error('Agent not initialized. Call initialize() first.');
        }

        const result = await this.agent.generateTextResponse(content, history);
        const response = result.text || '';

        const responseId = await this.storage.addMessage({
            sessionId,
            role: 'assistant',
            content: response,
            metadata: {
                model: this.model.modelId || 'unknown',
                tokens: result.usage?.totalTokens,
                finishReason: result.finishReason
            }
        });

        return { response, messageId, responseId };
    }

    async streamMessage(sessionId: string, content: string, metadata?: Record<string, any>): Promise<{
        stream: StreamTextResult<ToolSet, unknown>;
        messageId: string;
    }> {
        // Save user message
        const messageId = await this.storage.addMessage({
            sessionId,
            role: 'user',
            content,
            metadata
        });

        // Get session history
        const history = await this.getSessionHistory(sessionId);

        if (!this.agent) {
            throw new Error('Agent not initialized. Call initialize() first.');
        }

        const stream = await this.agent.streamTextResponse(content, history);

        return { stream, messageId };
    }

    async saveAssistantMessage(sessionId: string, content: string, metadata?: Record<string, any>): Promise<string> {
        return this.storage.addMessage({
            sessionId,
            role: 'assistant',
            content,
            metadata
        });
    }

    async getSessionHistory(sessionId: string, limit?: number): Promise<Array<{ role: string; content: string }>> {
        const messages = await this.storage.getMessages(sessionId, { limit });
        return messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    }

    async getMessages(sessionId: string, options?: { limit?: number; offset?: number; before?: Date; after?: Date }): Promise<Message[]> {
        return this.storage.getMessages(sessionId, options) as Promise<Message[]>;
    }

    async searchMessages(query: string, sessionId?: string): Promise<Message[]> {
        return this.storage.searchMessages(query, sessionId) as Promise<Message[]>;
    }

    // Tool Management
    async updateTools(tools?: Record<string, any>): Promise<void> {
        if (tools) {
            this.tools = tools;
        }

        // Recreate agent with new tools
        this.agent = new Agent({
            systemPrompt: this.systemPrompt,
            model: this.model,
            tools: this.tools,
            ...this.agentOptions
        });
    }

    getTools(): Record<string, any> {
        return { ...this.tools };
    }

    // Model Management
    setModel(model: LanguageModelV2): void {
        this.model = model;
        this.agent = new Agent({
            systemPrompt: this.systemPrompt,
            model: this.model,
            tools: this.tools,
            ...this.agentOptions
        });
    }

    getModel(): LanguageModelV2 {
        return this.model;
    }

    // System Prompt Management
    setSystemPrompt(prompt: string): void {
        this.systemPrompt = prompt;
        this.agent = new Agent({
            systemPrompt: this.systemPrompt,
            model: this.model,
            tools: this.tools,
            ...this.agentOptions
        });
    }

    getSystemPrompt(): string {
        return this.systemPrompt;
    }

    getStorage(): StorageProvider {
        return this.storage;
    }


    addMCPServer(config: MCPServerConfig): void {
        this.mcpManager.addServer(config);
    }

    getMCPTools(): Record<string, any> {
        return this.mcpManager.getTools();
    }

    private wrapToolsWithApprovalExtension(): void {
        // Find approval extension
        const approvalExtension = this.extensionManager.getExtensions().find(
            ext => ext.name === 'approval-extension'
        ) as any;

        if (approvalExtension && approvalExtension.wrapTools) {
            this.tools = approvalExtension.wrapTools(this.tools);
        }
    }

    async addTool(name: string, tool: any): Promise<void> {
        this.tools[name] = tool;
        this.wrapToolsWithApprovalExtension();
        await this.initializeAgent();
    }

    async removeTool(name: string): Promise<void> {
        delete this.tools[name];
        await this.initializeAgent();
    }



    getExtensions(): Extension[] {
        return this.extensionManager.getExtensions();
    }

    async close(): Promise<void> {
        await this.mcpManager.close();
        await this.storage.close();
    }
}

// Usage Example
async function main() {
    console.log('🚀 Testing Chat Class\n');

    // Import extension classes using default exports
    const LoggingExtension = (await import('./logging-extension')).default;
    const ApprovalExtension = (await import('./approval-extension')).default;
    const { CLIApprovalStrategy } = await import('./approval-strategies');

    // Create extension instances
    const loggingExtension = new LoggingExtension();
    const approvalExtension = new ApprovalExtension({
        strategy: new CLIApprovalStrategy()
    });

    // Create a new chat instance with extensions and MCP servers
    const chat = new Chat({
        name: 'Test Chat',
        dbPath: './test-chat.db',
        agentOptions: {
            generateTextOptions: {
                providerOptions: { ollama: { think: true } }
            },
            streamTextOptions: {
                providerOptions: { ollama: { think: true } }
            }
        },
        extensions: [loggingExtension, approvalExtension],
        mcpServers: [
            {
                type: 'stdio',
                command: 'npx',
                args: ['-y', 'dependency-mcp'],
                name: 'dependency-checker'
            }
        ]
    });

    // Initialize the chat (sets up storage and loads tools)
    await chat.initialize();

    console.log('--- Basic Chat Interaction with Approval System ---');

    const sessionId = await chat.createSession('Test Session');
    console.log('📋 Note: Tool executions will require approval (CLI prompts)\n');

    const result1 = await chat.sendMessage(sessionId, 'What is the latest version of React?');
    console.log('User:', 'What is the latest version of React?');
    console.log('Assistant:', result1.response.substring(0, 200) + '...\n');

    const result2 = await chat.sendMessage(sessionId, 'Can you also check TypeScript?');
    console.log('User:', 'Can you also check TypeScript?');
    console.log('Assistant:', result2.response.substring(0, 200) + '...\n');

    console.log('--- Session Management ---');

    const sessions = await chat.listSessions();
    console.log('Total sessions:', sessions.length);

    const currentSession = await chat.loadSession(sessionId);
    console.log('Current session:', currentSession?.name);

    const history = await chat.getSessionHistory(sessionId);
    console.log('Messages in session:', history.length);

    console.log('--- Approval System Status ---');

    // Access approval extension directly if needed
    const approvalExt = chat.getExtensions().find(ext => ext.name === 'approval-extension') as any;
    if (approvalExt) {
        const globalTools = await approvalExt.getAutoApprovedTools(undefined, 'global');
        const sessionTools = await approvalExt.getAutoApprovedTools(sessionId, 'session');

        console.log('Global auto-approved tools:', globalTools.map((t: any) => t.toolName));
        console.log('Session auto-approved tools:', sessionTools.map((t: any) => t.toolName));
    } else {
        console.log('No approval extension installed');
    }

    console.log('--- Search Messages ---');

    const searchResults = await chat.searchMessages('React', sessionId);
    console.log('Messages containing "React" in this session:', searchResults.length);

    const globalSearchResults = await chat.searchMessages('React');
    console.log('Messages containing "React" globally:', globalSearchResults.length);

    console.log('--- Streaming Example ---');

    const streamingSessionId = await chat.createSession('Streaming Test');

    const { stream } = await chat.streamMessage(streamingSessionId, 'Tell me about Node.js');
    console.log('User:', 'Tell me about Node.js');
    console.log('Assistant (streaming):');

    for await (const chunk of stream.textStream) {
        process.stdout.write(chunk);
    }
    console.log('\n');

    // Clean up
    await chat.close();
    console.log('\n✅ Chat test completed');
}

if (require.main === module) {
    main().catch(console.error);
}

export { main };
