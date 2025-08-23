import { EventEmitter } from 'events';
import { resolve, join } from 'path';
import * as semver from 'semver';
import type {
    Extension,
    ExtensionManager as IExtensionManager,
    ExtensionContext,
    ExtensionHooks,
    HookContext,
    Logger
} from '@chat-tools/core';
import { HookManager } from './hook-manager';

export class ExtensionManager extends EventEmitter implements IExtensionManager {
    private extensions = new Map<string, Extension>();
    private activeExtensions = new Set<string>();
    private extensionContexts = new Map<string, ExtensionContext>();
    private hookManager: HookManager;
    private logger: Logger;
    private workspaceRoot: string;
    private frameworkVersion: string;

    constructor(options: {
        workspaceRoot: string;
        frameworkVersion: string;
        logger: Logger;
        storage?: any;
    }) {
        super();
        this.workspaceRoot = options.workspaceRoot;
        this.frameworkVersion = options.frameworkVersion;
        this.logger = options.logger;
        this.hookManager = new HookManager(this.logger);
    }

    async register(extension: Extension): Promise<void> {
        const extensionId = this.getExtensionId(extension);

        this.logger.info(`Registering extension: ${extensionId}`);

        // Validate extension
        await this.validateExtension(extension);

        // Check dependencies
        await this.checkDependencies(extension);

        // Store extension
        this.extensions.set(extensionId, extension);

        // Create context
        const context = await this.createExtensionContext(extension);
        this.extensionContexts.set(extensionId, context);

        // Register hooks
        if (extension.hooks) {
            this.registerExtensionHooks(extensionId, extension.hooks);
        }

        this.emit('extension:registered', { extensionId, extension });
        this.logger.info(`Extension registered successfully: ${extensionId}`);
    }

    async unregister(extensionId: string): Promise<void> {
        this.logger.info(`Unregistering extension: ${extensionId}`);

        // Deactivate if active
        if (this.isActive(extensionId)) {
            await this.deactivate(extensionId);
        }

        // Unregister hooks
        this.hookManager.unregisterAll(extensionId);

        // Remove from storage
        this.extensions.delete(extensionId);
        this.extensionContexts.delete(extensionId);

        this.emit('extension:unregistered', { extensionId });
        this.logger.info(`Extension unregistered successfully: ${extensionId}`);
    }

    async activate(extensionId: string): Promise<void> {
        const extension = this.extensions.get(extensionId);
        if (!extension) {
            throw new Error(`Extension not found: ${extensionId}`);
        }

        if (this.isActive(extensionId)) {
            this.logger.warn(`Extension already active: ${extensionId}`);
            return;
        }

        this.logger.info(`Activating extension: ${extensionId}`);

        // Activate dependencies first
        await this.activateDependencies(extension);

        const context = this.extensionContexts.get(extensionId)!;

        try {
            // Execute activation hook
            await this.executeHook('framework:beforeInit', {
                extensionId,
                timestamp: new Date(),
                workspaceRoot: this.workspaceRoot,
                logger: this.logger,
                framework: this
            });

            // Call extension's activate method
            if (extension.activate) {
                await extension.activate(context);
            }

            // Mark as active
            this.activeExtensions.add(extensionId);

            // Execute post-activation hook
            await this.executeHook('framework:afterInit', {
                extensionId,
                timestamp: new Date(),
                workspaceRoot: this.workspaceRoot,
                logger: this.logger,
                framework: this
            });

            this.emit('extension:activated', { extensionId, extension });
            this.logger.info(`Extension activated successfully: ${extensionId}`);

        } catch (error: any) {
            this.logger.error(`Failed to activate extension ${extensionId}:`, error.message);
            throw error;
        }
    }

    async deactivate(extensionId: string): Promise<void> {
        const extension = this.extensions.get(extensionId);
        if (!extension) {
            throw new Error(`Extension not found: ${extensionId}`);
        }

        if (!this.isActive(extensionId)) {
            this.logger.warn(`Extension not active: ${extensionId}`);
            return;
        }

        this.logger.info(`Deactivating extension: ${extensionId}`);

        const context = this.extensionContexts.get(extensionId)!;

        try {
            // Execute pre-deactivation hook
            await this.executeHook('framework:beforeShutdown', {
                extensionId,
                timestamp: new Date(),
                workspaceRoot: this.workspaceRoot,
                logger: this.logger,
                framework: this
            });

            // Call extension's deactivate method
            if (extension.deactivate) {
                await extension.deactivate(context);
            }

            // Mark as inactive
            this.activeExtensions.delete(extensionId);

            // Execute post-deactivation hook
            await this.executeHook('framework:afterShutdown', {
                extensionId,
                timestamp: new Date(),
                workspaceRoot: this.workspaceRoot,
                logger: this.logger,
                framework: this
            });

            this.emit('extension:deactivated', { extensionId, extension });
            this.logger.info(`Extension deactivated successfully: ${extensionId}`);

        } catch (error: any) {
            this.logger.error(`Failed to deactivate extension ${extensionId}:`, error.message);
            throw error;
        }
    }

    list(): Extension[] {
        return Array.from(this.extensions.values());
    }

    get(extensionId: string): Extension | undefined {
        return this.extensions.get(extensionId);
    }

