import { generateText, stepCountIs, streamText, wrapLanguageModel } from 'ai';
import type {
    CallSettings,
    ToolSet,
    StopCondition,
    StreamTextResult,
    ModelMessage,
    ToolChoice,
    TelemetrySettings,
    PrepareStepFunction,
    ToolCallRepairFunction,
    StreamTextTransform,
    StreamTextOnChunkCallback,
    StreamTextOnErrorCallback,
    StreamTextOnFinishCallback,
    GenerateTextOnStepFinishCallback,
    IdGenerator
} from 'ai';
import type { LanguageModelV2, LanguageModelV2Middleware } from '@ai-sdk/provider';
import type { ProviderOptions } from '@ai-sdk/provider-utils';

enum MessageRole {
    System = 'system',
    User = 'user',
    Assistant = 'assistant',
}

type GenerateTextOptions<TOOLS extends ToolSet = ToolSet> = CallSettings & {
    model: LanguageModelV2;
    messages: ModelMessage[];
    tools?: TOOLS;
    toolChoice?: ToolChoice<TOOLS>;
    system?: string;
    maxRetries?: number;
    abortSignal?: AbortSignal;
    headers?: Record<string, string>;
    stopWhen?: StopCondition<TOOLS> | Array<StopCondition<TOOLS>>;
    experimental_telemetry?: TelemetrySettings;
    providerOptions?: ProviderOptions;
    experimental_activeTools?: Array<keyof TOOLS>;
    activeTools?: Array<keyof TOOLS>;
    experimental_prepareStep?: PrepareStepFunction<TOOLS>;
    prepareStep?: PrepareStepFunction<TOOLS>;
    experimental_repairToolCall?: ToolCallRepairFunction<TOOLS>;
    onStepFinish?: GenerateTextOnStepFinishCallback<TOOLS>;
    experimental_context?: unknown;
    _internal?: {
        generateId?: IdGenerator;
        currentDate?: () => Date;
    };
};

type StreamTextOptions<TOOLS extends ToolSet = ToolSet> = CallSettings & {
    model: LanguageModelV2;
    messages: ModelMessage[];
    tools?: TOOLS;
    toolChoice?: ToolChoice<TOOLS>;
    system?: string;
    maxRetries?: number;
    abortSignal?: AbortSignal;
    headers?: Record<string, string>;
    stopWhen?: StopCondition<TOOLS> | Array<StopCondition<TOOLS>>;
    experimental_telemetry?: TelemetrySettings;
    providerOptions?: ProviderOptions;
    experimental_activeTools?: Array<keyof TOOLS>;
    activeTools?: Array<keyof TOOLS>;
    prepareStep?: PrepareStepFunction<TOOLS>;
    experimental_repairToolCall?: ToolCallRepairFunction<TOOLS>;
    experimental_transform?: StreamTextTransform<TOOLS> | Array<StreamTextTransform<TOOLS>>;
    includeRawChunks?: boolean;
    onChunk?: StreamTextOnChunkCallback<TOOLS>;
    onError?: StreamTextOnErrorCallback;
    onFinish?: StreamTextOnFinishCallback<TOOLS>;
    onStepFinish?: GenerateTextOnStepFinishCallback<TOOLS>;
    experimental_context?: unknown;
    _internal?: {
        now?: () => number;
        generateId?: IdGenerator;
        currentDate?: () => Date;
    };
};

export interface AgentOptions<TOOLS extends ToolSet = ToolSet> {
    systemPrompt: string;
    model: LanguageModelV2;
    tools?: TOOLS;
    middlewares?: LanguageModelV2Middleware[];
    generateTextOptions?: Partial<GenerateTextOptions<TOOLS>>;
    streamTextOptions?: Partial<StreamTextOptions<TOOLS>>;
}
export class Agent {
    private model: LanguageModelV2;
    private tools: Record<string, any>;
    private hasTools: boolean;
    private systemPrompt: string;
    private middlewares: LanguageModelV2Middleware[];
    private generateTextOptions: Partial<GenerateTextOptions>;
    private streamTextOptions: Partial<StreamTextOptions>;

    constructor(options: AgentOptions) {
        const { systemPrompt, model, tools = {}, middlewares = [], generateTextOptions = {}, streamTextOptions = {} } = options;

        this.model = model;
        this.tools = tools;
        this.systemPrompt = systemPrompt;
        this.middlewares = middlewares;
        this.generateTextOptions = generateTextOptions;
        this.streamTextOptions = streamTextOptions;
        this.model = this.getModel();
        this.hasTools = tools && Object.keys(tools).length > 0;
    }

    getModel(): LanguageModelV2 {
        this.model = this.middlewares.length > 0
            ? wrapLanguageModel({ model: this.model as LanguageModelV2, middleware: this.middlewares })
            : this.model;
        return this.model;
    }

    addMiddleware(middleware: LanguageModelV2Middleware) {
        this.middlewares.push(middleware);
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

        const streamTextOptions = {
            model: this.getModel(),
            messages,
            ...this.streamTextOptions
        };

        if (this.hasTools) {
            streamTextOptions.tools = this.tools;
            streamTextOptions.stopWhen = stepCountIs(5);
        }

        return streamText(streamTextOptions);
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

        const generateOptions: GenerateTextOptions = {
            model: this.getModel(),
            messages,
            ...this.generateTextOptions
        };

        if (this.hasTools) {
            generateOptions.tools = this.tools;
            generateOptions.stopWhen = stepCountIs(5);
        }
        const result = await generateText(generateOptions);

        return result;
    }
}



