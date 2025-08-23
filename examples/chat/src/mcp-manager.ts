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
        const toolPromises = this.configs.map(async (config) => {
            try {
                const { command, args } = this.normalizeCommand(config);
                const serverName = config.name || `${config.command}-${Date.now()}`;

                const mcpClient = await createMCPClient({
                    transport: new StdioMCPTransport({
                        command,
                        args,
                    }),
                });

                this.clients.set(serverName, mcpClient);
                const tools = await mcpClient.tools();

                Object.keys(tools).forEach(toolName => {
                    this.tools[`${serverName}:${toolName}`] = tools[toolName];
                });

                console.log(`✅ MCP Server '${serverName}' initialized with ${Object.keys(tools).length} tools`);
            } catch (error) {
                const serverName = config.name || config.command;
                console.error(`❌ Failed to initialize MCP server '${serverName}':`, error);
            }
        });

        await Promise.allSettled(toolPromises);
        console.log(`🔧 MCP Manager initialized with ${Object.keys(this.tools).length} total tools`);
    }

    getTools(): Record<string, any> {
        return { ...this.tools };
    }

    getClients(): Map<string, any> {
        return new Map(this.clients);
    }

    async close(): Promise<void> {
        const closePromises = Array.from(this.clients.values()).map(async (client) => {
            try {
                if (client.close) {
                    await client.close();
                }
            } catch (error) {
                console.error('Error closing MCP client:', error);
            }
        });

        await Promise.allSettled(closePromises);
        this.clients.clear();
        this.tools = {};
    }
}
