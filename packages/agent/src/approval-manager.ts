import { select } from '@clack/prompts';
import type { DrizzleStorage } from '@chat-tools/storage';

export interface ApprovalManagerConfig {
  storage: DrizzleStorage;
}

export class ApprovalManager {
  private storage: DrizzleStorage;
  private whitelist: Set<string> = new Set();

  constructor(config: ApprovalManagerConfig) {
    this.storage = config.storage;
  }

  async initialize(): Promise<void> {
    try {
      const whitelistItems = await this.storage.getWhitelistRules();
      this.whitelist = new Set(whitelistItems.map(item => item.pattern));
      console.log(`Loaded ${this.whitelist.size} whitelisted operations`);
    } catch (error: any) {
      console.warn('Failed to load whitelist from storage:', error.message);
    }
  }

  async shouldApprove(toolName: string, params: any): Promise<boolean> {
    const whitelistKey = this.createWhitelistKey(toolName, params);

    if (this.whitelist.has(whitelistKey)) {
      console.log(`✓ Operation whitelisted: ${toolName}`);
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
          { label: 'Approve and whitelist', value: 'approve_whitelist' },
          { label: 'Deny', value: 'deny' }
        ]
      });

      switch (response) {
        case 'approve':
          return true;

        case 'approve_whitelist':
          await this.addToWhitelist(toolName, params);
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

  private createWhitelistKey(toolName: string, params: any): string {
    const paramsStr = JSON.stringify(params, Object.keys(params).sort());
    return `${toolName}:${paramsStr}`;
  }

  private async addToWhitelist(toolName: string, params: any): Promise<void> {
    const key = this.createWhitelistKey(toolName, params);
    this.whitelist.add(key);

    try {
      await this.storage.addWhitelistRule({
        pattern: key,
        type: 'exact',
        description: `Auto-whitelisted: ${toolName}`
      });
      console.log(`✓ Added to whitelist: ${toolName}`);
    } catch (error: any) {
      console.warn('Failed to save whitelist rule to storage:', error.message);
    }
  }

  async cleanup(): Promise<void> {
    console.log('Approval manager cleanup completed');
  }
}
