import { z } from 'zod';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const executeCommandTool = {
  description: 'Execute shell commands in the system. Use with caution for potentially dangerous operations.',
  parameters: z.object({
    command: z.string().describe('The shell command to execute'),
    workingDirectory: z.string().optional().describe('Working directory for the command'),
  }),
  execute: async ({ command, workingDirectory }: { command: string; workingDirectory?: string }) => {
    try {
      const options = workingDirectory ? { cwd: workingDirectory } : {};
      const { stdout, stderr } = await execAsync(command, {
        ...options,
        timeout: 30000, // 30 second timeout
        maxBuffer: 1024 * 1024, // 1MB buffer
      });

      return {
        success: true,
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        command,
        workingDirectory: workingDirectory || process.cwd(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        stdout: error.stdout?.toString() || '',
        stderr: error.stderr?.toString() || '',
        command,
        workingDirectory: workingDirectory || process.cwd(),
      };
    }
  },
};