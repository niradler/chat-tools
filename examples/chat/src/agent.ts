import { generateText, LanguageModel, stepCountIs, streamText, wrapLanguageModel } from 'ai';
import type { CallSettings, ToolSet, StopCondition, StreamTextResult, ModelMessage } from 'ai';
import type { LanguageModelV2, LanguageModelV2Middleware } from '@ai-sdk/provider';
import type { ProviderOptions } from '@ai-sdk/provider-utils';

enum MessageRole {
    System = 'system',
    User = 'user',
    Assistant = 'assistant',
}

type GenerateTextOptions = CallSettings & {
    model: LanguageModelV2;
    messages: ModelMessage[];
    tools?: ToolSet;
    stopWhen?: StopCondition<any>;
    providerOptions?: ProviderOptions;
};

interface AgentOptions {
    systemPrompt: string;
    model: LanguageModel;
    tools?: Record<string, any>;
    middlewares?: LanguageModelV2Middleware[];
    baseOptions?: Partial<Omit<GenerateTextOptions, 'model' | 'messages'>>;
}
export class Agent {
    private model: LanguageModelV2;
    private tools: Record<string, any>;
    private systemPrompt: string;
    private middlewares: LanguageModelV2Middleware[];
    private baseOptions: Partial<Omit<GenerateTextOptions, 'model' | 'messages'>>;

    constructor(options: AgentOptions) {
        const { systemPrompt, model, tools = {}, middlewares = [], baseOptions = {} } = options;

        // Convert string model to LanguageModelV2 if needed
        const baseModel = model as LanguageModelV2;

        this.model = middlewares.length > 0
            ? wrapLanguageModel({ model: baseModel, middleware: middlewares })
            : baseModel;
        this.tools = tools;
        this.systemPrompt = systemPrompt;
        this.middlewares = middlewares;
        this.baseOptions = baseOptions;
    }

    addMiddleware(middleware: LanguageModelV2Middleware) {
        this.middlewares.push(middleware);
        this.model = wrapLanguageModel({
            model: this.model as LanguageModelV2,
            middleware: middleware
        });
    }

    setMiddlewares(middlewares: LanguageModelV2Middleware[]) {
        this.middlewares = middlewares;
        this.model = middlewares.length > 0
            ? wrapLanguageModel({ model: this.model as LanguageModelV2, middleware: middlewares })
            : this.model;
    }

    async streamTextResponse(prompt: string, conversationHistory: Array<{ role: string; content: string }> = []): Promise<StreamTextResult<ToolSet, unknown>> {
        const messages: ModelMessage[] = [
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

        const generateOptions = this.getGenerateTextOptions(messages);
        return streamText(generateOptions);
    }

    private getGenerateTextOptions(
        messages: ModelMessage[],
        additionalOptions: Partial<GenerateTextOptions> = {}
    ): GenerateTextOptions {
        const hasTools = this.tools && Object.keys(this.tools).length > 0;

        const baseOptions: GenerateTextOptions = {
            model: this.model,
            messages,
            providerOptions: { ollama: { think: true } },
            ...this.baseOptions,
            ...additionalOptions
        };

        if (hasTools) {
            baseOptions.tools = this.tools;
            baseOptions.stopWhen = stepCountIs(5);
        }

        return baseOptions;
    }

    async generateTextResponse(prompt: string, conversationHistory: Array<{ role: string; content: string }> = []) {
        const messages: ModelMessage[] = [
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

        const generateOptions = this.getGenerateTextOptions(messages);
        const result = await generateText(generateOptions);

        return result;
    }


}



