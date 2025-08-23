import type { Extension } from './extensions';

export const loggingExtension: Extension = {
    name: 'logging-extension',
    version: '1.0.0',
    description: 'Simple logging extension that tracks AI SDK events',

    onChunk: async (chunk) => {
        console.log(`📝 [Logging] Chunk received:`, chunk.chunk.type);
    },

    onError: async (error) => {
        console.error(`❌ [Logging] AI SDK Error:`, error);
    },

    onFinish: async (result) => {
        console.log(`🏁 [Logging] Generation finished:`, {
            text: result.text?.substring(0, 100) + (result.text?.length > 100 ? '...' : ''),
            usage: result.usage,
            finishReason: result.finishReason,
            toolCalls: result.toolCalls?.length || 0,
            toolResults: result.toolResults?.length || 0
        });
    },

    onStepFinish: async (step) => {
        console.log(`👣 [Logging] Step finished:`, {
            text: step.text?.substring(0, 50) + (step.text?.length > 50 ? '...' : ''),
            toolCalls: step.toolCalls?.length || 0,
            usage: step.usage
        });
    },

    async init(chat) {
        console.log(`🚀 [Logging] Extension initialized`);
    }
};

export const detailedLoggingExtension: Extension = {
    name: 'detailed-logging-extension',
    version: '1.0.0',
    description: 'Detailed logging extension with timestamps',

    onChunk: async (chunk) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] 📝 Chunk:`, chunk.chunk.type);
    },

    onFinish: async (result) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] 🏁 Generation Complete:`, {
            textLength: result.text?.length || 0,
            totalTokens: result.usage?.totalTokens || 0,
            finishReason: result.finishReason,
            toolCallsCount: result.toolCalls?.length || 0
        });
    },

    async init(chat) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] 🚀 Detailed Logging Extension Initialized`);
        console.log(`[${timestamp}] 📊 Chat Info:`, {
            model: chat.getModel()?.modelId || 'unknown',
            systemPromptLength: chat.getSystemPrompt().length
        });
    }
};
