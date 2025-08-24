import type { Extension } from './extensions';
import type { Chat } from './chat';

export default class LoggingExtension implements Extension {
    name = 'logging-extension';
    version = '1.0.0';
    description = 'Simple logging extension that tracks AI SDK events';

    async onChunk(chunk: any) {
        console.log(`📝 [Logging] Chunk received:`, chunk.chunk.type);
    }

    async onError(error: any) {
        console.error(`❌ [Logging] AI SDK Error:`, error);
    }

    async onFinish(result: any) {
        console.log(`🏁 [Logging] Generation finished:`, {
            text: result.text?.substring(0, 100) + (result.text?.length > 100 ? '...' : ''),
            usage: result.usage,
            finishReason: result.finishReason,
            toolCalls: result.toolCalls?.length || 0,
            toolResults: result.toolResults?.length || 0
        });
    }

    async onStepFinish(step: any) {
        console.log(`👣 [Logging] Step finished:`, {
            text: step.text?.substring(0, 50) + (step.text?.length > 50 ? '...' : ''),
            toolCalls: step.toolCalls?.length || 0,
            usage: step.usage
        });
    }

    async init(chat: Chat) {
        console.log(`🚀 [Logging] Extension initialized`);
    }
}
