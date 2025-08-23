import { Agent } from './agent';
import { LanguageModelV2Middleware, type LanguageModelV2 } from '@ai-sdk/provider';
import { experimental_createMCPClient as createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio';
import { ollama } from 'ollama-ai-provider-v2';
import { Storage, type StorageProvider, type SchemaMessage as Message, type SchemaConversation as Conversation } from '@chat-tools/storage';
import type { StreamTextResult, ToolSet } from 'ai';

const systemPrompt = `
You are a helpful assistant that can check package versions, and provide information about npm packages. 
When asked about package versions, use the available tools to get the latest information.
`;

export function getModel(): LanguageModelV2 {
    return ollama('qwen3:30b');
}

export async function getTools(): Promise<Record<string, any>> {
    try {
        let command = 'npx';
        let args = ['-y', 'dependency-mcp'];

        if (process.platform === 'win32') {
            command = 'cmd';
            args = ['/c', 'npx', '-y', 'dependency-mcp'];
        }

        const mcpClient = await createMCPClient({
            transport: new StdioMCPTransport({
                command,
                args,
            }),
        });
        const tools = await mcpClient.tools();
        return tools;
    } catch (error) {
        console.error('Failed to initialize MCP tools:', error);
        // Return empty tools object as fallback
        return {};
    }
}

export async function createAgent() {
    const model = getModel();
    const tools = await getTools();
    return new Agent({
        systemPrompt,
        model,
        tools
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
    tools?: Record<string, any>;
    middlewares?: LanguageModelV2Middleware[];
    storage?: StorageProvider;
    dbPath?: string;
    conversationId?: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    metadata?: Record<string, any>;
}

export class Chat {
    private agent: Agent;
    private storage: StorageProvider;
    private conversationId: string | null = null;
    private middlewares: LanguageModelV2Middleware[] = [];
    private tools: Record<string, any> = {};
    private model: LanguageModelV2;
    private systemPrompt: string;

    constructor(options: ChatOptions = {}) {
        this.systemPrompt = options.systemPrompt || systemPrompt;
        this.model = options.model || getModel();
        this.tools = options.tools || {};
        this.middlewares = options.middlewares || [];

        // Initialize storage
        this.storage = options.storage || (new Storage(options.dbPath || './chat.db') as StorageProvider);

        // Initialize agent
        this.agent = new Agent({
            systemPrompt: this.systemPrompt,
            model: this.model,
            tools: this.tools,
            middlewares: this.middlewares
        });

        // Set conversation ID if provided
        this.conversationId = options.conversationId || null;
    }

    async initialize(): Promise<void> {
        await this.storage.initialize();

        // Load tools if not provided
        if (Object.keys(this.tools).length === 0) {
            this.tools = await getTools();
            this.agent = new Agent({
                systemPrompt: this.systemPrompt,
                model: this.model,
                tools: this.tools,
                middlewares: this.middlewares
            });
        }
    }

    // Conversation Management
    async createConversation(name: string, config?: Record<string, any>): Promise<string> {
        const conversationId = await this.storage.createConversation(name, 'chat', config);
        this.conversationId = conversationId;
        return conversationId;
    }

    async loadConversation(conversationId: string): Promise<Conversation | null> {
        const conversation = await this.storage.getConversation(conversationId);
        if (conversation) {
            this.conversationId = conversationId;
        }
        return conversation as Conversation | null;
    }

    async listConversations(): Promise<Conversation[]> {
        return this.storage.listConversations() as Promise<Conversation[]>;
    }

    async deleteConversation(conversationId?: string): Promise<void> {
        const id = conversationId || this.conversationId;
        if (!id) throw new Error('No conversation ID provided');

        await this.storage.deleteConversation(id);
        if (id === this.conversationId) {
            this.conversationId = null;
        }
    }

    // Message Management
    async sendMessage(content: string, metadata?: Record<string, any>): Promise<{
        response: string;
        messageId: string;
        responseId: string;
    }> {
        if (!this.conversationId) {
            this.conversationId = await this.createConversation('New Chat');
        }

        // Save user message
        const messageId = await this.storage.addMessage({
            conversationId: this.conversationId,
            role: 'user',
            content,
            metadata
        });

        // Get conversation history
        const history = await this.getConversationHistory();

        // Generate response using agent
        const result = await this.agent.generateTextResponse(content, history);
        const response = result.text || '';

        // Save assistant response
        const responseId = await this.storage.addMessage({
            conversationId: this.conversationId,
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

    async streamMessage(content: string, metadata?: Record<string, any>): Promise<{
        stream: StreamTextResult<ToolSet, unknown>;
        messageId: string;
    }> {
        if (!this.conversationId) {
            this.conversationId = await this.createConversation('New Chat');
        }

        // Save user message
        const messageId = await this.storage.addMessage({
            conversationId: this.conversationId,
            role: 'user',
            content,
            metadata
        });

        // Get conversation history
        const history = await this.getConversationHistory();

        // Generate streaming response using agent
        const stream = await this.agent.streamTextResponse(content, history);

        return { stream, messageId };
    }

    async saveAssistantMessage(content: string, metadata?: Record<string, any>): Promise<string> {
        if (!this.conversationId) {
            throw new Error('No active conversation');
        }

        return this.storage.addMessage({
            conversationId: this.conversationId,
            role: 'assistant',
            content,
            metadata
        });
    }

    async getConversationHistory(limit?: number): Promise<Array<{ role: string; content: string }>> {
        if (!this.conversationId) return [];

        const messages = await this.storage.getMessages(this.conversationId, { limit });
        return messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    }

    async getMessages(options?: { limit?: number; offset?: number; before?: Date; after?: Date }): Promise<Message[]> {
        if (!this.conversationId) return [];
        return this.storage.getMessages(this.conversationId, options) as Promise<Message[]>;
    }

    async searchMessages(query: string): Promise<Message[]> {
        return this.storage.searchMessages(query, this.conversationId || undefined) as Promise<Message[]>;
    }

    // Middleware Management
    addMiddleware(middleware: LanguageModelV2Middleware): void {
        this.middlewares.push(middleware);
        this.agent.addMiddleware(middleware);
    }

    setMiddlewares(middlewares: LanguageModelV2Middleware[]): void {
        this.middlewares = middlewares;
        this.agent.setMiddlewares(middlewares);
    }

    getMiddlewares(): LanguageModelV2Middleware[] {
        return [...this.middlewares];
    }

    // Tool Management
    async updateTools(tools?: Record<string, any>): Promise<void> {
        if (tools) {
            this.tools = tools;
        } else {
            this.tools = await getTools();
        }

        // Recreate agent with new tools
        this.agent = new Agent({
            systemPrompt: this.systemPrompt,
            model: this.model,
            tools: this.tools,
            middlewares: this.middlewares
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
            middlewares: this.middlewares
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
            middlewares: this.middlewares
        });
    }

    getSystemPrompt(): string {
        return this.systemPrompt;
    }

    // Storage Access
    getStorage(): StorageProvider {
        return this.storage;
    }

    // Current State
    getCurrentConversationId(): string | null {
        return this.conversationId;
    }

    async getCurrentConversation(): Promise<Conversation | null> {
        if (!this.conversationId) return null;
        return this.storage.getConversation(this.conversationId) as Promise<Conversation | null>;
    }

    // Cleanup
    async close(): Promise<void> {
        await this.storage.close();
    }
}

// Usage Example
async function main() {
    console.log('🚀 Testing Chat Class\n');

    // Create a new chat instance
    const chat = new Chat({
        name: 'Test Chat',
        dbPath: './test-chat.db'
    });

    // Initialize the chat (sets up storage and loads tools)
    await chat.initialize();

    // Add logging middleware
    chat.addMiddleware(loggingMiddleware);

    console.log('--- Basic Chat Interaction ---');

    // Send a message and get response
    const result1 = await chat.sendMessage('What is the latest version of React?');
    console.log('User:', 'What is the latest version of React?');
    console.log('Assistant:', result1.response.substring(0, 200) + '...\n');

    // Send another message in the same conversation
    const result2 = await chat.sendMessage('Can you also check TypeScript?');
    console.log('User:', 'Can you also check TypeScript?');
    console.log('Assistant:', result2.response.substring(0, 200) + '...\n');

    console.log('--- Conversation Management ---');

    // List all conversations
    const conversations = await chat.listConversations();
    console.log('Total conversations:', conversations.length);

    // Get current conversation details
    const currentConv = await chat.getCurrentConversation();
    console.log('Current conversation:', currentConv?.name);

    // Get conversation history
    const history = await chat.getConversationHistory();
    console.log('Messages in conversation:', history.length);

    console.log('--- Search Messages ---');

    // Search messages
    const searchResults = await chat.searchMessages('React');
    console.log('Messages containing "React":', searchResults.length);

    console.log('--- Streaming Example ---');

    // Create a new conversation for streaming
    await chat.createConversation('Streaming Test');

    // Stream a response
    const { stream } = await chat.streamMessage('Tell me about Node.js');
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