    isActive(extensionId: string): boolean {
        return this.activeExtensions.has(extensionId);
    }

    getDependencies(extensionId: string): string[] {
        const extension = this.extensions.get(extensionId);
        if (!extension || !extension.dependencies?.extensions) {
            return [];
        }
        return Object.keys(extension.dependencies.extensions);
    }

    async executeHook(hookName: keyof ExtensionHooks, context: HookContext): Promise<void> {
        await this.hookManager.execute(hookName, context);
    }

    // Get capabilities from all active extensions
    async getToolsFromExtensions(): Promise<any[]> {
        const tools: any[] = [];

        for (const extensionId of this.activeExtensions) {
            const extension = this.extensions.get(extensionId);
            const context = this.extensionContexts.get(extensionId);

            if (extension?.getTools && context) {
                try {
                    const extensionTools = await extension.getTools(context);
                    tools.push(...extensionTools);
                } catch (error: any) {
                    this.logger.error(`Error getting tools from extension ${extensionId}:`, error.message);
                }
            }
        }

        return tools;
    }

    async getMCPServersFromExtensions(): Promise<any[]> {
        const servers: any[] = [];

        for (const extensionId of this.activeExtensions) {
            const extension = this.extensions.get(extensionId);
            const context = this.extensionContexts.get(extensionId);

            if (extension?.getMCPServers && context) {
                try {
                    const extensionServers = await extension.getMCPServers(context);
                    servers.push(...extensionServers);
                } catch (error: any) {
                    this.logger.error(`Error getting MCP servers from extension ${extensionId}:`, error.message);
                }
            }
        }

        return servers;
    }

    async getUIComponentsFromExtensions(): Promise<any[]> {
        const components: any[] = [];

        for (const extensionId of this.activeExtensions) {
            const extension = this.extensions.get(extensionId);
            const context = this.extensionContexts.get(extensionId);

            if (extension?.getUIComponents && context) {
                try {
                    const extensionComponents = await extension.getUIComponents(context);
                    components.push(...extensionComponents);
                } catch (error: any) {
                    this.logger.error(`Error getting UI components from extension ${extensionId}:`, error.message);
                }
            }
        }

        return components;
    }

    private async validateExtension(extension: Extension): Promise<void> {
        if (!extension.name || typeof extension.name !== 'string') {
            throw new Error('Extension must have a valid name');
        }

        if (!extension.version || typeof extension.version !== 'string') {
            throw new Error('Extension must have a valid version');
        }

        if (!semver.valid(extension.version)) {
            throw new Error(`Extension version is not a valid semver: ${extension.version}`);
        }
    }

    private async checkDependencies(extension: Extension): Promise<void> {
        // Check framework version compatibility
        if (extension.dependencies?.chatTools) {
            if (!semver.satisfies(this.frameworkVersion, extension.dependencies.chatTools)) {
                throw new Error(
                    `Extension requires chat-tools version ${extension.dependencies.chatTools}, ` +
                    `but current version is ${this.frameworkVersion}`
                );
            }
        }

        // Check extension dependencies
        if (extension.dependencies?.extensions) {
            for (const [depId, depVersion] of Object.entries(extension.dependencies.extensions)) {
                const depExtension = this.extensions.get(depId);
                if (!depExtension) {
                    throw new Error(`Extension dependency not found: ${depId}`);
                }

                if (!semver.satisfies(depExtension.version, depVersion)) {
                    throw new Error(
                        `Extension dependency ${depId} version ${depExtension.version} ` +
                        `does not satisfy requirement ${depVersion}`
                    );
                }
            }
        }
    }

    private async activateDependencies(extension: Extension): Promise<void> {
        if (extension.dependencies?.extensions) {
            for (const depId of Object.keys(extension.dependencies.extensions)) {
                if (!this.isActive(depId)) {
                    await this.activate(depId);
                }
            }
        }
    }

    private async createExtensionContext(extension: Extension): Promise<ExtensionContext> {
        const extensionId = this.getExtensionId(extension);

        return {
            extensionId,
            workspaceRoot: this.workspaceRoot,
            extensionPath: resolve(this.workspaceRoot, 'extensions', extensionId),
            logger: this.logger,
            config: {},

            framework: {
                version: this.frameworkVersion,
                eventEmitter: this as any,
                hookManager: this.hookManager
            },

            extensions: {
                get: (id: string) => this.get(id),
                list: () => this.list(),
                isActive: (id: string) => this.isActive(id)
            },

            utils: {
                resolve: (path: string) => resolve(this.workspaceRoot, path),
                require: (moduleName: string) => require(moduleName),
                emit: (event: string, data: any) => this.emit(event, data),
                subscribe: (event: string, handler: Function) => {
                    this.on(event, handler as any);
                    return () => this.off(event, handler as any);
                }
            }
        };
    }

    private registerExtensionHooks(extensionId: string, hooks: ExtensionHooks): void {
        for (const [hookName, handler] of Object.entries(hooks)) {
            if (handler) {
                this.hookManager.register(hookName as keyof ExtensionHooks, handler, extensionId);
            }
        }
    }

    private getExtensionId(extension: Extension): string {
        return extension.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }
}
