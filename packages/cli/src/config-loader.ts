import { promises as fs } from 'fs';
import { resolve, dirname } from 'path';
import type { ChatToolsConfig } from '@chat-tools/core';
import { AGENT_TEMPLATES } from '@chat-tools/core';

export class ConfigLoader {
  async load(configPath: string): Promise<ChatToolsConfig> {
    try {
      const fullPath = resolve(configPath);
      const configData = await fs.readFile(fullPath, 'utf-8');
      const config = JSON.parse(configData) as ChatToolsConfig;

      // Apply defaults
      return this.applyDefaults(config);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Configuration file not found: ${configPath}`);
      }
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  async save(config: ChatToolsConfig, configPath: string): Promise<void> {
    try {
      const fullPath = resolve(configPath);
      const dir = dirname(fullPath);

      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true });

      // Write config with pretty formatting
      const configData = JSON.stringify(config, null, 2);
      await fs.writeFile(fullPath, configData, 'utf-8');
    } catch (error: any) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  async createTemplate(templateName: string, outputPath: string): Promise<void> {
    const template = this.getTemplate(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    const config = this.createConfigFromTemplate(template);
    await this.save(config, outputPath);
  }

  private getTemplate(name: string) {
    return AGENT_TEMPLATES.find(template =>
      template.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  private createConfigFromTemplate(template: any): ChatToolsConfig {
    return {
      name: template.name,
      version: '1.0.0',

      ai: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 2000
      },

      database: {
        path: './chat-tools.db'
      },

      mcp: {
        servers: [],
        timeout: 30000
      },

      approval: {
        enabled: true
      },

      agent: {
        systemPrompt: template.config.systemPrompt || 'You are a helpful assistant.',
        templates: {},
        behavior: {
          conversational: true,
          helpful: true,
          concise: false,
          explainCommands: true
        },
        memory: {
          enabled: true,
          contextWindow: 10,
          summarizeAfter: 50
        }
      },

      ui: {
        theme: 'auto',
        showTimestamps: true,
        showTokenCount: false,
        maxDisplayMessages: 100
      },

      extensions: [],

      tools: {
        enabled: template.requiredTools || ['executeCommand', 'fileOperations'],
        disabled: [],
        custom: []
      }
    };
  }

  private applyDefaults(config: ChatToolsConfig): ChatToolsConfig {
    return {
      ...config,
      version: config.version || '1.0.0',

      ai: {
        ...config.ai,
        provider: config.ai?.provider || 'openai',
        model: config.ai?.model || 'gpt-4o-mini',
        temperature: config.ai?.temperature ?? 0.7,
        maxTokens: config.ai?.maxTokens ?? 2000
      },

      database: {
        path: config.database?.path || './chat-tools.db'
      },

      mcp: {
        ...config.mcp,
        servers: config.mcp?.servers || [],
        timeout: config.mcp?.timeout ?? 30000
      },

      approval: {
        enabled: config.approval?.enabled ?? true
      },

      agent: {
        ...config.agent,
        systemPrompt: config.agent?.systemPrompt || 'You are a helpful assistant.',
        templates: config.agent?.templates || {},
        behavior: config.agent?.behavior || {
          conversational: true,
          helpful: true,
          concise: false,
          explainCommands: true
        },
        memory: config.agent?.memory || {
          enabled: true,
          contextWindow: 10,
          summarizeAfter: 50
        }
      },

      ui: {
        ...config.ui,
        theme: config.ui?.theme || 'auto',
        showTimestamps: config.ui?.showTimestamps ?? true,
        showTokenCount: config.ui?.showTokenCount ?? false,
        maxDisplayMessages: config.ui?.maxDisplayMessages ?? 100
      },

      extensions: config.extensions || [],

      tools: {
        ...config.tools,
        enabled: config.tools?.enabled || ['executeCommand', 'fileOperations'],
        disabled: config.tools?.disabled || [],
        custom: config.tools?.custom || []
      }
    };
  }
}
