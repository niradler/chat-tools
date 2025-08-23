// Core configuration types
export interface ChatToolsConfig {
  name: string;
  version?: string;

  // AI Provider configuration
  ai: {
    provider: 'openai' | 'anthropic' | 'ollama' | 'local';
    model: string;
    apiKey?: string;
    baseUrl?: string;
    maxTokens?: number;
    temperature?: number;
  };

  // Database configuration
  database: {
    path: string;
  };

  // MCP Server configurations
  mcp: {
    servers: MCPServerConfig[];
    timeout: number;
  };

  // Approval system configuration  
  approval?: {
    enabled?: boolean;
  };

  // Agent behavior and prompts
  agent: {
    systemPrompt: string;
    templates: Record<string, string>;
    behavior: {
      conversational: boolean;
      helpful: boolean;
      concise: boolean;
      explainCommands: boolean;
    };
    memory: {
      enabled: boolean;
      contextWindow: number;
      summarizeAfter: number; // messages
    };
  };

  // UI customization
  ui: {
    theme: 'light' | 'dark' | 'auto';
    showTimestamps: boolean;
    showTokenCount: boolean;
    maxDisplayMessages: number;
  };

  // Extension configurations
  extensions: ExtensionConfig[];

  // Tool configurations
  tools: {
    enabled: string[];
    disabled: string[];
    custom: CustomToolConfig[];
  };
}

export interface MCPServerConfig {
  name: string;
  type: 'stdio' | 'http' | 'websocket';

  // For stdio servers
  command?: string;
  args?: string[];
  env?: Record<string, string>;

  // For HTTP/WebSocket servers
  url?: string;
  headers?: Record<string, string>;

  // Common options
  timeout?: number;
  retries?: number;
  description?: string;
}



export interface ExtensionConfig {
  name: string;
  enabled: boolean;
  config?: Record<string, any>;
  source?: 'npm' | 'local' | 'git';
  path?: string;
}

export interface CustomToolConfig {
  name: string;
  description: string;
  schema: Record<string, any>; // JSON Schema
  handler: string; // Path to handler file or npm package
  requiresApproval?: boolean;
  category?: string;
}

// Agent types
export interface Agent {
  id: string;
  name: string;
  description: string;
  config: AgentConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentConfig {
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  tools: string[];
  mcpServers: string[];
  memory: {
    enabled: boolean;
    type: 'conversation' | 'semantic' | 'hybrid';
    maxEntries: number;
  };
  behavior: {
    proactive: boolean;
    suggestActions: boolean;
    explainReasoning: boolean;
  };
}

// Reusable agent templates
export interface AgentTemplate {
  name: string;
  description: string;
  category: 'general' | 'development' | 'productivity' | 'research' | 'custom';
  config: Partial<AgentConfig>;
  requiredTools?: string[];
  suggestedExtensions?: string[];
  examples: string[];
}

// Tool types
export interface Tool {
  name: string;
  description: string;
  schema: Record<string, any>;
  handler: (params: any, context: ToolContext) => Promise<any>;
  requiresApproval?: boolean;
  category?: string;
  metadata?: {
    author?: string;
    version?: string;
    documentation?: string;
  };
}

export interface ToolContext {
  conversationId: string;
  userId?: string;
  workingDirectory: string;
  environment: Record<string, string>;
  storage: any; // Storage provider instance
  logger: Logger;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    executionTime?: number;
    resources?: string[];
    warnings?: string[];
  };
}

// Extension lifecycle hooks
export interface ExtensionHooks {
  // Framework lifecycle
  'framework:beforeInit'?: (context: HookContext) => Promise<void> | void;
  'framework:afterInit'?: (context: HookContext) => Promise<void> | void;
  'framework:beforeShutdown'?: (context: HookContext) => Promise<void> | void;
  'framework:afterShutdown'?: (context: HookContext) => Promise<void> | void;

