import type { ExtensionHooks, HookContext, HookManager as IHookManager, Logger } from '@chat-tools/core';

export class HookManager implements IHookManager {
    private hooks = new Map<keyof ExtensionHooks, Map<string, Function>>();
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    register(hookName: keyof ExtensionHooks, handler: Function, extensionId: string): void {
        if (!this.hooks.has(hookName)) {
            this.hooks.set(hookName, new Map());
        }

        const hookHandlers = this.hooks.get(hookName)!;
        hookHandlers.set(extensionId, handler);

        this.logger.debug(`Registered hook ${hookName} for extension ${extensionId}`);
    }

    unregister(hookName: keyof ExtensionHooks, extensionId: string): void {
        const hookHandlers = this.hooks.get(hookName);
        if (hookHandlers) {
            hookHandlers.delete(extensionId);

            // Clean up empty hook maps
            if (hookHandlers.size === 0) {
                this.hooks.delete(hookName);
            }

            this.logger.debug(`Unregistered hook ${hookName} for extension ${extensionId}`);
        }
    }

    unregisterAll(extensionId: string): void {
        for (const [hookName, hookHandlers] of this.hooks.entries()) {
            if (hookHandlers.has(extensionId)) {
                this.unregister(hookName, extensionId);
            }
        }
    }

    async execute(hookName: keyof ExtensionHooks, context: HookContext): Promise<void> {
        const hookHandlers = this.hooks.get(hookName);
        if (!hookHandlers || hookHandlers.size === 0) {
            return;
        }

        this.logger.debug(`Executing ${hookHandlers.size} handlers for hook ${hookName}`);

        // Execute all handlers concurrently
        const promises: Promise<void>[] = [];

        for (const [extensionId, handler] of hookHandlers.entries()) {
            const promise = this.executeHandler(hookName, handler, { ...context, extensionId }, extensionId);
            promises.push(promise);
        }

        // Wait for all handlers to complete
        try {
            await Promise.all(promises);
        } catch (error: any) {
            this.logger.error(`Error executing hook ${hookName}:`, error.message);
            throw error;
        }
    }

    private async executeHandler(
        hookName: keyof ExtensionHooks,
        handler: Function,
        context: HookContext,
        extensionId: string
    ): Promise<void> {
        try {
            const result = handler(context);

            // Handle both sync and async handlers
            if (result && typeof result.then === 'function') {
                await result;
            }
        } catch (error: any) {
            this.logger.error(`Error in hook ${hookName} from extension ${extensionId}:`, error.message);
            throw new Error(`Hook ${hookName} failed in extension ${extensionId}: ${error.message}`);
        }
    }

    list(): Record<keyof ExtensionHooks, string[]> {
        const result: any = {};

        for (const [hookName, hookHandlers] of this.hooks.entries()) {
            result[hookName] = Array.from(hookHandlers.keys());
        }

        return result;
    }

    getHandlerCount(hookName: keyof ExtensionHooks): number {
        const hookHandlers = this.hooks.get(hookName);
        return hookHandlers ? hookHandlers.size : 0;
    }

    hasHook(hookName: keyof ExtensionHooks): boolean {
        return this.hooks.has(hookName) && this.hooks.get(hookName)!.size > 0;
    }

    clear(): void {
        this.hooks.clear();
        this.logger.debug('Cleared all hooks');
    }
}
