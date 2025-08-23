import { createTool } from '@mastra/core';
import { z } from 'zod';
import chalk from 'chalk';
import which from 'which';
import type { Extension, ExtensionContext, HookContext } from '@chat-tools/core';

// Shell extension demonstrating specialized domain expertise
export const shellExtension: Extension = {
    name: 'shell-extension',
    version: '1.0.0',
    description: 'Advanced shell scripting and command-line assistant',
    author: 'Chat Tools Team',
    license: 'MIT',
    keywords: ['shell', 'bash', 'scripting', 'terminal', 'commands'],

    capabilities: {
        providesTools: true,

        providesAgentTemplates: true,
        modifiesConfig: true,
        accessesStorage: true
    },

    dependencies: {
        chatTools: '>=0.1.0'
    },

    // Lifecycle hooks for shell-specific behavior
    hooks: {
        'agent:beforeCreate': async (context: HookContext & { config: any }) => {
            // Enhance agent with shell expertise
            if (context.config.agent && context.config.name?.toLowerCase().includes('shell')) {
                context.config.agent.systemPrompt += `

🐚 SHELL EXPERT MODE ACTIVATED

You are now enhanced with advanced shell scripting capabilities:

CORE EXPERTISE:
- Shell scripting (bash, zsh, fish, PowerShell)
- Command-line utilities and tools
- System administration tasks
- File operations and permissions
- Process management
- Environment variables
- Piping and redirection
- Regular expressions in shell context

SAFETY PROTOCOLS:
- Always explain potentially dangerous commands
- Suggest safer alternatives when possible
- Use relative paths unless absolute paths are required
- Validate commands before execution
- Warn about destructive operations

HELPFUL BEHAVIORS:
- Provide command explanations with examples
- Suggest optimizations and best practices
- Offer cross-platform alternatives when relevant
- Generate reusable scripts when appropriate
- Explain exit codes and error handling

Use the shell-specific tools to provide enhanced functionality.`;
            }
        },

        'agent:beforeToolCall': async (context: HookContext & { toolName: string; params: any }) => {
            if (context.toolName.startsWith('shell-')) {
                context.logger.info(`[Shell Extension] Executing ${context.toolName}`);

                // Add shell command validation
                if (context.params.command) {
                    const command = context.params.command.trim();
                    if (isDangerousCommand(command)) {
                        context.logger.warn(`[Shell Extension] Potentially dangerous command detected: ${command}`);
                    }
                }
            }
        },

        'approval:beforeRequest': async (context: HookContext & { toolName: string; params: any }) => {
            // Auto-approve safe shell operations
            if (context.toolName === 'shell-explain' || context.toolName === 'shell-validate') {
                context.logger.info(`[Shell Extension] Auto-approving safe operation: ${context.toolName}`);
                // Could modify approval context here
            }
        },

        'config:afterLoad': async (context: HookContext & { config: any }) => {
            // Add shell-specific approval rules
            if (context.config.approval && context.config.approval.rules) {
                context.config.approval.rules.push(
                    {
                        toolName: 'execute-command',
                        condition: (params: any) => isReadOnlyCommand(params.command),
                        action: 'allow',
                        message: 'Auto-approved read-only command',
                        priority: 10
                    },
                    {
                        toolName: 'execute-command',
                        condition: (params: any) => isDangerousCommand(params.command),
                        action: 'prompt',
                        message: 'This command could be destructive. Please review carefully.',
                        priority: 20
                    }
                );
            }
        }
    },

    async activate(context: ExtensionContext): Promise<void> {
        context.logger.info(`[Shell Extension] Activating shell scripting expertise...`);

        // Check available shells
        const availableShells = await detectAvailableShells();
        context.logger.info(`[Shell Extension] Detected shells: ${availableShells.join(', ')}`);

        // Setup shell-specific resources
        (context as any).shellInfo = {
            availableShells,
            platform: process.platform,
            preferredShell: getPreferredShell(availableShells),
            activatedAt: new Date()
        };

        context.utils.emit('extension:shell:activated', {
            availableShells,
            platform: process.platform
        });
    },

    async deactivate(context: ExtensionContext): Promise<void> {
        context.logger.info(`[Shell Extension] Deactivating shell extension...`);
        context.utils.emit('extension:shell:deactivated', {});
    },

    // Provide shell-specific tools
    async getTools(context: ExtensionContext): Promise<any[]> {
        const shellInfo = (context as any).shellInfo || {};

        return [
            // Command explanation tool
            createTool({
                id: 'shell-explain',
                description: 'Explain shell commands, their purpose, options, and potential risks',
                inputSchema: z.object({
                    command: z.string().describe('Shell command to explain'),
                    detailed: z.boolean().optional().default(false).describe('Provide detailed explanation with examples')
                }),
                outputSchema: z.object({
                    explanation: z.string(),
                    breakdown: z.array(z.object({
                        part: z.string(),
                        purpose: z.string()
                    })),
                    safety: z.object({
                        level: z.enum(['safe', 'caution', 'dangerous']),
                        warnings: z.array(z.string()).optional(),
                        alternatives: z.array(z.string()).optional()
                    }),
                    examples: z.array(z.string()).optional()
                }),
                execute: async ({ context: toolContext }: { context: any }) => {
                    return explainCommand(toolContext.command, toolContext.detailed);
                }
            }),

            // Command validation tool
            createTool({
                id: 'shell-validate',
                description: 'Validate shell command syntax and check for common issues',
                inputSchema: z.object({
                    command: z.string().describe('Shell command to validate'),
                    shell: z.enum(['bash', 'zsh', 'fish', 'powershell']).optional().describe('Target shell (auto-detect if not specified)')
                }),
                outputSchema: z.object({
                    valid: z.boolean(),
                    issues: z.array(z.object({
                        type: z.enum(['syntax', 'security', 'performance', 'portability']),
                        severity: z.enum(['info', 'warning', 'error']),
                        message: z.string(),
                        suggestion: z.string().optional()
                    })),
                    shell: z.string(),
                    corrected: z.string().optional()
                }),
                execute: async ({ context: toolContext }: { context: any }) => {
                    const targetShell = toolContext.shell || shellInfo.preferredShell || 'bash';
                    return validateCommand(toolContext.command, targetShell);
                }
            }),

            // Script generation tool
            createTool({
                id: 'shell-generate-script',
                description: 'Generate shell scripts for common tasks with best practices',
                inputSchema: z.object({
                    task: z.string().describe('Description of the task to accomplish'),
                    shell: z.enum(['bash', 'zsh', 'fish', 'powershell']).optional().describe('Target shell'),
                    includeComments: z.boolean().optional().default(true).describe('Include explanatory comments'),
                    errorHandling: z.boolean().optional().default(true).describe('Include error handling')
                }),
                outputSchema: z.object({
                    script: z.string(),
                    filename: z.string(),
                    permissions: z.string(),
                    usage: z.string(),
                    dependencies: z.array(z.string()).optional()
                }),
                execute: async ({ context: toolContext }: { context: any }) => {
                    const targetShell = toolContext.shell || shellInfo.preferredShell || 'bash';
                    return generateScript(toolContext.task, targetShell, {
                        includeComments: toolContext.includeComments,
                        errorHandling: toolContext.errorHandling
                    });
                }
            }),

            // Environment inspection tool
            createTool({
                id: 'shell-environment',
                description: 'Inspect shell environment, variables, and configuration',
                inputSchema: z.object({
                    category: z.enum(['variables', 'path', 'aliases', 'functions', 'all']).optional().default('all')
                }),
                outputSchema: z.object({
                    shell: z.string(),
                    environment: z.object({
                        variables: z.record(z.string()).optional(),
                        path: z.array(z.string()).optional(),
                        aliases: z.record(z.string()).optional(),
                        functions: z.array(z.string()).optional()
                    }),
                    config_files: z.array(z.string()).optional(),
                    recommendations: z.array(z.string()).optional()
                }),
                execute: async ({ context: toolContext }: { context: any }) => {
                    return inspectEnvironment(toolContext.category);
                }
            }),

            // Process management tool
            createTool({
                id: 'shell-process-info',
                description: 'Get information about running processes and system resources',
                inputSchema: z.object({
                    filter: z.string().optional().describe('Filter processes by name or pattern'),
                    sort: z.enum(['cpu', 'memory', 'pid', 'name']).optional().default('cpu'),
                    limit: z.number().optional().default(10).describe('Maximum number of processes to return')
                }),
                outputSchema: z.object({
                    processes: z.array(z.object({
                        pid: z.number(),
                        name: z.string(),
                        cpu: z.number(),
                        memory: z.number(),
                        status: z.string()
                    })),
                    system: z.object({
                        load_average: z.array(z.number()).optional(),
                        memory_usage: z.object({
                            total: z.number(),
                            used: z.number(),
                            free: z.number()
                        }).optional(),
                        disk_usage: z.object({
                            total: z.number(),
                            used: z.number(),
                            available: z.number()
                        }).optional()
                    })
                }),
                execute: async ({ context: toolContext }: { context: any }) => {
                    return getProcessInfo(toolContext.filter, toolContext.sort, toolContext.limit);
                }
            }),

            // One-liner tool
            createTool({
                id: 'shell-oneliner',
                description: 'Generate powerful shell one-liners for common tasks',
                inputSchema: z.object({
                    task: z.string().describe('What you want to accomplish'),
                    context: z.string().optional().describe('Additional context or constraints')
                }),
                outputSchema: z.object({
                    command: z.string(),
                    explanation: z.string(),
                    variations: z.array(z.object({
                        command: z.string(),
                        description: z.string()
                    })).optional(),
                    safety_notes: z.array(z.string()).optional()
                }),
                execute: async ({ context: toolContext }: { context: any }) => {
                    return generateOneLiner(toolContext.task, toolContext.context);
                }
            })
        ];
    },



    // Provide agent templates
    async getAgentTemplates(context: ExtensionContext): Promise<any[]> {
        return [
            {
                name: 'Shell Expert',
                description: 'Advanced shell scripting and command-line assistant',
                category: 'development',
                config: {
                    systemPrompt: `You are an expert shell scripting assistant with deep knowledge of:

- Bash, Zsh, Fish, and PowerShell
- Unix/Linux command-line utilities
- System administration tasks
- Advanced shell scripting patterns
- Performance optimization
- Security best practices

Always prioritize safety and explain potentially dangerous operations.`,
                    tools: ['shell-explain', 'shell-validate', 'shell-generate-script', 'shell-environment', 'shell-oneliner'],
                    mcpServers: [],
                    memory: {
                        enabled: true,
                        type: 'conversation',
                        maxEntries: 100
                    },
                    behavior: {
                        proactive: true,
                        suggestActions: true,
                        explainReasoning: true
                    }
                },
                requiredTools: ['shell-explain', 'shell-validate', 'shell-generate-script'],
                examples: [
                    'Explain this command: `find . -type f -name "*.log" -mtime +7 -delete`',
                    'Generate a script to backup a directory with rotation',
                    'Help me optimize this shell pipeline for better performance'
                ]
            }
        ];
    },

    // Configuration schema for shell extension
    async getConfigSchema(context: ExtensionContext): Promise<Record<string, any>> {
        return {
            type: 'object',
            properties: {
                enabled: {
                    type: 'boolean',
                    default: true,
                    description: 'Enable shell extension'
                },
                preferredShell: {
                    type: 'string',
                    enum: ['bash', 'zsh', 'fish', 'powershell'],
                    description: 'Preferred shell for script generation'
                },
                safetyLevel: {
                    type: 'string',
                    enum: ['strict', 'moderate', 'permissive'],
                    default: 'moderate',
                    description: 'Safety level for command approval'
                },
                autoExplain: {
                    type: 'boolean',
                    default: false,
                    description: 'Automatically explain commands before execution'
                },
                scriptDefaults: {
                    type: 'object',
                    properties: {
                        includeShebang: {
                            type: 'boolean',
                            default: true
                        },
                        includeComments: {
                            type: 'boolean',
                            default: true
                        },
                        errorHandling: {
                            type: 'boolean',
                            default: true
                        }
                    }
                }
            }
        };
    }
};