  // Agent lifecycle
  'agent:beforeCreate'?: (context: HookContext & { config: any }) => Promise<void> | void;
  'agent:afterCreate'?: (context: HookContext & { agent: any }) => Promise<void> | void;
  'agent:beforeGenerate'?: (context: HookContext & { message: string; options?: any }) => Promise<void> | void;
  'agent:afterGenerate'?: (context: HookContext & { message: string; response: string }) => Promise<void> | void;
  'agent:beforeToolCall'?: (context: HookContext & { toolName: string; params: any }) => Promise<void> | void;
  'agent:afterToolCall'?: (context: HookContext & { toolName: string; params: any; result: any }) => Promise<void> | void;

  // Storage lifecycle
  'storage:beforeSave'?: (context: HookContext & { data: any }) => Promise<void> | void;
  'storage:afterSave'?: (context: HookContext & { data: any }) => Promise<void> | void;
  'storage:beforeLoad'?: (context: HookContext & { query: any }) => Promise<void> | void;
  'storage:afterLoad'?: (context: HookContext & { query: any; result: any }) => Promise<void> | void;

  // MCP lifecycle
  'mcp:beforeServerConnect'?: (context: HookContext & { serverConfig: MCPServerConfig }) => Promise<void> | void;
  'mcp:afterServerConnect'?: (context: HookContext & { serverConfig: MCPServerConfig }) => Promise<void> | void;
  'mcp:beforeToolCall'?: (context: HookContext & { serverName: string; toolName: string; params: any }) => Promise<void> | void;
  'mcp:afterToolCall'?: (context: HookContext & { serverName: string; toolName: string; params: any; result: any }) => Promise<void> | void;

  // Approval lifecycle
  'approval:beforeRequest'?: (context: HookContext & { toolName: string; params: any }) => Promise<void> | void;
  'approval:afterRequest'?: (context: HookContext & { toolName: string; params: any; approved: boolean }) => Promise<void> | void;

  // UI lifecycle
  'ui:beforeRender'?: (context: HookContext & { component: string }) => Promise<void> | void;
  'ui:afterRender'?: (context: HookContext & { component: string }) => Promise<void> | void;
  'ui:beforeInput'?: (context: HookContext & { input: string }) => Promise<void> | void;
  'ui:afterInput'?: (context: HookContext & { input: string }) => Promise<void> | void;

  // Configuration lifecycle
  'config:beforeLoad'?: (context: HookContext & { configPath: string }) => Promise<void> | void;
  'config:afterLoad'?: (context: HookContext & { config: ChatToolsConfig }) => Promise<void> | void;
  'config:beforeValidate'?: (context: HookContext & { config: any }) => Promise<void> | void;
  'config:afterValidate'?: (context: HookContext & { config: any; isValid: boolean }) => Promise<void> | void;
}

export interface HookContext {
  extensionId: string;
  timestamp: Date;
  workspaceRoot: string;
  logger: Logger;
  storage?: any;
  agent?: any;
  framework?: any;
  [key: string]: any;
}

// Enhanced extension interface with hooks and capabilities
export interface Extension {
  // Basic metadata
  name: string;
  version: string;
  description: string;
  author?: string;
  homepage?: string;
  license?: string;
  keywords?: string[];

  // Dependency management
  dependencies?: {
    chatTools?: string; // Minimum framework version
    extensions?: Record<string, string>; // Other required extensions
    npm?: Record<string, string>; // NPM dependencies
  };

  // Extension capabilities
  capabilities?: {
    providesTools?: boolean;
    providesMCPServers?: boolean;
    providesAgentTemplates?: boolean;
    providesUIComponents?: boolean;
    modifiesConfig?: boolean;
    accessesStorage?: boolean;
    accessesNetwork?: boolean;
  };

  // Lifecycle hooks
  hooks?: ExtensionHooks;

  // Main lifecycle methods
  activate?(context: ExtensionContext): Promise<void> | void;
  deactivate?(context: ExtensionContext): Promise<void> | void;

