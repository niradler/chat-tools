export * from './types';
import { ChatToolsConfig, AgentTemplate } from './types';

// Default configurations
export const DEFAULT_CONFIG: Partial<ChatToolsConfig> = {
  name: 'Chat Tools Assistant',
  version: '1.0.0',

  ai: {
    provider: 'openai',
    model: 'gpt-4',
    maxTokens: 4000,
    temperature: 0.7,
  },

  database: {
    path: './data/chat.db',
  },

  mcp: {
    servers: [],
    timeout: 10000,
  },

  approval: {
    enabled: true,
  },

  agent: {
    systemPrompt: `You are a helpful AI assistant running in a terminal environment. You can:
- Have conversations and answer questions
- Execute shell commands (with user approval for dangerous operations)
- Use various tools through MCP servers
- Remember context from previous messages

Always be helpful, accurate, and explain what you're doing when using tools.
When executing commands, explain what the command does before running it.`,

    templates: {
      greeting: 'Hello! I\'m your terminal AI assistant. How can I help you today?',
      commandExplanation: 'This command will: {explanation}',
      approvalRequest: 'I need to run: {command}\nThis will: {explanation}\nDo you approve?',
    },

    behavior: {
      conversational: true,
      helpful: true,
      concise: false,
      explainCommands: true,
    },

    memory: {
      enabled: true,
      contextWindow: 10000,
      summarizeAfter: 50,
    },
  },

  ui: {
    theme: 'auto',
    showTimestamps: true,
    showTokenCount: false,
    maxDisplayMessages: 100,
  },

  extensions: [],

  tools: {
    enabled: ['execute_command', 'read_file', 'write_file'],
    disabled: [],
    custom: [],
  },
};

// Built-in agent templates
export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    name: 'General Assistant',
    description: 'A helpful general-purpose AI assistant for everyday tasks',
    category: 'general',
    config: {
      systemPrompt: DEFAULT_CONFIG.agent!.systemPrompt!,
      temperature: 0.7,
      maxTokens: 4000,
      behavior: {
        proactive: true,
        suggestActions: true,
        explainReasoning: true,
      },
    },
    requiredTools: ['execute_command'],
    examples: [
      'Help me organize my files',
      'Explain this error message',
      'Create a backup script',
    ],
  },

  {
    name: 'Development Helper',
    description: 'Specialized assistant for software development tasks',
    category: 'development',
    config: {
      systemPrompt: `You are an expert software development assistant. You can:
- Help with code review and debugging
- Generate scripts and automation
- Manage git repositories
- Run tests and build processes
- Explain technical concepts

Focus on best practices, security, and maintainable code.`,
      temperature: 0.3,
      maxTokens: 6000,
      tools: ['execute_command', 'read_file', 'write_file', 'git_operations'],
      behavior: {
        proactive: true,
        suggestActions: true,
        explainReasoning: true,
      },
    },
    requiredTools: ['execute_command', 'read_file', 'write_file'],
    suggestedExtensions: ['git-tools', 'code-analysis'],
    examples: [
      'Review this code for security issues',
      'Create a CI/CD pipeline',
      'Debug this error in my application',
    ],
  },

  {
    name: 'Shell Expert',
    description: 'Command-line focused assistant for shell scripting and system administration',
    category: 'productivity',
    config: {
      systemPrompt: `You are a shell scripting and system administration expert. You can:
- Generate complex bash/zsh scripts
- Explain command-line tools and options
- Help with system configuration
- Automate repetitive tasks
- Troubleshoot system issues

Always prioritize safety and explain potentially dangerous operations.`,
      temperature: 0.2,
      maxTokens: 4000,
      behavior: {
        proactive: false,
        suggestActions: true,
        explainReasoning: true,
      },
    },
    requiredTools: ['execute_command'],
    examples: [
      'Create a backup script for my home directory',
      'Find all files larger than 100MB',
      'Set up log rotation for my application',
    ],
  },
];