// Helper functions for shell operations
async function detectAvailableShells(): Promise<string[]> {
    const shells = ['bash', 'zsh', 'fish', 'sh'];
    const available: string[] = [];

    for (const shell of shells) {
        try {
            await which(shell);
            available.push(shell);
        } catch {
            // Shell not available
        }
    }

    // Check for PowerShell on Windows
    if (process.platform === 'win32') {
        try {
            await which('powershell');
            available.push('powershell');
        } catch {
            // PowerShell not available
        }
    }

    return available;
}

function getPreferredShell(available: string[]): string {
    const preferences = ['zsh', 'bash', 'fish', 'sh', 'powershell'];

    for (const shell of preferences) {
        if (available.includes(shell)) {
            return shell;
        }
    }

    return available[0] || 'bash';
}

function isDangerousCommand(command: string): boolean {
    const dangerous = [
        /rm\s+-rf/i,
        /sudo\s+rm/i,
        />\s*\/dev\/sd[a-z]/i,
        /dd\s+.*of=/i,
        /mkfs/i,
        /fdisk/i,
        /format/i,
        /del\s+\/[sq]/i,
        /rmdir\s+\/s/i,
        /:\(\)\{.*\}/  // fork bomb
    ];

    return dangerous.some(pattern => pattern.test(command));
}

