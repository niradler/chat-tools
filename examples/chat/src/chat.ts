import { Agent } from './agent';
import { LanguageModelV2Middleware, type LanguageModelV2 } from '@ai-sdk/provider';
import { experimental_createMCPClient as createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio';
import { ollama } from 'ollama-ai-provider-v2';

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

// async function main() {
//     console.log('🚀 Testing Agent with Middleware\n');

//     // Test without middleware
//     console.log('--- Without Middleware ---');
//     const basicAgent = await createAgent();
//     const basicResult = await basicAgent.generateTextResponse('What is react latest version on npm?');
//     console.log('Response:', basicResult.text?.substring(0, 100) + '...\n');

//     // Test with middleware
//     console.log('--- With Logging Middleware ---');
//     const loggingAgent = await createAgent();
//     loggingAgent.addMiddleware(loggingMiddleware);
//     const loggingResult = await loggingAgent.generateTextResponse('What is react latest version on npm?');
//     console.log('Response:', loggingResult.text?.substring(0, 100) + '...\n');
// }

// if (require.main === module) {
//     main().catch(console.error);
// }

// export { main };
