import type { LanguageModelV2, LanguageModelV2CallOptions, LanguageModelV2Middleware } from '@ai-sdk/provider';
import type {
    StreamTextOnChunkCallback,
    StreamTextOnErrorCallback,
    StreamTextOnFinishCallback,
    GenerateTextOnStepFinishCallback,
    ToolSet
} from 'ai';
import type { Chat } from './chat';

export interface Extension {
    name: string;
    version?: string;
    description?: string;
    priority?: number;
    middlewareVersion?: 'v2' | undefined;

    overrideProvider?: (options: {
        model: LanguageModelV2;
    }) => string;

    overrideModelId?: (options: {
        model: LanguageModelV2;
    }) => string;

    overrideSupportedUrls?: (options: {
        model: LanguageModelV2;
    }) => PromiseLike<Record<string, RegExp[]>> | Record<string, RegExp[]>;

    transformParams?: (options: {
        type: 'generate' | 'stream';
        params: LanguageModelV2CallOptions;
        model: LanguageModelV2;
    }) => PromiseLike<LanguageModelV2CallOptions>;

    wrapGenerate?: (options: {
        doGenerate: () => ReturnType<LanguageModelV2['doGenerate']>;
        doStream: () => ReturnType<LanguageModelV2['doStream']>;
        params: LanguageModelV2CallOptions;
        model: LanguageModelV2;
    }) => Promise<Awaited<ReturnType<LanguageModelV2['doGenerate']>>>;

    wrapStream?: (options: {
        doGenerate: () => ReturnType<LanguageModelV2['doGenerate']>;
        doStream: () => ReturnType<LanguageModelV2['doStream']>;
        params: LanguageModelV2CallOptions;
        model: LanguageModelV2;
    }) => PromiseLike<Awaited<ReturnType<LanguageModelV2['doStream']>>>;

    onChunk?: StreamTextOnChunkCallback<ToolSet>;
    onError?: StreamTextOnErrorCallback;
    onFinish?: StreamTextOnFinishCallback<ToolSet>;
    onStepFinish?: GenerateTextOnStepFinishCallback<ToolSet>;

    init?: (chat: Chat) => Promise<void> | void;
}

export class ExtensionManager {
    private extensions: Extension[] = [];

    register(extension: Extension): void {
        this.extensions.push(extension);
        this.extensions.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    }

    async init(chat: Chat): Promise<void> {
        for (const extension of this.extensions) {
            if (extension.init) {
                try {
                    await extension.init(chat);
                } catch (error) {
                    console.error(`Error initializing extension '${extension.name}':`, error);
                }
            }
        }
    }

    toAISDKOptions(): {
        middlewares: LanguageModelV2Middleware[];
        generateTextOptions: {
            onFinish?: StreamTextOnFinishCallback<ToolSet>;
            onStepFinish?: GenerateTextOnStepFinishCallback<ToolSet>;
        };
        streamTextOptions: {
            onChunk?: StreamTextOnChunkCallback<ToolSet>;
            onError?: StreamTextOnErrorCallback;
            onFinish?: StreamTextOnFinishCallback<ToolSet>;
            onStepFinish?: GenerateTextOnStepFinishCallback<ToolSet>;
        };
    } {
        const middlewares: LanguageModelV2Middleware[] = [];
        const onChunkCallbacks: StreamTextOnChunkCallback<ToolSet>[] = [];
        const onErrorCallbacks: StreamTextOnErrorCallback[] = [];
        const onFinishCallbacks: StreamTextOnFinishCallback<ToolSet>[] = [];
        const onStepFinishCallbacks: GenerateTextOnStepFinishCallback<ToolSet>[] = [];

        for (const extension of this.extensions) {
            const { name, version, description, priority, init, onChunk, onError, onFinish, onStepFinish, ...middleware } = extension;

            if (Object.keys(middleware).length > 0) {
                middlewares.push(middleware as LanguageModelV2Middleware);
            }

            if (onChunk) onChunkCallbacks.push(onChunk);
            if (onError) onErrorCallbacks.push(onError);
            if (onFinish) onFinishCallbacks.push(onFinish);
            if (onStepFinish) onStepFinishCallbacks.push(onStepFinish);
        }

        const generateCallbacks: {
            onFinish?: StreamTextOnFinishCallback<ToolSet>;
            onStepFinish?: GenerateTextOnStepFinishCallback<ToolSet>;
        } = {};

        const streamCallbacks: {
            onChunk?: StreamTextOnChunkCallback<ToolSet>;
            onError?: StreamTextOnErrorCallback;
            onFinish?: StreamTextOnFinishCallback<ToolSet>;
            onStepFinish?: GenerateTextOnStepFinishCallback<ToolSet>;
        } = {};

        if (onChunkCallbacks.length > 0) {
            streamCallbacks.onChunk = async (chunk) => {
                for (const callback of onChunkCallbacks) {
                    try {
                        await callback(chunk);
                    } catch (error) {
                        console.error('Extension onChunk error:', error);
                    }
                }
            };
        }

        if (onErrorCallbacks.length > 0) {
            streamCallbacks.onError = async (error) => {
                for (const callback of onErrorCallbacks) {
                    try {
                        await callback(error);
                    } catch (error) {
                        console.error('Extension onError error:', error);
                    }
                }
            };
        }

        if (onFinishCallbacks.length > 0) {
            const onFinish: StreamTextOnFinishCallback<ToolSet> = async (result) => {
                for (const callback of onFinishCallbacks) {
                    try {
                        await callback(result);
                    } catch (error) {
                        console.error('Extension onFinish error:', error);
                    }
                }
            };
            streamCallbacks.onFinish = onFinish;
            generateCallbacks.onFinish = onFinish;
        }

        if (onStepFinishCallbacks.length > 0) {
            const onStepFinish: GenerateTextOnStepFinishCallback<ToolSet> = async (step) => {
                for (const callback of onStepFinishCallbacks) {
                    try {
                        await callback(step);
                    } catch (error) {
                        console.error('Extension onStepFinish error:', error);
                    }
                }
            };
            streamCallbacks.onStepFinish = onStepFinish;
            generateCallbacks.onStepFinish = onStepFinish;
        }

        return {
            middlewares,
            generateTextOptions: generateCallbacks,
            streamTextOptions: streamCallbacks
        };
    }

    getExtensions(): Extension[] {
        return [...this.extensions];
    }
}