function isReadOnlyCommand(command: string): boolean {
    const readOnly = [
        /^ls\b/i,
        /^ll\b/i,
        /^dir\b/i,
        /^pwd\b/i,
        /^whoami\b/i,
        /^id\b/i,
        /^ps\b/i,
        /^top\b/i,
        /^htop\b/i,
        /^cat\b/i,
        /^less\b/i,
        /^more\b/i,
        /^head\b/i,
        /^tail\b/i,
        /^grep\b/i,
        /^find\b.*(?!-delete)/i,
        /^which\b/i,
        /^whereis\b/i,
        /^man\b/i,
        /^help\b/i,
        /^history\b/i,
        /^env\b/i,
        /^printenv\b/i,
        /^echo\b/i,
        /^date\b/i,
        /^uptime\b/i,
        /^df\b/i,
        /^du\b/i,
        /^mount\b(?!\s)/i,
        /^lsblk\b/i,
        /^netstat\b/i,
        /^ss\b/i
    ];

    return readOnly.some(pattern => pattern.test(command.trim()));
}

async function explainCommand(command: string, detailed: boolean): Promise<any> {
    // This would integrate with a command explanation database/API
    // For now, providing a structured response format

    const breakdown = command.split(/\s+/).map(part => ({
        part,
        purpose: `Part of command: ${part}` // Would be more detailed in real implementation
    }));

    const safety = {
        level: isDangerousCommand(command) ? 'dangerous' :
            isReadOnlyCommand(command) ? 'safe' : 'caution',
        warnings: isDangerousCommand(command) ? ['This command can modify or delete files'] : undefined,
        alternatives: undefined
    };

    return {
        explanation: `Command analysis for: ${command}`,
        breakdown,
        safety,
        examples: detailed ? [`Example usage: ${command}`] : undefined
    };
}

