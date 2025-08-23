import { generateText, LanguageModel, stepCountIs } from 'ai';
import { ollama } from 'ollama-ai-provider-v2';
import { experimental_createMCPClient as createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio';

export class Agent {
    private model: LanguageModel;
    private tools: Record<string, any>;

    constructor(model: LanguageModel, tools: Record<string, any>) {
        this.model = model;
        this.tools = tools;
    }

    async generateResponse(prompt: string, conversationHistory: Array<{ role: string; content: string }> = []) {
        const hasTools = this.tools && Object.keys(this.tools).length > 0;

        const messages = [
            {
                role: 'system' as const,
                content: hasTools
                    ? 'You are a helpful assistant that can check package versions and provide information about npm packages. When asked about package versions, use the available tools to get the latest information.'
                    : 'You are a helpful assistant. You can answer questions about programming, packages, and development topics based on your knowledge.',
            },
            ...conversationHistory.map(msg => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
            })),
            {
                role: 'user' as const,
                content: prompt,
            },
        ];

        const generateOptions: any = {
            model: this.model,
            messages,
            providerOptions: { ollama: { think: true } },
        };

        if (hasTools) {
            generateOptions.tools = this.tools;
            generateOptions.stopWhen = stepCountIs(5);
        }

        const result = await generateText(generateOptions);

        return result;
    }
}

export function getModel(): LanguageModel {
    return ollama('qwen3:30b');
}

export async function getTools(): Promise<Record<string, any>> {
    try {
        // Try different approaches for Windows
        let command = 'npx';
        let args = ['-y', 'dependency-mcp'];

        if (process.platform === 'win32') {
            // On Windows, try different approaches
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