  // Dynamic capability providers
  getTools?(context: ExtensionContext): Tool[] | Promise<Tool[]>;
  getMCPServers?(context: ExtensionContext): MCPServerConfig[] | Promise<MCPServerConfig[]>;
  getAgentTemplates?(context: ExtensionContext): AgentTemplate[] | Promise<AgentTemplate[]>;
  getUIComponents?(context: ExtensionContext): UIComponent[] | Promise<UIComponent[]>;

  // Configuration management
  getConfigSchema?(context: ExtensionContext): Record<string, any> | Promise<Record<string, any>>;
  validateConfig?(config: any, context: ExtensionContext): boolean | Promise<boolean>;
  getDefaultConfig?(context: ExtensionContext): Record<string, any> | Promise<Record<string, any>>;

  // Extension commands
  getCommands?(context: ExtensionContext): ExtensionCommand[] | Promise<ExtensionCommand[]>;

  // Middleware providers
  getMiddleware?(context: ExtensionContext): ExtensionMiddleware[] | Promise<ExtensionMiddleware[]>;
}

export interface ExtensionContext {
  // Basic context
  extensionId: string;
  workspaceRoot: string;
  extensionPath: string;
  logger: Logger;
  config: Record<string, any>;

  // Framework access
  framework: {
    version: string;
    storage?: any;
    eventEmitter: EventEmitter;
    hookManager: HookManager;
  };

  // Extension management
  extensions: {
    get(id: string): Extension | undefined;
    list(): Extension[];
    isActive(id: string): boolean;
  };

  // Utility functions
  utils: {
    resolve(path: string): string;
    require(moduleName: string): any;
    emit(event: string, data: any): void;
    subscribe(event: string, handler: Function): () => void;
  };
}

export interface UIComponent {
  name: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
  slot?: 'header' | 'footer' | 'sidebar' | 'main' | 'modal' | 'overlay';
  priority?: number;
}

export interface ExtensionCommand {
  name: string;
  description: string;
  handler: (args: string[], context: ExtensionContext) => Promise<void> | void;
  options?: {
    name: string;
    description: string;
    required?: boolean;
    type?: 'string' | 'number' | 'boolean';
  }[];
}

export interface ExtensionMiddleware {
  name: string;
  type: 'agent' | 'storage' | 'mcp' | 'approval' | 'ui';
  handler: (context: any, next: () => Promise<any>) => Promise<any>;
  priority?: number;
}

// Extension management interfaces
export interface ExtensionManager {
  register(extension: Extension): Promise<void>;
  unregister(extensionId: string): Promise<void>;
  activate(extensionId: string): Promise<void>;
  deactivate(extensionId: string): Promise<void>;
  list(): Extension[];
  get(extensionId: string): Extension | undefined;
  isActive(extensionId: string): boolean;
  getDependencies(extensionId: string): string[];
  executeHook(hookName: keyof ExtensionHooks, context: HookContext): Promise<void>;
}

export interface HookManager {
  register(hookName: keyof ExtensionHooks, handler: Function, extensionId: string): void;
  unregister(hookName: keyof ExtensionHooks, extensionId: string): void;
  execute(hookName: keyof ExtensionHooks, context: HookContext): Promise<void>;
  list(): Record<keyof ExtensionHooks, string[]>;
}

export interface EventEmitter {
  on(event: string, handler: Function): () => void;
  emit(event: string, data: any): void;
  off(event: string, handler: Function): void;
  once(event: string, handler: Function): () => void;
}

// Logging interface
export interface Logger {
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

// Events system
export interface ChatEvent {
  type: string;
  timestamp: Date;
  data: any;
}

export interface EventHandler {
  (event: ChatEvent): void | Promise<void>;
}

// Configuration utilities
export interface ConfigLoader {
  load(path?: string): Promise<ChatToolsConfig>;
  save(config: ChatToolsConfig, path?: string): Promise<void>;
  validate(config: any): ChatToolsConfig;
  merge(base: ChatToolsConfig, override: Partial<ChatToolsConfig>): ChatToolsConfig;
}