async function validateCommand(command: string, shell: string): Promise<any> {
    const issues = [];

    // Basic validation logic
    if (command.includes('rm -rf /')) {
        issues.push({
            type: 'security',
            severity: 'error',
            message: 'Command attempts to delete root filesystem',
            suggestion: 'Use specific paths instead of root'
        });
    }

    return {
        valid: issues.length === 0,
        issues,
        shell,
        corrected: issues.length > 0 ? undefined : command
    };
}

async function generateScript(task: string, shell: string, options: any): Promise<any> {
    // Script generation logic would go here
    const script = `#!/bin/${shell}
# Generated script for: ${task}
# Created: ${new Date().toISOString()}

${options.errorHandling ? 'set -euo pipefail\n' : ''}
${options.includeComments ? '# TODO: Implement task logic here\n' : ''}
echo "Executing task: ${task}"
`;

    return {
        script,
        filename: `task_${Date.now()}.sh`,
        permissions: '755',
        usage: `chmod +x script.sh && ./script.sh`,
        dependencies: []
    };
}

async function inspectEnvironment(category: string): Promise<any> {
    const result: any = {
        shell: process.env.SHELL || 'unknown',
        environment: {}
    };

    if (category === 'all' || category === 'variables') {
        // Filter sensitive environment variables
        const filtered = Object.fromEntries(
            Object.entries(process.env).filter(([key]) =>
                !key.toLowerCase().includes('password') &&
                !key.toLowerCase().includes('secret') &&
                !key.toLowerCase().includes('token') &&
                !key.toLowerCase().includes('key')
            )
        );
        result.environment.variables = filtered;
    }

    if (category === 'all' || category === 'path') {
        result.environment.path = (process.env.PATH || '').split(process.platform === 'win32' ? ';' : ':');
    }

    return result;
}

async function getProcessInfo(filter?: string, sort?: string, limit?: number): Promise<any> {
    // This would integrate with system process APIs
    return {
        processes: [],
        system: {
            memory_usage: {
                total: 0,
                used: 0,
                free: 0
            }
        }
    };
}

async function generateOneLiner(task: string, context?: string): Promise<any> {
    // One-liner generation logic
    return {
        command: `echo "One-liner for: ${task}"`,
        explanation: `This command demonstrates the requested task: ${task}`,
        variations: [
            {
                command: `echo "Alternative approach"`,
                description: "Alternative implementation"
            }
        ],
        safety_notes: ["This is a safe demonstration command"]
    };
}

