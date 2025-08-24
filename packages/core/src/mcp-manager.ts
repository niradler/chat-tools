import { experimental_createMCPClient as createMCPClient } from 'ai';
import { Experimental_StdioMCPTransport as StdioMCPTransport } from 'ai/mcp-stdio';

export interface MCPServerConfig {
    type: 'stdio';
    command: string;
    args: string[];
    name?: string;
    timeout?: number;
}

export class MCPManager {
    private configs: MCPServerConfig[] = [];
    private tools: Record<string, any> = {};
    private clients: Map<string, any> = new Map();

    constructor(configs: MCPServerConfig[] = []) {
        this.configs = configs;
    }

    addServer(config: MCPServerConfig): void {
        this.configs.push(config);
    }

    private normalizeCommand(config: MCPServerConfig): { command: string; args: string[] } {
        if (process.platform === 'win32') {
            return {
                command: 'cmd',
                args: ['/c', config.command, ...config.args]
            };
        }
        return {
            command: config.command,
            args: config.args
        };
    }

    async initialize(): Promise<void> {
        if (this.configs.length === 0) {
            console.log('No MCP servers configured');
            return;
        }

        console.log(`Initializing ${this.configs.length} MCP server(s)...`);

        for (const config of this.configs) {
            try {
                console.log(`Connecting to MCP server: ${config.name || config.command}`);

                if (config.type === 'stdio') {
                    const { command, args } = this.normalizeCommand(config);

                    const clientPromise = createMCPClient({
                        transport: new StdioMCPTransport({
                            command,
                            args,
                        }),
                    });

                    const client = await clientPromise;
                    await (client as any).connect();

                    const { tools } = await (client as any).listTools();

                    for (const tool of tools) {
                        const toolName = `${config.name || 'mcp'}_${tool.name}`;
                        this.tools[toolName] = {
                            description: tool.description,
                            parameters: tool.inputSchema,
                            execute: async (args: any) => {
                                const result = await (client as any).callTool({
                                    name: tool.name,
                                    arguments: args,
                                });
                                return result.content;
                            },
                        };
                    }

                    this.clients.set(config.name || config.command, client);
                    console.log(`✓ Connected to ${config.name || config.command} (${tools.length} tools)`);
                }
            } catch (error) {
                console.error(`✗ Failed to connect to ${config.name || config.command}:`, error);
            }
        }
    }

    getTools(): Record<string, any> {
        return { ...this.tools };
    }

    async callTool(toolName: string, args: any): Promise<any> {
        const tool = this.tools[toolName];
        if (!tool) {
            throw new Error(`Tool not found: ${toolName}`);
        }
        return tool.execute(args);
    }

    async close(): Promise<void> {
        console.log('Closing MCP connections...');

        for (const [name, client] of this.clients.entries()) {
            try {
                await (client as any).close();
                console.log(`✓ Closed connection to ${name}`);
            } catch (error) {
                console.error(`✗ Error closing connection to ${name}:`, error);
            }
        }

        this.clients.clear();
        this.tools = {};
    }

    isInitialized(): boolean {
        return this.clients.size > 0;
    }

    getServerConfigs(): MCPServerConfig[] {
        return [...this.configs];
    }
}