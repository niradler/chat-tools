import { createTool } from '@mastra/core';
import { z } from 'zod';
import type { Extension, ExtensionContext, HookContext } from '@chat-tools/core';

// Example extension demonstrating the flexible hook and lifecycle system
export const exampleExtension: Extension = {
    name: 'example-extension',
    version: '1.0.0',
    description: 'Example extension demonstrating hooks and lifecycle management',
    author: 'Chat Tools Team',
    license: 'MIT',

    capabilities: {
        providesTools: true,
        providesUIComponents: true,
        modifiesConfig: true,
        accessesStorage: true
    },

    dependencies: {
        chatTools: '>=0.1.0'
    },

    // Lifecycle hooks - these are called automatically by the framework
    hooks: {
        // Framework lifecycle
        'framework:beforeInit': async (context: HookContext) => {
            context.logger.info(`[${context.extensionId}] Framework initializing...`);
        },

        'framework:afterInit': async (context: HookContext) => {
            context.logger.info(`[${context.extensionId}] Framework initialized!`);
        },

        // Agent lifecycle
        'agent:beforeCreate': async (context: HookContext & { config: any }) => {
            context.logger.info(`[${context.extensionId}] Agent being created with config:`, context.config.name);

            // Modify agent configuration
            if (context.config.agent) {
                context.config.agent.systemPrompt += '\n\nYou have been enhanced by the example extension.';
            }
        },

        'agent:beforeGenerate': async (context: HookContext & { message: string; options?: any }) => {
            context.logger.info(`[${context.extensionId}] Agent generating response for: "${context.message.slice(0, 50)}..."`);

            // Log all messages for analytics
            if (context.storage) {
                await context.storage.saveAnalytics({
                    type: 'message',
                    content: context.message,
                    timestamp: new Date(),
                    extensionId: context.extensionId
                });
            }
        },

        'agent:afterGenerate': async (context: HookContext & { message: string; response: string }) => {
            context.logger.info(`[${context.extensionId}] Agent generated response: "${context.response.slice(0, 50)}..."`);
        },

        'agent:beforeToolCall': async (context: HookContext & { toolName: string; params: any }) => {
            context.logger.info(`[${context.extensionId}] Tool call: ${context.toolName}`);

            // Add analytics tracking
            if (context.storage) {
                await context.storage.saveAnalytics({
                    type: 'tool_call',
                    toolName: context.toolName,
                    params: context.params,
                    timestamp: new Date(),
                    extensionId: context.extensionId
                });
            }
        },

        // Approval lifecycle
        'approval:beforeRequest': async (context: HookContext & { toolName: string; params: any }) => {
            context.logger.info(`[${context.extensionId}] Approval requested for ${context.toolName}`);

            // Auto-approve safe operations
            if (context.toolName === 'system-info' && !context.params.includeEnv) {
                context.logger.info(`[${context.extensionId}] Auto-approving safe system-info call`);
                // Extension could modify approval flow here
            }
        },

        // Configuration lifecycle
        'config:afterLoad': async (context: HookContext & { config: any }) => {
            context.logger.info(`[${context.extensionId}] Configuration loaded for agent: ${context.config.name}`);

            // Validate extension-specific configuration
            if (context.config.extensions) {
                const extensionConfig = context.config.extensions.find((ext: any) => ext.name === 'example-extension');
                if (extensionConfig && extensionConfig.enabled) {
                    context.logger.info(`[${context.extensionId}] Extension configuration validated`);
                }
            }
        }
    },

    // Main activation method
    async activate(context: ExtensionContext): Promise<void> {
        context.logger.info(`[${context.extensionId}] Activating example extension...`);

        // Setup extension-specific resources
        context.utils.emit('extension:example:activated', {
            extensionId: context.extensionId,
            timestamp: new Date()
        });

        // Subscribe to framework events
        const unsubscribe = context.utils.subscribe('agent:message', (data: any) => {
            context.logger.debug(`[${context.extensionId}] Received agent message event:`, data);
        });

        // Store cleanup function in context for deactivation
        (context as any)._cleanup = [unsubscribe];
    },

    // Deactivation cleanup
    async deactivate(context: ExtensionContext): Promise<void> {
        context.logger.info(`[${context.extensionId}] Deactivating example extension...`);

        // Cleanup subscriptions
        const cleanup = (context as any)._cleanup;
        if (cleanup && Array.isArray(cleanup)) {
            cleanup.forEach((fn: Function) => fn());
        }

        context.utils.emit('extension:example:deactivated', {
            extensionId: context.extensionId,
            timestamp: new Date()
        });
    },

    // Provide custom tools
    async getTools(context: ExtensionContext): Promise<any[]> {
        return [
            createTool({
                id: 'example-analytics',
                description: 'Get analytics data collected by the example extension',
                inputSchema: z.object({
                    type: z.enum(['message', 'tool_call', 'all']).optional().default('all'),
                    limit: z.number().optional().default(10)
                }),
                outputSchema: z.object({
                    analytics: z.array(z.object({
                        type: z.string(),
                        timestamp: z.string(),
                        data: z.any()
                    })),
                    total: z.number()
                }),
                execute: async ({ context: toolContext }: { context: any }) => {
                    // Get analytics from storage
                    if (context.framework.storage) {
                        const analytics = await context.framework.storage.getAnalytics({
                            type: toolContext.type === 'all' ? undefined : toolContext.type,
                            limit: toolContext.limit,
                            extensionId: context.extensionId
                        });

                        return {
                            analytics: analytics || [],
                            total: analytics?.length || 0
                        };
                    }

                    return { analytics: [], total: 0 };
                }
            }),

            createTool({
                id: 'example-health-check',
                description: 'Check the health status of the example extension',
                inputSchema: z.object({}),
                outputSchema: z.object({
                    status: z.string(),
                    uptime: z.number(),
                    features: z.array(z.string()),
                    hooks: z.record(z.number())
                }),
                execute: async () => {
                    const hooksList = context.framework.hookManager.list();
                    const hooksCount: Record<string, number> = {};

                    // Convert string[] to number (count of registered hooks)
                    Object.entries(hooksList).forEach(([hookName, handlers]) => {
                        hooksCount[hookName] = Array.isArray(handlers) ? handlers.length : 0;
                    });

                    return {
                        status: 'healthy',
                        uptime: process.uptime(),
                        features: ['analytics', 'health-check', 'lifecycle-hooks'],
                        hooks: hooksCount
                    };
                }
            })
        ];
    },

    // Provide UI components (for future TUI integration)
    async getUIComponents(context: ExtensionContext): Promise<any[]> {
        return [
            {
                name: 'extension-status',
                slot: 'sidebar',
                priority: 10,
                component: 'ExtensionStatusWidget', // Would be actual React component
                props: {
                    extensionId: context.extensionId,
                    status: 'active'
                }
            }
        ];
    },

    // Configuration schema
    async getConfigSchema(context: ExtensionContext): Promise<Record<string, any>> {
        return {
            type: 'object',
            properties: {
                enabled: {
                    type: 'boolean',
                    default: true,
                    description: 'Enable the example extension'
                },
                analytics: {
                    type: 'object',
                    properties: {
                        enabled: {
                            type: 'boolean',
                            default: true,
                            description: 'Enable analytics collection'
                        },
                        maxEntries: {
                            type: 'number',
                            default: 1000,
                            description: 'Maximum number of analytics entries to store'
                        }
                    }
                },
                notifications: {
                    type: 'object',
                    properties: {
                        onToolCall: {
                            type: 'boolean',
                            default: false,
                            description: 'Show notifications for tool calls'
                        }
                    }
                }
            }
        };
    },

    // Validate configuration
    async validateConfig(config: any, context: ExtensionContext): Promise<boolean> {
        if (typeof config !== 'object') {
            context.logger.error('Extension config must be an object');
            return false;
        }

        if (config.analytics && typeof config.analytics.maxEntries === 'number' && config.analytics.maxEntries < 0) {
            context.logger.error('Analytics maxEntries must be a positive number');
            return false;
        }

        return true;
    },

    // Provide extension commands
    async getCommands(context: ExtensionContext): Promise<any[]> {
        return [
            {
                name: 'example:status',
                description: 'Show example extension status',
                handler: async (args: string[], cmdContext: any) => {
                    cmdContext.logger.info(`Example extension status: active`);
                    cmdContext.logger.info(`Hooks registered: ${Object.keys(context.framework.hookManager.list()).length}`);
                }
            },
            {
                name: 'example:clear-analytics',
                description: 'Clear analytics data',
                handler: async (args: string[], cmdContext: any) => {
                    if (context.framework.storage) {
                        await context.framework.storage.clearAnalytics(context.extensionId);
                        cmdContext.logger.info('Analytics data cleared');
                    }
                }
            }
        ];
    }
};
