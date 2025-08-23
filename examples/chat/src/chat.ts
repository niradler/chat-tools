import { Agent, type AgentOptions } from './agent';
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

export function getDefaultModel(): LanguageModelV2 {
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
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    metadata?: Record<string, any>;
}

export class Chat {
    private agent: Agent;
    private storage: StorageProvider;
    private tools: ToolSet = {};
    private model: LanguageModelV2;
    private systemPrompt: string;
    private agentOptions: Partial<AgentOptions>;

    constructor(options: ChatOptions = {}) {
        this.systemPrompt = options.systemPrompt || systemPrompt;
        this.model = options.model || getDefaultModel();
        this.tools = options.tools || {};
        this.agentOptions = options.agentOptions || {};

        this.storage = options.storage || (new Storage(options.dbPath || `./${options.name}.db`) as StorageProvider);

        this.agent = new Agent({
            systemPrompt: this.systemPrompt,
            model: this.model,
            tools: this.tools,
            ...this.agentOptions
        });
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
                ...this.agentOptions
            });
        }
    }

    async createConversation(name: string, config?: Record<string, any>): Promise<string> {
        const conversationId = await this.storage.createConversation(name, 'chat', config);
        return conversationId;
    }

    async loadConversation(conversationId: string): Promise<Conversation | null> {
        const conversation = await this.storage.getConversation(conversationId);
        return conversation as Conversation | null;
    }

    async listConversations(): Promise<Conversation[]> {
        return this.storage.listConversations() as Promise<Conversation[]>;
    }

    async deleteConversation(conversationId: string): Promise<void> {
        if (!conversationId) throw new Error('No conversation ID provided');
        await this.storage.deleteConversation(conversationId);
    }

    // Message Management
    async sendMessage(conversationId: string, content: string, metadata?: Record<string, any>): Promise<{
        response: string;
        messageId: string;
        responseId: string;
    }> {
        // Save user message
        const messageId = await this.storage.addMessage({
            conversationId,
            role: 'user',
            content,
            metadata
        });

        // Get conversation history
        const history = await this.getConversationHistory(conversationId);

        // Generate response using agent
        const result = await this.agent.generateTextResponse(content, history);
        const response = result.text || '';

        // Save assistant response
        const responseId = await this.storage.addMessage({
            conversationId,
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

    async streamMessage(conversationId: string, content: string, metadata?: Record<string, any>): Promise<{
        stream: StreamTextResult<ToolSet, unknown>;
        messageId: string;
    }> {
        // Save user message
        const messageId = await this.storage.addMessage({
            conversationId,
            role: 'user',
            content,
            metadata
        });

        // Get conversation history
        const history = await this.getConversationHistory(conversationId);

        // Generate streaming response using agent
        const stream = await this.agent.streamTextResponse(content, history);

        return { stream, messageId };
    }

    async saveAssistantMessage(conversationId: string, content: string, metadata?: Record<string, any>): Promise<string> {
        return this.storage.addMessage({
            conversationId,
            role: 'assistant',
            content,
            metadata
        });
    }

    async getConversationHistory(conversationId: string, limit?: number): Promise<Array<{ role: string; content: string }>> {
        const messages = await this.storage.getMessages(conversationId, { limit });
        return messages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    }

    async getMessages(conversationId: string, options?: { limit?: number; offset?: number; before?: Date; after?: Date }): Promise<Message[]> {
        return this.storage.getMessages(conversationId, options) as Promise<Message[]>;
    }

    async searchMessages(query: string, conversationId?: string): Promise<Message[]> {
        return this.storage.searchMessages(query, conversationId) as Promise<Message[]>;
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

    console.log('--- Basic Chat Interaction ---');

    // Create a conversation for our chat
    const conversationId = await chat.createConversation('Test Conversation');

    // Send a message and get response
    const result1 = await chat.sendMessage(conversationId, 'What is the latest version of React?');
    console.log('User:', 'What is the latest version of React?');
    console.log('Assistant:', result1.response.substring(0, 200) + '...\n');

    // Send another message in the same conversation
    const result2 = await chat.sendMessage(conversationId, 'Can you also check TypeScript?');
    console.log('User:', 'Can you also check TypeScript?');
    console.log('Assistant:', result2.response.substring(0, 200) + '...\n');

    console.log('--- Conversation Management ---');

    // List all conversations
    const conversations = await chat.listConversations();
    console.log('Total conversations:', conversations.length);

    // Get conversation details
    const currentConv = await chat.loadConversation(conversationId);
    console.log('Current conversation:', currentConv?.name);

    // Get conversation history
    const history = await chat.getConversationHistory(conversationId);
    console.log('Messages in conversation:', history.length);

    console.log('--- Search Messages ---');

    // Search messages in specific conversation
    const searchResults = await chat.searchMessages('React', conversationId);
    console.log('Messages containing "React" in this conversation:', searchResults.length);

    // Search messages across all conversations
    const globalSearchResults = await chat.searchMessages('React');
    console.log('Messages containing "React" globally:', globalSearchResults.length);

    console.log('--- Streaming Example ---');

    // Create a new conversation for streaming
    const streamingConversationId = await chat.createConversation('Streaming Test');

    // Stream a response
    const { stream } = await chat.streamMessage(streamingConversationId, 'Tell me about Node.js');
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
