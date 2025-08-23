import type { ChatToolsConfig } from '@chat-tools/core';

export interface ValidationResult {
  success: boolean;
  errors: string[];
}

export function validateConfig(config: any): ValidationResult {
  const errors: string[] = [];

  // Basic structure validation
  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be a valid object');
    return { success: false, errors };
  }

  // Name validation
  if (!config.name || typeof config.name !== 'string') {
    errors.push('Configuration must have a valid name');
  }

  // AI configuration validation
  if (!config.ai || typeof config.ai !== 'object') {
    errors.push('AI configuration is required');
  } else {
    const validProviders = ['ollama', 'openai', 'anthropic', 'local'];
    if (!validProviders.includes(config.ai.provider)) {
      errors.push(`AI provider must be one of: ${validProviders.join(', ')}`);
    }

    if (!config.ai.model || typeof config.ai.model !== 'string') {
      errors.push('AI model is required');
    }

    if (config.ai.temperature !== undefined) {
      if (typeof config.ai.temperature !== 'number' || config.ai.temperature < 0 || config.ai.temperature > 2) {
        errors.push('AI temperature must be a number between 0 and 2');
      }
    }

    if (config.ai.maxTokens !== undefined) {
      if (typeof config.ai.maxTokens !== 'number' || config.ai.maxTokens < 1) {
        errors.push('AI maxTokens must be a positive number');
      }
    }
  }

  // Database configuration validation
  if (!config.database || typeof config.database !== 'object') {
    errors.push('Database configuration is required');
  } else {
    if (!config.database.path || typeof config.database.path !== 'string') {
      errors.push('Database path is required');
    }
  }

  // MCP configuration validation
  if (!config.mcp || typeof config.mcp !== 'object') {
    errors.push('MCP configuration is required');
  } else {
    if (!Array.isArray(config.mcp.servers)) {
      errors.push('MCP servers must be an array');
    } else {
      config.mcp.servers.forEach((server: any, index: number) => {
        if (!server.name || typeof server.name !== 'string') {
          errors.push(`MCP server ${index + 1}: name is required`);
        }

        const validTypes = ['stdio', 'http', 'websocket'];
        if (!validTypes.includes(server.type)) {
          errors.push(`MCP server ${index + 1}: type must be one of: ${validTypes.join(', ')}`);
        }

        if (server.type === 'stdio' && (!server.command || typeof server.command !== 'string')) {
          errors.push(`MCP server ${index + 1}: command is required for stdio servers`);
        }

        if ((server.type === 'http' || server.type === 'websocket') && (!server.url || typeof server.url !== 'string')) {
          errors.push(`MCP server ${index + 1}: url is required for ${server.type} servers`);
        }
      });
    }

    if (config.mcp.timeout !== undefined) {
      if (typeof config.mcp.timeout !== 'number' || config.mcp.timeout < 1000) {
        errors.push('MCP timeout must be at least 1000ms');
      }
    }
  }

  // Approval configuration validation (simplified)
  if (config.approval && typeof config.approval === 'object') {
    if (config.approval.enabled !== undefined && typeof config.approval.enabled !== 'boolean') {
      errors.push('Approval enabled must be a boolean');
    }
  }

  // Agent configuration validation
  if (!config.agent || typeof config.agent !== 'object') {
    errors.push('Agent configuration is required');
  } else {
    if (!config.agent.systemPrompt || typeof config.agent.systemPrompt !== 'string') {
      errors.push('Agent system prompt is required');
    }
  }

  // Tools configuration validation
  if (!config.tools || typeof config.tools !== 'object') {
    errors.push('Tools configuration is required');
  } else {
    if (!Array.isArray(config.tools.enabled)) {
      errors.push('Tools enabled must be an array');
    }

    if (!Array.isArray(config.tools.disabled)) {
      errors.push('Tools disabled must be an array');
    }

    if (!Array.isArray(config.tools.custom)) {
      errors.push('Tools custom must be an array');
    }
  }

  return {
    success: errors.length === 0,
    errors
  };
}
