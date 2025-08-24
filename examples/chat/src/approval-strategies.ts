import { select } from '@clack/prompts';
import type { ApprovalStrategy, ApprovalRequest, ApprovalResponse } from './approval-manager';

export class CLIApprovalStrategy implements ApprovalStrategy {
  async requestApproval(request: ApprovalRequest): Promise<ApprovalResponse> {
    console.log('\n📋 Tool Execution Request');
    console.log('═══════════════════════════');
    console.log(`Tool: ${request.toolName}`);
    console.log(`Parameters:`, JSON.stringify(request.params, null, 2));

    if (request.context) {
      console.log(`Context:`, JSON.stringify(request.context, null, 2));
    }

    if (request.sessionId) {
      console.log(`Session: ${request.sessionId}`);
    }

    try {
      const response = await select({
        message: 'Do you want to approve this operation?',
        options: [
          { label: 'Approve once', value: 'once' },
          { label: 'Approve for this session', value: 'session' },
          { label: 'Approve globally (all sessions)', value: 'global' },
          { label: 'Deny', value: 'deny' }
        ]
      });

      if (response === 'deny') {
        return { approved: false };
      }

      return {
        approved: true,
        scope: response as 'once' | 'session' | 'global'
      };
    } catch (error) {
      console.log('\n⏰ Approval request cancelled');
      return { approved: false };
    }
  }
}


