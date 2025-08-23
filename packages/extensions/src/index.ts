export { ExtensionManager } from './extension-manager';
export { HookManager } from './hook-manager';
export { ExtensionLoader } from './extension-loader';
export { exampleExtension } from './example-extension';

// Re-export types from core
export type {
    Extension,
    ExtensionContext,
    ExtensionHooks,
    HookContext,
    ExtensionManager as IExtensionManager,
    HookManager as IHookManager,
    UIComponent,
    ExtensionCommand,
    ExtensionMiddleware
} from '@chat-tools/core';
