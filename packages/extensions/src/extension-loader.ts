import { resolve, join } from 'path';
import { promises as fs } from 'fs';
import type { Extension, Logger } from '@chat-tools/core';

export interface ExtensionPackage {
    name: string;
    version: string;
    description?: string;
    main?: string;
    chatTools?: {
        extension: string; // Path to extension entry point
        config?: string;   // Path to default config
    };
    dependencies?: Record<string, string>;
    [key: string]: any;
}

export class ExtensionLoader {
    private logger: Logger;
    private workspaceRoot: string;

    constructor(workspaceRoot: string, logger: Logger) {
        this.workspaceRoot = workspaceRoot;
        this.logger = logger;
    }

    async loadFromDirectory(extensionPath: string): Promise<Extension> {
        this.logger.info(`Loading extension from directory: ${extensionPath}`);

        const packagePath = join(extensionPath, 'package.json');
        const packageData = await this.readPackageJson(packagePath);

        // Determine entry point
        const entryPoint = this.getEntryPoint(packageData, extensionPath);

        // Load the extension module
        const extensionModule = await this.loadModule(entryPoint);

        // Extract extension from module
        const extension = this.extractExtension(extensionModule, packageData);

        this.logger.info(`Extension loaded successfully: ${extension.name}`);
        return extension;
    }

    async loadFromNpm(packageName: string): Promise<Extension> {
        this.logger.info(`Loading extension from npm: ${packageName}`);

        try {
            // Resolve the package
            const packagePath = require.resolve(`${packageName}/package.json`);
            const packageDir = join(packagePath, '..');

            return this.loadFromDirectory(packageDir);
        } catch (error: any) {
            throw new Error(`Failed to load npm package ${packageName}: ${error.message}`);
        }
    }

    async discoverExtensions(extensionsDir: string): Promise<Extension[]> {
        this.logger.info(`Discovering extensions in: ${extensionsDir}`);

        try {
            const entries = await fs.readdir(extensionsDir, { withFileTypes: true });
            const extensions: Extension[] = [];

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    try {
                        const extensionPath = join(extensionsDir, entry.name);
                        const extension = await this.loadFromDirectory(extensionPath);
                        extensions.push(extension);
                    } catch (error: any) {
                        this.logger.warn(`Failed to load extension from ${entry.name}:`, error.message);
                    }
                }
            }

            this.logger.info(`Discovered ${extensions.length} extensions`);
            return extensions;
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                this.logger.info(`Extensions directory not found: ${extensionsDir}`);
                return [];
            }
            throw error;
        }
    }

    async loadFromConfig(extensionConfigs: any[]): Promise<Extension[]> {
        const extensions: Extension[] = [];

        for (const config of extensionConfigs) {
            try {
                let extension: Extension;

                if (config.source === 'local' && config.path) {
                    const fullPath = resolve(this.workspaceRoot, config.path);
                    extension = await this.loadFromDirectory(fullPath);
                } else if (config.source === 'npm' && config.name) {
                    extension = await this.loadFromNpm(config.name);
                } else if (config.source === 'git' && config.path) {
                    // TODO: Implement git loading
                    throw new Error('Git loading not yet implemented');
                } else {
                    throw new Error(`Invalid extension config: ${JSON.stringify(config)}`);
                }

                extensions.push(extension);
            } catch (error: any) {
                this.logger.error(`Failed to load extension from config:`, error.message);
            }
        }

        return extensions;
    }

    private async readPackageJson(packagePath: string): Promise<ExtensionPackage> {
        try {
            const content = await fs.readFile(packagePath, 'utf-8');
            return JSON.parse(content);
        } catch (error: any) {
            throw new Error(`Failed to read package.json: ${error.message}`);
        }
    }

    private getEntryPoint(packageData: ExtensionPackage, extensionPath: string): string {
        // Check for chat-tools specific entry point
        if (packageData.chatTools?.extension) {
            return resolve(extensionPath, packageData.chatTools.extension);
        }

        // Check for standard main field
        if (packageData.main) {
            return resolve(extensionPath, packageData.main);
        }

        // Default to index.js
        return resolve(extensionPath, 'index.js');
    }

    private async loadModule(entryPoint: string): Promise<any> {
        try {
            // Clear require cache to ensure fresh load
            delete require.cache[entryPoint];

            // Load the module
            const extensionModule = require(entryPoint);

            return extensionModule;
        } catch (error: any) {
            throw new Error(`Failed to load extension module from ${entryPoint}: ${error.message}`);
        }
    }

    private extractExtension(extensionModule: any, packageData: ExtensionPackage): Extension {
        // Try different export patterns
        let extension: Extension;

        if (extensionModule.default && typeof extensionModule.default === 'object') {
            // ES6 default export
            extension = extensionModule.default;
        } else if (extensionModule.extension && typeof extensionModule.extension === 'object') {
            // Named export
            extension = extensionModule.extension;
        } else if (typeof extensionModule === 'object' && extensionModule.name) {
            // Direct object export
            extension = extensionModule;
        } else {
            throw new Error('Extension module must export an Extension object');
        }

        // Merge package.json metadata
        const mergedExtension: Extension = {
            ...extension,
            name: extension.name || packageData.name,
            version: extension.version || packageData.version,
            description: extension.description || packageData.description || '',
            author: extension.author || packageData.author,
            license: extension.license || packageData.license,
            homepage: extension.homepage || packageData.homepage
        };

        // Validate required fields
        if (!mergedExtension.name) {
            throw new Error('Extension must have a name');
        }

        if (!mergedExtension.version) {
            throw new Error('Extension must have a version');
        }

        return mergedExtension;
    }
}
