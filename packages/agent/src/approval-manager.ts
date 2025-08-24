import { select } from '@clack/prompts';
import type { DrizzleStorage } from '@chat-tools/storage';

export interface ApprovalManagerConfig {
  storage: DrizzleStorage;
}

export class ApprovalManager {
  private storage: DrizzleStorage;
  private sessionId?: string;

  constructor(config: ApprovalManagerConfig & { sessionId?: string }) {
    this.storage = config.storage;
    this.sessionId = config.sessionId;
  }

  async initialize(): Promise<void> {
    try {
      const globalTools = await this.storage.getAutoApprovedTools(); // No sessionId = global
      let sessionTools: any[] = [];
      
      if (this.sessionId) {
        sessionTools = await this.storage.getAutoApprovedTools(this.sessionId);
      }
      
      console.log(`Loaded ${globalTools.length} global and ${sessionTools.length} session-specific auto-approved tools`);
    } catch (error: any) {
      console.warn('Failed to load auto-approved tools from storage:', error.message);
    }
  }

  async shouldApprove(toolName: string, params: any): Promise<boolean> {
    const isAutoApproved = await this.storage.isToolAutoApproved(toolName, this.sessionId);

    if (isAutoApproved) {
      console.log(`✓ Tool auto-approved: ${toolName}`);
      return true;
    }

    return this.promptUser(toolName, params);
  }

  private async promptUser(toolName: string, params: any): Promise<boolean> {
    console.log('\n📋 Tool Execution Request');
    console.log('═══════════════════════════');
    console.log(`Tool: ${toolName}`);
    console.log(`Parameters:`, JSON.stringify(params, null, 2));

    try {
      const response = await select({
        message: 'Do you want to approve this operation?',
        options: [
          { label: 'Approve once', value: 'approve' },
          { label: 'Approve for this session', value: 'approve_session' },
          { label: 'Approve globally (all sessions)', value: 'approve_global' },
          { label: 'Deny', value: 'deny' }
        ]
      });

      switch (response) {
        case 'approve':
          return true;

        case 'approve_session':
          if (this.sessionId) {
            await this.addToSessionAutoApproved(toolName);
          }
          return true;

        case 'approve_global':
          await this.addToGlobalAutoApproved(toolName);
          return true;

        case 'deny':
          return false;

        default:
          return false;
      }
    } catch (error) {
      console.log('\n⏰ Approval request cancelled');
      return false;
    }
  }

  private async addToSessionAutoApproved(toolName: string): Promise<void> {
    if (!this.sessionId) {
      console.warn('No session ID available for session-specific approval');
      return;
    }

    try {
      await this.storage.addAutoApprovedTool(toolName, this.sessionId);
      console.log(`✓ Added to session auto-approved tools: ${toolName}`);
    } catch (error: any) {
      console.warn('Failed to save session auto-approved tool to storage:', error.message);
    }
  }

  private async addToGlobalAutoApproved(toolName: string): Promise<void> {
    try {
      await this.storage.addAutoApprovedTool(toolName); // No sessionId = global
      console.log(`✓ Added to global auto-approved tools: ${toolName}`);
    } catch (error: any) {
      console.warn('Failed to save global auto-approved tool to storage:', error.message);
    }
  }

  async cleanup(): Promise<void> {
    console.log('Approval manager cleanup completed');
  }
}
