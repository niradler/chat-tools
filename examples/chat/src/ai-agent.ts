import { generateText, LanguageModel, stepCountIs } from 'ai';
import { ollama } from 'ollama-ai-provider-v2';
import { experimental_createMCPClient as createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio';

enum MessageRole {
    System = 'system',
    User = 'user',
    Assistant = 'assistant',
}

export class Agent {
    private model: LanguageModel;
    private tools: Record<string, any>;
    private systemPrompt: string;

    constructor(model: LanguageModel, tools: Record<string, any>, systemPrompt: string) {
        this.model = model;
        this.tools = tools;
        this.systemPrompt = systemPrompt;
    }

    async generateResponse(prompt: string, conversationHistory: Array<{ role: string; content: string }> = []) {
        const hasTools = this.tools && Object.keys(this.tools).length > 0;

        const messages = [
            {
                role: MessageRole.System,
                content: this.systemPrompt
            },
            ...conversationHistory.map(msg => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content,
            })),
            {
                role: MessageRole.User,
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

function exampleExtension(agent: Agent) {

}

export async function createAgent() {
    const model = getModel();
    const tools = await getTools();
    const agent = new Agent(model, tools, 'You are a helpful assistant that can check package versions and provide information about npm packages. When asked about package versions, use the available tools to get the latest information.');
    return agent
}