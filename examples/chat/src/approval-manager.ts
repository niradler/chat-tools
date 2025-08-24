import type { Storage } from "@chat-tools/storage";

export interface ApprovalRequest {
    toolName: string;
    params: Record<string, any>;
    context?: Record<string, any>;
    sessionId?: string;
}

export interface ApprovalResponse {
    approved: boolean;
    scope?: "once" | "session" | "global";
}

export interface ApprovalStrategy {
    requestApproval(request: ApprovalRequest): Promise<ApprovalResponse>;
}

export interface ApprovalManagerConfig {
    storage: Storage;
    strategy: ApprovalStrategy;
}

export class ApprovalManager {
    private storage: Storage;
    private strategy: ApprovalStrategy;

    constructor(config: ApprovalManagerConfig) {
        this.storage = config.storage;
        this.strategy = config.strategy;
    }

    async initialize(): Promise<void> {
        try {
            const globalTools = await this.storage.getAutoApprovedTools();
        } catch (error: any) {
            console.warn(
                "Failed to load auto-approved tools from storage:",
                error.message
            );
        }
    }

    async shouldApprove(
        toolName: string,
        params: Record<string, any>,
        sessionId?: string,
        context?: Record<string, any>
    ): Promise<boolean> {
        const isAutoApproved = await this.storage.isToolAutoApproved(
            toolName,
            sessionId
        );

        if (isAutoApproved) {
            return true;
        }

        const request: ApprovalRequest = { toolName, params, context, sessionId };
        const response = await this.strategy.requestApproval(request);

        if (response.approved && response.scope && response.scope !== "once") {
            await this.saveApprovalScope(toolName, response.scope, sessionId);
        }

        return response.approved;
    }

    private async saveApprovalScope(
        toolName: string,
        scope: "session" | "global",
        sessionId?: string
    ): Promise<void> {
        try {
            if (scope === "session" && sessionId) {
                await this.storage.addAutoApprovedTool(toolName, sessionId);
            } else if (scope === "global") {
                await this.storage.addAutoApprovedTool(toolName);
            }
        } catch (error: any) {
            console.warn(
                `Failed to save ${scope} auto-approved tool to storage:`,
                error.message
            );
        }
    }

    async getAutoApprovedTools(
        sessionId?: string,
        scope?: "global" | "session"
    ): Promise<any[]> {
        if (scope === "global") {
            return this.storage.getAutoApprovedTools();
        } else if (scope === "session" && sessionId) {
            return this.storage.getAutoApprovedTools(sessionId);
        } else {
            const global = await this.storage.getAutoApprovedTools();
            const session = sessionId
                ? await this.storage.getAutoApprovedTools(sessionId)
                : [];
            return [...global, ...session];
        }
    }

    async removeAutoApprovedTool(
        toolName: string,
        sessionId?: string,
        scope?: "global" | "session"
    ): Promise<void> {
        if (scope === "global") {
            await this.storage.removeAutoApprovedTool(toolName);
        } else if (scope === "session" && sessionId) {
            await this.storage.removeAutoApprovedTool(toolName, sessionId);
        } else {
            await this.storage.removeAutoApprovedTool(toolName);
            if (sessionId) {
                await this.storage.removeAutoApprovedTool(toolName, sessionId);
            }
        }
    }

    async cleanup(): Promise<void> { }
}
