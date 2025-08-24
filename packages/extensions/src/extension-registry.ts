import type { Extension } from './extension-manager';

export interface ExtensionConfig {
    name: string;
    module: string;
    config?: any;
}

export class ExtensionRegistry {
    private static extensions = new Map<string, () => Promise<any>>();

    static register(name: string, importFn: () => Promise<any>): void {
        this.extensions.set(name, importFn);
    }

    static async load(name: string, config?: any): Promise<Extension> {
        const importFn = this.extensions.get(name);
        if (!importFn) {
            throw new Error(`Extension '${name}' not found in registry`);
        }

        const module = await importFn();

        const ExtensionExport = module.default || module;

        if (!ExtensionExport) {
            throw new Error(`No extension export found in module for '${name}'`);
        }

        // If Extension is a factory function, call it with config
        if (typeof ExtensionExport === 'function') {
            return ExtensionExport(config);
        }

        // Otherwise return the extension directly
        return ExtensionExport;
    }

    static async loadMultiple(configs: ExtensionConfig[]): Promise<Extension[]> {
        const extensions: Extension[] = [];

        for (const config of configs) {
            try {
                const extension = await this.load(config.name, config.config);
                extensions.push(extension);
            } catch (error) {
                console.warn(`Failed to load extension '${config.name}':`, error);
            }
        }

        return extensions;
    }
}
